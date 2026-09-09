from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import uuid4
from datetime import datetime
from ...database import get_db
from ...models.employee import Employee
from ...models.travel_request import TravelRequest
from ...models.approval import Approval
from ...schemas.travel_request import (
    TravelRequestCreate,
    TravelRequestUpdate,
    TravelRequestResponse,
    TravelRequestDetail,
)
from ...schemas.approval import ApprovalResponse
from ...utils.security import get_current_user
from ...utils.constants import get_required_approval_levels, get_city_tier

router = APIRouter(prefix="/travel-requests", tags=["Travel Requests"])


@router.post("", response_model=TravelRequestResponse)
async def create_travel_request(
    data: TravelRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create a new travel request."""
    # Generate travel request ID: TR-YYYY-XXX
    year = datetime.now().year
    count_result = await db.execute(
        select(func.count()).where(
            TravelRequest.employee_id == current_user.emp_code,
            TravelRequest.travel_request_id.like(f"TR-{year}-%"),
        )
    )
    count = count_result.scalar()
    travel_request_id = f"TR-{year}-{str(count + 1).zfill(3)}"

    # Determine city tier if not provided
    city_tier = data.city_tier or get_city_tier(data.destination)

    travel_request = TravelRequest(
        id=str(uuid4()),
        travel_request_id=travel_request_id,
        employee_id=current_user.emp_code,
        purpose=data.purpose,
        destination=data.destination,
        city_tier=city_tier,
        start_date=data.start_date,
        end_date=data.end_date,
        estimated_amount=data.estimated_amount,
        advance_requested=data.advance_requested,
        status="draft",
    )

    db.add(travel_request)
    await db.flush()

    return TravelRequestResponse(
        id=travel_request.id,
        travel_request_id=travel_request.travel_request_id,
        employee_id=travel_request.employee_id,
        purpose=travel_request.purpose,
        destination=travel_request.destination,
        city_tier=travel_request.city_tier,
        start_date=travel_request.start_date,
        end_date=travel_request.end_date,
        estimated_amount=travel_request.estimated_amount,
        advance_requested=travel_request.advance_requested,
        status=travel_request.status,
        created_at=travel_request.created_at,
        updated_at=travel_request.updated_at,
        employee_name=current_user.name,
        employee_city=current_user.city,
    )


@router.get("", response_model=list[TravelRequestResponse])
async def list_travel_requests(
    status_filter: str = None,
    employee_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List travel requests (filtered by status and employee)."""
    query = select(TravelRequest)

    # If not manager/finance, only show own requests
    if current_user.role in ["Employee"]:
        query = query.where(TravelRequest.employee_id == current_user.emp_code)
    elif employee_id:
        query = query.where(TravelRequest.employee_id == employee_id)

    if status_filter:
        query = query.where(TravelRequest.status == status_filter)

    query = query.order_by(TravelRequest.created_at.desc())

    result = await db.execute(query)
    travel_requests = result.scalars().all()

    # Get employee names
    response = []
    for tr in travel_requests:
        emp_result = await db.execute(select(Employee).where(Employee.emp_code == tr.employee_id))
        emp = emp_result.scalar_one_or_none()
        response.append(TravelRequestResponse(
            id=tr.id,
            travel_request_id=tr.travel_request_id,
            employee_id=tr.employee_id,
            purpose=tr.purpose,
            destination=tr.destination,
            city_tier=tr.city_tier,
            start_date=tr.start_date,
            end_date=tr.end_date,
            estimated_amount=tr.estimated_amount,
            advance_requested=tr.advance_requested,
            status=tr.status,
            created_at=tr.created_at,
            updated_at=tr.updated_at,
            employee_name=emp.name if emp else None,
            employee_city=emp.city if emp else None,
        ))

    return response


@router.get("/{travel_request_id}", response_model=TravelRequestDetail)
async def get_travel_request(
    travel_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get detailed travel request information."""
    result = await db.execute(
        select(TravelRequest).where(
            (TravelRequest.id == travel_request_id) |
            (TravelRequest.travel_request_id == travel_request_id)
        )
    )
    travel_request = result.scalar_one_or_none()

    if not travel_request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    # Get employee
    emp_result = await db.execute(select(Employee).where(Employee.emp_code == travel_request.employee_id))
    employee = emp_result.scalar_one_or_none()

    # Get approvals
    approvals_result = await db.execute(
        select(Approval).where(Approval.travel_request_id == travel_request.id)
        .order_by(Approval.level)
    )
    approvals = approvals_result.scalars().all()

    # Get approval details with approver names
    approval_responses = []
    for approval in approvals:
        approver_result = await db.execute(select(Employee).where(Employee.emp_code == approval.approver_id))
        approver = approver_result.scalar_one_or_none()
        approval_responses.append(ApprovalResponse(
            id=approval.id,
            travel_request_id=approval.travel_request_id,
            approver_id=approval.approver_id,
            level=approval.level,
            status=approval.status,
            remarks=approval.remarks,
            decided_at=approval.decided_at,
            created_at=approval.created_at,
            approver_name=approver.name if approver else None,
        ))

    # Get advance
    from ...models.advance import Advance
    advance_result = await db.execute(
        select(Advance).where(Advance.travel_request_id == travel_request.id)
    )
    advance = advance_result.scalar_one_or_none()

    # Get receipt count
    from ...models.receipt import Receipt
    receipt_count_result = await db.execute(
        select(func.count()).where(Receipt.travel_request_id == travel_request.id)
    )
    receipt_count = receipt_count_result.scalar()

    # Get claim
    from ...models.claim import Claim
    claim_result = await db.execute(
        select(Claim).where(Claim.travel_request_id == travel_request.id)
    )
    claim = claim_result.scalar_one_or_none()

    from ...schemas.advance import AdvanceResponse
    from ...schemas.claim import ClaimResponse

    advance_response = AdvanceResponse.model_validate(advance) if advance else None
    claim_response = ClaimResponse.model_validate(claim) if claim else None

    return TravelRequestDetail(
        id=travel_request.id,
        travel_request_id=travel_request.travel_request_id,
        employee_id=travel_request.employee_id,
        purpose=travel_request.purpose,
        destination=travel_request.destination,
        city_tier=travel_request.city_tier,
        start_date=travel_request.start_date,
        end_date=travel_request.end_date,
        estimated_amount=travel_request.estimated_amount,
        advance_requested=travel_request.advance_requested,
        status=travel_request.status,
        created_at=travel_request.created_at,
        updated_at=travel_request.updated_at,
        employee_name=employee.name if employee else None,
        employee_city=employee.city if employee else None,
        approvals=approval_responses,
        advance=advance_response,
        receipt_count=receipt_count,
        claim=claim_response,
    )


@router.put("/{travel_request_id}", response_model=TravelRequestResponse)
async def update_travel_request(
    travel_request_id: str,
    data: TravelRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update a travel request (only in draft status)."""
    result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == travel_request_id)
    )
    travel_request = result.scalar_one_or_none()

    if not travel_request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    if travel_request.employee_id != current_user.emp_code:
        raise HTTPException(status_code=403, detail="Not your travel request")

    if travel_request.status != "draft":
        raise HTTPException(status_code=400, detail="Can only update draft requests")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(travel_request, field, value)

    # Re-determine city tier if destination changed
    if "destination" in update_data:
        travel_request.city_tier = get_city_tier(travel_request.destination)

    await db.flush()

    return TravelRequestResponse.model_validate(travel_request)


@router.post("/{travel_request_id}/submit")
async def submit_travel_request(
    travel_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Submit a travel request for approval."""
    result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == travel_request_id)
    )
    travel_request = result.scalar_one_or_none()

    if not travel_request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    if travel_request.employee_id != current_user.emp_code:
        raise HTTPException(status_code=403, detail="Not your travel request")

    if travel_request.status != "draft":
        raise HTTPException(status_code=400, detail="Request already submitted")

    # Create approval chain based on estimated amount
    required_levels = get_required_approval_levels(float(travel_request.estimated_amount))

    # Check for business entertainment receipts > ₹2,000 — HOD approval required (policy 3.5)
    from ...models.receipt import Receipt
    from ...utils.constants import BUSINESS_ENTERTAINMENT_HOD_THRESHOLD
    be_result = await db.execute(
        select(Receipt).where(
            Receipt.travel_request_id == travel_request.id,
            Receipt.category == "business_entertainment",
            Receipt.is_duplicate == False,
        )
    )
    be_receipts = be_result.scalars().all()
    has_high_entertainment = any(float(r.amount or 0) > BUSINESS_ENTERTAINMENT_HOD_THRESHOLD for r in be_receipts)

    # Ensure level 2 (HOD) is in approval chain if business entertainment > ₹2,000
    if has_high_entertainment and 2 not in required_levels:
        required_levels = sorted(set(required_levels + [2]))

    # Find approvers in the chain
    for level in required_levels:
        approver = await find_approver_for_level(
            db, current_user, level, travel_request.employee_id
        )
        if approver:
            approval = Approval(
                id=str(uuid4()),
                travel_request_id=travel_request.id,
                approver_id=approver.emp_code,
                level=level,
                status="pending",
            )
            db.add(approval)

    # Update status
    travel_request.status = "submitted"
    await db.flush()

    return {"message": "Travel request submitted for approval"}


async def find_approver_for_level(
    db: AsyncSession, employee: Employee, level: int, claimant_id: str
) -> Employee | None:
    """Find the approver for a given level, skipping if it's the claimant."""
    if level == 1:
        # Reporting Manager
        result = await db.execute(
            select(Employee).where(Employee.emp_code == employee.reporting_manager_code)
        )
        approver = result.scalar_one_or_none()
        # Skip if approver is the claimant
        if approver and approver.emp_code == claimant_id:
            return await find_approver_for_level(db, employee, 2, claimant_id)
        return approver

    elif level == 2:
        # Head of Department
        result = await db.execute(
            select(Employee).where(
                Employee.department == employee.department,
                Employee.role == "Head of Department"
            )
        )
        approver = result.scalar_one_or_none()
        if approver and approver.emp_code == claimant_id:
            return await find_approver_for_level(db, employee, 3, claimant_id)
        return approver

    elif level == 3:
        # Head of Division
        result = await db.execute(
            select(Employee).where(Employee.role == "Head of Division")
        )
        approver = result.scalar_one_or_none()
        if approver and approver.emp_code == claimant_id:
            return await find_approver_for_level(db, employee, 4, claimant_id)
        return approver

    elif level == 4:
        # MD/CEO
        result = await db.execute(
            select(Employee).where(Employee.role == "MD")
        )
        return result.scalar_one_or_none()

    return None
