from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from uuid import uuid4
from ...database import get_db
from ...models.employee import Employee
from ...models.travel_request import TravelRequest
from ...models.receipt import Receipt
from ...models.claim import Claim
from ...models.claim_line import ClaimLine
from ...schemas.claim import ClaimResponse, ClaimLineResponse, ClaimUpdate
from ...utils.security import get_current_user
from ...utils.constants import (
    LODGING_LIMITS, MEAL_LIMITS, NON_REIMBURSABLE_ITEMS,
    CLAIM_SUBMISSION_DEADLINE_DAYS, MEAL_BILL_THRESHOLD,
    BUSINESS_ENTERTAINMENT_HOD_THRESHOLD,
)

router = APIRouter(prefix="/claims", tags=["Claims"])


@router.post("/generate/{travel_request_id}", response_model=ClaimResponse)
async def generate_claim(
    travel_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Auto-generate a claim from receipts for a travel request."""
    # Get travel request
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == travel_request_id)
    )
    travel_request = tr_result.scalar_one_or_none()

    if not travel_request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    # Check submission deadline
    if travel_request.end_date:
        deadline = travel_request.end_date + timedelta(days=CLAIM_SUBMISSION_DEADLINE_DAYS)
        if datetime.now().date() > deadline:
            raise HTTPException(
                status_code=400,
                detail=f"Claim submission deadline passed (was {deadline})"
            )

    # Get receipts
    receipts_result = await db.execute(
        select(Receipt).where(
            Receipt.travel_request_id == travel_request_id,
            Receipt.is_duplicate == False,
        )
    )
    receipts = receipts_result.scalars().all()

    if not receipts:
        raise HTTPException(status_code=400, detail="No receipts found to generate claim")

    # Create claim
    claim = Claim(
        id=str(uuid4()),
        travel_request_id=travel_request_id,
        employee_id=current_user.emp_code,
        total_claimed=0,
        advance_adjusted=0,
        net_payable=0,
        status="draft",
    )
    db.add(claim)

    total_claimed = 0
    total_allowed = 0

    for receipt in receipts:
        # Validate and categorize receipt
        validation = validate_receipt(receipt, travel_request)

        line = ClaimLine(
            id=str(uuid4()),
            claim_id=claim.id,
            receipt_id=receipt.id,
            category=receipt.category or "other",
            claimed_amount=receipt.amount or 0,
            allowed_amount=validation["allowed_amount"],
            disallowed_amount=validation["disallowed_amount"],
            disallow_reason=validation.get("reason"),
            policy_rule_ref=validation.get("rule_ref"),
        )
        db.add(line)

        total_claimed += float(receipt.amount or 0)
        total_allowed += validation["allowed_amount"]

    # Update claim totals
    claim.total_claimed = total_claimed

    # Adjust for advance
    from ...models.advance import Advance
    advance_result = await db.execute(
        select(Advance).where(Advance.travel_request_id == travel_request_id)
    )
    advance = advance_result.scalar_one_or_none()
    advance_amount = float(advance.amount) if advance else 0

    claim.advance_adjusted = advance_amount
    claim.net_payable = total_claimed - advance_amount

    await db.flush()

    return ClaimResponse.model_validate(claim)


def calculate_nights(start_date, end_date) -> int:
    """Calculate number of nights between two dates."""
    if start_date and end_date:
        delta = end_date - start_date
        return max(delta.days, 1)
    return 1


def calculate_travel_days(start_date, end_date) -> int:
    """Calculate number of travel days (policy: travel days count as full days)."""
    if start_date and end_date:
        delta = end_date - start_date
        return max(delta.days + 1, 1)  # Inclusive of both start and end
    return 1


def validate_receipt(receipt: Receipt, travel_request: TravelRequest) -> dict:
    """Validate a receipt against policy rules."""
    amount = float(receipt.amount or 0)
    category = receipt.category or "other"
    city_tier = travel_request.city_tier

    # Check for non-reimbursable items in hotel invoices
    if receipt.extracted_data and "line_items" in receipt.extracted_data:
        line_items = receipt.extracted_data["line_items"]
        non_reimbursable_total = 0
        reasons = []

        for item_name, item_amount in line_items.items():
            item_lower = item_name.lower()
            for nr_item in NON_REIMBURSABLE_ITEMS:
                if nr_item in item_lower:
                    non_reimbursable_total += item_amount
                    reasons.append(f"{item_name}: ₹{item_amount}")

        if non_reimbursable_total > 0:
            return {
                "allowed_amount": amount - non_reimbursable_total,
                "disallowed_amount": non_reimbursable_total,
                "reason": f"Non-reimbursable items: {', '.join(reasons)}",
                "rule_ref": "4",
            }

    # Check lodging limits — per night (policy section 3.1)
    if category == "lodging":
        limit_per_night = LODGING_LIMITS.get(city_tier, LODGING_LIMITS["Tier 3"])
        nights = calculate_nights(travel_request.start_date, travel_request.end_date)
        total_limit = limit_per_night * nights
        if amount > total_limit:
            return {
                "allowed_amount": total_limit,
                "disallowed_amount": amount - total_limit,
                "reason": f"Exceeds {city_tier} lodging limit of ₹{limit_per_night}/night × {nights} nights = ₹{total_limit}",
                "rule_ref": "3.1",
            }

    # Check meal limits — per day (policy section 3.3)
    if category == "meals":
        limit_per_day = MEAL_LIMITS.get(city_tier, MEAL_LIMITS["Tier 3"])
        travel_days = calculate_travel_days(travel_request.start_date, travel_request.end_date)
        total_limit = limit_per_day * travel_days
        if amount > total_limit:
            return {
                "allowed_amount": total_limit,
                "disallowed_amount": amount - total_limit,
                "reason": f"Exceeds {city_tier} meal limit of ₹{limit_per_day}/day × {travel_days} days = ₹{total_limit}",
                "rule_ref": "3.3",
            }
        # Enforce bill threshold: claims above ₹500 need a bill (policy section 5.2)
        if amount > MEAL_BILL_THRESHOLD and not receipt.attachment_path and not receipt.source_email_id:
            # No supporting document attached — flag but don't disallow (reminder)
            return {
                "allowed_amount": amount,
                "disallowed_amount": 0,
                "reason": f"Meal claim above ₹{MEAL_BILL_THRESHOLD} — supporting bill required (policy 5.2)",
                "rule_ref": "5.2",
            }

    # Check business entertainment — must have attendee names (policy section 3.5)
    if category == "business_entertainment":
        if not receipt.attendee_names or receipt.attendee_names.strip() == "":
            return {
                "allowed_amount": 0,
                "disallowed_amount": amount,
                "reason": "Business entertainment requires attendee names and organization (policy 3.5)",
                "rule_ref": "3.5",
            }
        # HOD approval required if above ₹2,000 — flagged for review
        if amount > BUSINESS_ENTERTAINMENT_HOD_THRESHOLD:
            return {
                "allowed_amount": amount,
                "disallowed_amount": 0,
                "reason": f"Business entertainment above ₹{BUSINESS_ENTERTAINMENT_HOD_THRESHOLD} — HOD prior approval required (policy 3.5)",
                "rule_ref": "3.5",
            }

    # Default: full amount allowed
    return {
        "allowed_amount": amount,
        "disallowed_amount": 0,
        "reason": None,
        "rule_ref": None,
    }


@router.get("/{claim_id}", response_model=ClaimResponse)
async def get_claim(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get claim details with line items."""
    result = await db.execute(
        select(Claim).where(Claim.id == claim_id)
    )
    claim = result.scalar_one_or_none()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Get line items with receipt details
    lines_result = await db.execute(
        select(ClaimLine).where(ClaimLine.claim_id == claim_id)
    )
    lines = lines_result.scalars().all()

    line_responses = []
    for line in lines:
        receipt_result = await db.execute(
            select(Receipt).where(Receipt.id == line.receipt_id)
        )
        receipt = receipt_result.scalar_one_or_none()

        from ...schemas.receipt import ReceiptResponse
        line_responses.append(ClaimLineResponse(
            id=line.id,
            claim_id=line.claim_id,
            receipt_id=line.receipt_id,
            category=line.category,
            claimed_amount=line.claimed_amount,
            allowed_amount=line.allowed_amount,
            disallowed_amount=line.disallowed_amount,
            disallow_reason=line.disallow_reason,
            policy_rule_ref=line.policy_rule_ref,
            created_at=line.created_at,
            receipt=ReceiptResponse.model_validate(receipt) if receipt else None,
        ))

    # Get employee
    emp_result = await db.execute(
        select(Employee).where(Employee.emp_code == claim.employee_id)
    )
    employee = emp_result.scalar_one_or_none()

    # Get travel request ID
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == claim.travel_request_id)
    )
    tr = tr_result.scalar_one_or_none()

    return ClaimResponse(
        id=claim.id,
        travel_request_id=claim.travel_request_id,
        employee_id=claim.employee_id,
        total_claimed=claim.total_claimed,
        advance_adjusted=claim.advance_adjusted,
        net_payable=claim.net_payable,
        status=claim.status,
        submitted_at=claim.submitted_at,
        finance_verified_at=claim.finance_verified_at,
        payment_run_date=claim.payment_run_date,
        created_at=claim.created_at,
        updated_at=claim.updated_at,
        lines=line_responses,
        employee_name=employee.name if employee else None,
        travel_request_id_ref=tr.travel_request_id if tr else None,
    )


@router.post("/{claim_id}/submit")
async def submit_claim(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Submit a claim for approval."""
    result = await db.execute(
        select(Claim).where(Claim.id == claim_id)
    )
    claim = result.scalar_one_or_none()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if claim.employee_id != current_user.emp_code:
        raise HTTPException(status_code=403, detail="Not your claim")

    if claim.status != "draft":
        raise HTTPException(status_code=400, detail="Claim already submitted")

    # Check if all lines have receipts
    lines_result = await db.execute(
        select(ClaimLine).where(ClaimLine.claim_id == claim_id)
    )
    lines = lines_result.scalars().all()

    for line in lines:
        if not line.receipt_id:
            raise HTTPException(
                status_code=400,
                detail=f"Line {line.id} missing receipt"
            )

    claim.status = "submitted"
    claim.submitted_at = datetime.utcnow()
    await db.flush()

    return {"message": "Claim submitted for approval"}


@router.post("/{claim_id}/finance-verify")
async def finance_verify_claim(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Finance verifies a claim."""
    if current_user.role not in ["Finance", "Admin"]:
        raise HTTPException(status_code=403, detail="Finance or Admin role required")

    result = await db.execute(
        select(Claim).where(Claim.id == claim_id)
    )
    claim = result.scalar_one_or_none()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if claim.status != "submitted":
        raise HTTPException(status_code=400, detail="Claim not in submitted status")

    claim.status = "finance_verified"
    claim.finance_verified_at = datetime.utcnow()

    # Schedule payment (10th or 25th of month)
    today = datetime.now().date()
    if today.day <= 10:
        payment_date = today.replace(day=10)
    elif today.day <= 25:
        payment_date = today.replace(day=25)
    else:
        # Next month 10th
        if today.month == 12:
            payment_date = today.replace(year=today.year + 1, month=1, day=10)
        else:
            payment_date = today.replace(month=today.month + 1, day=10)

    claim.payment_run_date = payment_date
    await db.flush()

    return {"message": "Claim verified by Finance", "payment_date": str(payment_date)}
