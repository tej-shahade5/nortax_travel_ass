from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime
from decimal import Decimal


class ReceiptUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    merchant: Optional[str] = None
    is_duplicate: Optional[bool] = None
    attendee_names: Optional[str] = None
    attendee_org: Optional[str] = None


class ReceiptResponse(BaseModel):
    id: str
    travel_request_id: str
    source_email_id: Optional[str] = None
    merchant: Optional[str] = None
    receipt_date: Optional[date] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    raw_text: Optional[str] = None
    extracted_data: Optional[Any] = None
    attachment_path: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    policy_flags: Optional[Any] = None
    attendee_names: Optional[str] = None
    attendee_org: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
