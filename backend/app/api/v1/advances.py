from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from uuid import uuid4
from ...database import get_db
from ...models.employee import Employee
from ...models.travel_request import TravelRequest
from ...models.advance import Advance
from ...schemas.advance import AdvanceDisburse, AdvanceResponse
from ...utils.security import get_current_user

router = APIRouter(prefix="/advances", tags=["Advances"])


@router.post("/disburse", response_model=AdvanceResponse)
async def disburse_advance(
    data: AdvanceDisburse,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Finance disburses a travel advance."""
    # Check if user is Finance
    if current_user.role != "Finance":
        raise HTTPException(status_code=403, detail="Finance role required")

    # Get travel request
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == data.travel_request_id)
    )
    travel_request = tr_result.scalar_one_or_none()

    if not travel_request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    if travel_request.status != "approved":
        raise HTTPException(status_code=400, detail="Travel request not approved yet")

    # Check if advance already exists
    existing_advance = await db.execute(
        select(Advance).where(Advance.travel_request_id == data.travel_request_id)
    )
    if existing_advance.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Advance already disbursed for this request")

    # Validate advance amount (max 60% of estimated)
    max_advance = float(travel_request.estimated_amount) * 0.6
    if float(data.amount) > max_advance:
        raise HTTPException(
            status_code=400,
            detail=f"Advance cannot exceed 60% of estimated amount ({max_advance:.2f})"
        )

    # Create advance
    advance = Advance(
        id=str(uuid4()),
        travel_request_id=data.travel_request_id,
        reference=data.reference,
        amount=data.amount,
        disbursed_at=datetime.utcnow(),
        status="disbursed",
    )

    db.add(advance)

    # Update travel request status
    travel_request.status = "advance_disbursed"

    await db.flush()

    return AdvanceResponse.model_validate(advance)


@router.get("/{travel_request_id}", response_model=AdvanceResponse)
async def get_advance(
    travel_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get advance information for a travel request."""
    result = await db.execute(
        select(Advance).where(Advance.travel_request_id == travel_request_id)
    )
    advance = result.scalar_one_or_none()

    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    return AdvanceResponse.model_validate(advance)
