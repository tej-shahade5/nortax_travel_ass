from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...database import get_db
from ...models.employee import Employee
from ...models.claim import Claim
from ...models.payment import Payment
from ...utils.security import get_current_user
from uuid import uuid4

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.get("/queue")
async def get_finance_queue(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get claims awaiting Finance verification."""
    if current_user.role not in ["Finance", "Admin"]:
        raise HTTPException(status_code=403, detail="Finance or Admin role required")

    result = await db.execute(
        select(Claim).where(Claim.status == "submitted")
        .order_by(Claim.submitted_at)
    )
    claims = result.scalars().all()

    response = []
    for claim in claims:
        # Get employee name
        emp_result = await db.execute(
            select(Employee).where(Employee.emp_code == claim.employee_id)
        )
        employee = emp_result.scalar_one_or_none()

        # Get travel request ID
        from ...models.travel_request import TravelRequest
        tr_result = await db.execute(
            select(TravelRequest).where(TravelRequest.id == claim.travel_request_id)
        )
        tr = tr_result.scalar_one_or_none()

        response.append({
            "id": claim.id,
            "employee_id": claim.employee_id,
            "employee_name": employee.name if employee else None,
            "travel_request_id": tr.travel_request_id if tr else None,
            "total_claimed": float(claim.total_claimed),
            "advance_adjusted": float(claim.advance_adjusted),
            "net_payable": float(claim.net_payable),
            "status": claim.status,
            "submitted_at": str(claim.submitted_at) if claim.submitted_at else None,
        })

    return response


@router.get("/payment-runs")
async def get_payment_runs(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get upcoming payment runs."""
    if current_user.role not in ["Finance", "Admin"]:
        raise HTTPException(status_code=403, detail="Finance or Admin role required")

    # Get claims with scheduled payments
    result = await db.execute(
        select(Claim).where(
            Claim.status == "finance_verified",
            Claim.payment_run_date.isnot(None),
        ).order_by(Claim.payment_run_date)
    )
    claims = result.scalars().all()

    response = []
    for claim in claims:
        emp_result = await db.execute(
            select(Employee).where(Employee.emp_code == claim.employee_id)
        )
        employee = emp_result.scalar_one_or_none()

        from ...models.travel_request import TravelRequest
        tr_result = await db.execute(
            select(TravelRequest).where(TravelRequest.id == claim.travel_request_id)
        )
        tr = tr_result.scalar_one_or_none()

        response.append({
            "id": claim.id,
            "employee_id": claim.employee_id,
            "employee_name": employee.name if employee else None,
            "travel_request_id": tr.travel_request_id if tr else None,
            "net_payable": float(claim.net_payable),
            "payment_run_date": str(claim.payment_run_date),
            "status": claim.status,
        })

    return response


@router.post("/process-payment/{claim_id}")
async def process_payment(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Process payment for a verified claim."""
    if current_user.role not in ["Finance", "Admin"]:
        raise HTTPException(status_code=403, detail="Finance or Admin role required")

    result = await db.execute(
        select(Claim).where(Claim.id == claim_id)
    )
    claim = result.scalar_one_or_none()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if claim.status != "finance_verified":
        raise HTTPException(status_code=400, detail="Claim not verified")

    # Create payment record
    payment = Payment(
        id=str(uuid4()),
        claim_id=claim_id,
        amount=claim.net_payable,
        payment_run_date=claim.payment_run_date,
        status="processed",
    )
    db.add(payment)

    # Update claim status
    claim.status = "paid"
    await db.flush()

    return {"message": "Payment processed successfully"}
