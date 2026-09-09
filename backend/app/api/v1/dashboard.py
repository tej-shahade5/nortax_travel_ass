from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ...database import get_db
from ...models.employee import Employee
from ...models.travel_request import TravelRequest
from ...models.claim import Claim
from ...models.approval import Approval
from ...models.advance import Advance
from ...utils.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/employee")
async def get_employee_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get employee dashboard with their requests, claims, and advances."""
    # My travel requests
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.employee_id == current_user.emp_code)
        .order_by(TravelRequest.created_at.desc())
    )
    travel_requests = tr_result.scalars().all()

    # My claims
    claims_result = await db.execute(
        select(Claim).where(Claim.employee_id == current_user.emp_code)
        .order_by(Claim.created_at.desc())
    )
    claims = claims_result.scalars().all()

    # My advances
    advance_result = await db.execute(
        select(Advance).join(TravelRequest).where(
            TravelRequest.employee_id == current_user.emp_code
        )
    )
    advances = advance_result.scalars().all()

    return {
        "employee": {
            "emp_code": current_user.emp_code,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
        },
        "travel_requests": [
            {
                "id": tr.id,
                "travel_request_id": tr.travel_request_id,
                "destination": tr.destination,
                "start_date": str(tr.start_date),
                "end_date": str(tr.end_date),
                "estimated_amount": float(tr.estimated_amount),
                "status": tr.status,
            }
            for tr in travel_requests
        ],
        "claims": [
            {
                "id": c.id,
                "travel_request_id": c.travel_request_id,
                "total_claimed": float(c.total_claimed),
                "net_payable": float(c.net_payable),
                "status": c.status,
                "submitted_at": str(c.submitted_at) if c.submitted_at else None,
            }
            for c in claims
        ],
        "advances": [
            {
                "id": a.id,
                "reference": a.reference,
                "amount": float(a.amount),
                "status": a.status,
            }
            for a in advances
        ],
        "stats": {
            "total_requests": len(travel_requests),
            "pending_approvals": sum(1 for tr in travel_requests if tr.status in ["submitted", "approved"]),
            "total_claimed": sum(float(c.total_claimed) for c in claims),
            "total_advance": sum(float(a.amount) for a in advances),
        }
    }


@router.get("/manager")
async def get_manager_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get manager dashboard with team approvals and advances."""
    if current_user.role not in ["Reporting Manager", "Head of Department", "Head of Division", "MD"]:
        raise HTTPException(status_code=403, detail="Manager role required")

    # My pending approvals
    pending_result = await db.execute(
        select(Approval).where(
            Approval.approver_id == current_user.emp_code,
            Approval.status == "pending",
        )
    )
    pending_approvals = pending_result.scalars().all()

    # Team travel requests (for managers)
    team_result = await db.execute(
        select(TravelRequest).join(Employee).where(
            Employee.reporting_manager_code == current_user.emp_code
        ).order_by(TravelRequest.created_at.desc())
    )
    team_requests = team_result.scalars().all()

    return {
        "pending_approvals": [
            {
                "id": a.id,
                "travel_request_id": a.travel_request_id,
                "level": a.level,
                "created_at": str(a.created_at),
            }
            for a in pending_approvals
        ],
        "team_requests": [
            {
                "id": tr.id,
                "travel_request_id": tr.travel_request_id,
                "employee_id": tr.employee_id,
                "destination": tr.destination,
                "estimated_amount": float(tr.estimated_amount),
                "status": tr.status,
            }
            for tr in team_requests
        ],
        "stats": {
            "pending_count": len(pending_approvals),
            "team_request_count": len(team_requests),
        }
    }


@router.get("/finance")
async def get_finance_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get finance dashboard with verification queue and payment runs."""
    if current_user.role != "Finance":
        raise HTTPException(status_code=403, detail="Finance role required")

    # Claims awaiting verification
    pending_result = await db.execute(
        select(Claim).where(Claim.status == "submitted")
    )
    pending_claims = pending_result.scalars().all()

    # Claims ready for payment
    payment_result = await db.execute(
        select(Claim).where(Claim.status == "finance_verified")
    )
    payment_claims = payment_result.scalars().all()

    # Total amounts
    total_pending = sum(float(c.total_claimed) for c in pending_claims)
    total_payment = sum(float(c.net_payable) for c in payment_claims)

    return {
        "pending_verification": [
            {
                "id": c.id,
                "employee_id": c.employee_id,
                "total_claimed": float(c.total_claimed),
                "submitted_at": str(c.submitted_at) if c.submitted_at else None,
            }
            for c in pending_claims
        ],
        "ready_for_payment": [
            {
                "id": c.id,
                "employee_id": c.employee_id,
                "net_payable": float(c.net_payable),
                "payment_run_date": str(c.payment_run_date) if c.payment_run_date else None,
            }
            for c in payment_claims
        ],
        "stats": {
            "pending_count": len(pending_claims),
            "pending_amount": total_pending,
            "payment_count": len(payment_claims),
            "payment_amount": total_payment,
        }
    }
