from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ...database import get_db
from ...models.employee import Employee
from ...models.travel_request import TravelRequest
from ...models.approval import Approval
from ...schemas.approval import ApprovalAction, ApprovalResponse
from ...utils.security import get_current_user

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("/queue", response_model=list[ApprovalResponse])
async def get_approval_queue(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get pending approvals for the current user."""
    result = await db.execute(
        select(Approval).where(
            Approval.approver_id == current_user.emp_code,
            Approval.status == "pending",
        ).order_by(Approval.created_at.desc())
    )
    approvals = result.scalars().all()

    response = []
    for approval in approvals:
        response.append(ApprovalResponse(
            id=approval.id,
            travel_request_id=approval.travel_request_id,
            approver_id=approval.approver_id,
            level=approval.level,
            status=approval.status,
            remarks=approval.remarks,
            decided_at=approval.decided_at,
            created_at=approval.created_at,
            approver_name=current_user.name,
        ))

    return response


@router.post("/{approval_id}/approve")
async def approve_request(
    approval_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Approve a travel request."""
    result = await db.execute(
        select(Approval).where(Approval.id == approval_id)
    )
    approval = result.scalar_one_or_none()

    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.approver_id != current_user.emp_code and current_user.role not in ["Admin", "MD"]:
        raise HTTPException(status_code=403, detail="Not your approval")

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="Approval already processed")

    # Update approval
    approval.status = "approved"
    approval.decided_at = datetime.utcnow()
    approval.approver_id = current_user.emp_code  # Record who actually approved

    # Check if all approvals for this travel request are done
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == approval.travel_request_id)
    )
    travel_request = tr_result.scalar_one_or_none()

    if travel_request:
        # Check if there are more pending approvals
        pending_result = await db.execute(
            select(Approval).where(
                Approval.travel_request_id == travel_request.id,
                Approval.status == "pending",
            )
        )
        pending_approvals = pending_result.scalars().all()

        if not pending_approvals:
            # All approvals done - update travel request status
            travel_request.status = "approved"

    await db.flush()

    return {"message": "Request approved successfully"}


@router.post("/{approval_id}/return")
async def return_request(
    approval_id: str,
    data: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Return a travel request with remarks."""
    if not data.remarks:
        raise HTTPException(status_code=400, detail="Remarks are required for returning")

    result = await db.execute(
        select(Approval).where(Approval.id == approval_id)
    )
    approval = result.scalar_one_or_none()

    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.approver_id != current_user.emp_code and current_user.role not in ["Admin", "MD"]:
        raise HTTPException(status_code=403, detail="Not your approval")

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="Approval already processed")

    # Update approval
    approval.status = "returned"
    approval.decided_at = datetime.utcnow()
    approval.remarks = data.remarks
    approval.approver_id = current_user.emp_code

    # Update travel request status
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == approval.travel_request_id)
    )
    travel_request = tr_result.scalar_one_or_none()
    if travel_request:
        travel_request.status = "returned"

    await db.flush()

    return {"message": "Request returned with remarks"}


@router.post("/{approval_id}/reject")
async def reject_request(
    approval_id: str,
    data: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Reject a travel request."""
    result = await db.execute(
        select(Approval).where(Approval.id == approval_id)
    )
    approval = result.scalar_one_or_none()

    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.approver_id != current_user.emp_code and current_user.role not in ["Admin", "MD"]:
        raise HTTPException(status_code=403, detail="Not your approval")

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="Approval already processed")

    # Update approval
    approval.status = "rejected"
    approval.decided_at = datetime.utcnow()
    approval.remarks = data.remarks or "Rejected"
    approval.approver_id = current_user.emp_code

    # Update travel request status
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == approval.travel_request_id)
    )
    travel_request = tr_result.scalar_one_or_none()
    if travel_request:
        travel_request.status = "rejected"

    await db.flush()

    return {"message": "Request rejected"}
