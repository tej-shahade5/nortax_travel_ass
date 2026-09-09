from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...database import get_db
from ...models.employee import Employee
from ...models.receipt import Receipt
from ...schemas.receipt import ReceiptUpdate, ReceiptResponse
from ...utils.security import get_current_user

router = APIRouter(prefix="/receipts", tags=["Receipts"])


@router.get("/{travel_request_id}", response_model=list[ReceiptResponse])
async def list_receipts(
    travel_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List all receipts for a travel request."""
    result = await db.execute(
        select(Receipt).where(Receipt.travel_request_id == travel_request_id)
        .order_by(Receipt.receipt_date)
    )
    receipts = result.scalars().all()
    return [ReceiptResponse.model_validate(r) for r in receipts]


@router.get("/detail/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(
    receipt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get detailed receipt information."""
    result = await db.execute(
        select(Receipt).where(Receipt.id == receipt_id)
    )
    receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    return ReceiptResponse.model_validate(receipt)


@router.put("/{receipt_id}", response_model=ReceiptResponse)
async def update_receipt(
    receipt_id: str,
    data: ReceiptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update receipt details (category, amount, etc.)."""
    result = await db.execute(
        select(Receipt).where(Receipt.id == receipt_id)
    )
    receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(receipt, field, value)

    await db.flush()

    return ReceiptResponse.model_validate(receipt)


@router.delete("/{receipt_id}")
async def delete_receipt(
    receipt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Mark a receipt as duplicate or noise (soft delete)."""
    result = await db.execute(
        select(Receipt).where(Receipt.id == receipt_id)
    )
    receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    receipt.is_duplicate = True
    await db.flush()

    return {"message": "Receipt marked as duplicate/noise"}
