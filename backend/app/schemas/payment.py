from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class PaymentSchedule(BaseModel):
    claim_id: str
    amount: Decimal
    payment_run_date: date


class PaymentResponse(BaseModel):
    id: str
    claim_id: str
    amount: Decimal
    payment_run_date: date
    status: str
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
