from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from ...database import get_db
from ...models.employee import Employee
from ...models.travel_request import TravelRequest
from ...models.approval import Approval
from ...models.claim import Claim
from ...models.receipt import Receipt
from ...models.advance import Advance
from ...models.payment import Payment
from ...schemas.employee import EmployeeResponse
from ...utils.security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: Employee):
    """Check if current user has admin privileges."""
    if current_user.role not in ["Admin", "MD"]:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get overall system statistics."""
    require_admin(current_user)

    # Total employees
    emp_result = await db.execute(select(func.count()).select_from(Employee))
    total_employees = emp_result.scalar()

    # Total travel requests
    tr_result = await db.execute(select(func.count()).select_from(TravelRequest))
    total_travel_requests = tr_result.scalar()

    # Travel requests by status
    status_result = await db.execute(
        select(TravelRequest.status, func.count()).group_by(TravelRequest.status)
    )
    requests_by_status = {row[0]: row[1] for row in status_result.all()}

    # Total claims
    claim_result = await db.execute(select(func.count()).select_from(Claim))
    total_claims = claim_result.scalar()

    # Total amounts
    amount_result = await db.execute(
        select(func.sum(TravelRequest.estimated_amount))
    )
    total_estimated = float(amount_result.scalar() or 0)

    claimed_result = await db.execute(
        select(func.sum(Claim.total_claimed))
    )
    total_claimed = float(claimed_result.scalar() or 0)

    paid_result = await db.execute(
        select(func.sum(Claim.net_payable)).where(Claim.status == "paid")
    )
    total_paid = float(paid_result.scalar() or 0)

    # Pending items
    pending_approvals_result = await db.execute(
        select(func.count()).select_from(Approval).where(Approval.status == "pending")
    )
    pending_approvals = pending_approvals_result.scalar()

    pending_claims_result = await db.execute(
        select(func.count()).select_from(Claim).where(Claim.status == "submitted")
    )
    pending_claims = pending_claims_result.scalar()

    return {
        "total_employees": total_employees,
        "total_travel_requests": total_travel_requests,
        "requests_by_status": requests_by_status,
        "total_claims": total_claims,
        "total_estimated": total_estimated,
        "total_claimed": total_claimed,
        "total_paid": total_paid,
        "pending_approvals": pending_approvals,
        "pending_claims": pending_claims,
    }


@router.get("/employees", response_model=list[EmployeeResponse])
async def list_all_employees(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List all employees (admin only)."""
    require_admin(current_user)

    result = await db.execute(select(Employee).order_by(Employee.emp_code))
    employees = result.scalars().all()
    return [EmployeeResponse.model_validate(emp) for emp in employees]


@router.get("/travel-requests")
async def list_all_travel_requests(
    status: str = None,
    employee_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List all travel requests across the org (admin only)."""
    require_admin(current_user)

    query = select(TravelRequest)

    if status:
        query = query.where(TravelRequest.status == status)
    if employee_id:
        query = query.where(TravelRequest.employee_id == employee_id)

    query = query.order_by(TravelRequest.created_at.desc())
    result = await db.execute(query)
    travel_requests = result.scalars().all()

    response = []
    for tr in travel_requests:
        emp_result = await db.execute(select(Employee).where(Employee.emp_code == tr.employee_id))
        emp = emp_result.scalar_one_or_none()

        # Count receipts
        receipt_count_result = await db.execute(
            select(func.count()).where(Receipt.travel_request_id == tr.id)
        )
        receipt_count = receipt_count_result.scalar()

        response.append({
            "id": tr.id,
            "travel_request_id": tr.travel_request_id,
            "employee_id": tr.employee_id,
            "employee_name": emp.name if emp else None,
            "employee_department": emp.department if emp else None,
            "purpose": tr.purpose,
            "destination": tr.destination,
            "city_tier": tr.city_tier,
            "start_date": str(tr.start_date),
            "end_date": str(tr.end_date),
            "estimated_amount": float(tr.estimated_amount),
            "advance_requested": float(tr.advance_requested),
            "status": tr.status,
            "receipt_count": receipt_count,
            "created_at": str(tr.created_at),
        })

    return response


@router.get("/claims")
async def list_all_claims(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List all claims across the org (admin only)."""
    require_admin(current_user)

    query = select(Claim)
    if status:
        query = query.where(Claim.status == status)
    query = query.order_by(Claim.created_at.desc())

    result = await db.execute(query)
    claims = result.scalars().all()

    response = []
    for claim in claims:
        emp_result = await db.execute(select(Employee).where(Employee.emp_code == claim.employee_id))
        employee = emp_result.scalar_one_or_none()

        tr_result = await db.execute(select(TravelRequest).where(TravelRequest.id == claim.travel_request_id))
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
            "finance_verified_at": str(claim.finance_verified_at) if claim.finance_verified_at else None,
            "payment_run_date": str(claim.payment_run_date) if claim.payment_run_date else None,
            "created_at": str(claim.created_at),
        })

    return response


@router.get("/approvals")
async def list_all_approvals(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List all approvals across the org (admin only)."""
    require_admin(current_user)

    query = select(Approval)
    if status:
        query = query.where(Approval.status == status)
    query = query.order_by(Approval.created_at.desc())

    result = await db.execute(query)
    approvals = result.scalars().all()

    response = []
    for approval in approvals:
        approver_result = await db.execute(select(Employee).where(Employee.emp_code == approval.approver_id))
        approver = approver_result.scalar_one_or_none()

        tr_result = await db.execute(select(TravelRequest).where(TravelRequest.id == approval.travel_request_id))
        tr = tr_result.scalar_one_or_none()

        # Get employee who made the request
        tr_employee = None
        if tr:
            tr_emp_result = await db.execute(select(Employee).where(Employee.emp_code == tr.employee_id))
            tr_employee = tr_emp_result.scalar_one_or_none()

        response.append({
            "id": approval.id,
            "travel_request_id": tr.travel_request_id if tr else None,
            "request_employee_name": tr_employee.name if tr_employee else None,
            "approver_id": approval.approver_id,
            "approver_name": approver.name if approver else None,
            "level": approval.level,
            "status": approval.status,
            "remarks": approval.remarks,
            "decided_at": str(approval.decided_at) if approval.decided_at else None,
            "created_at": str(approval.created_at),
        })

    return response
