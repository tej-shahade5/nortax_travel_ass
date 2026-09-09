from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class AdvanceDisburse(BaseModel):
    travel_request_id: str
    amount: Decimal
    reference: str


class AdvanceResponse(BaseModel):
    id: str
    travel_request_id: str
    reference: str
    amount: Decimal
    disbursed_at: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
