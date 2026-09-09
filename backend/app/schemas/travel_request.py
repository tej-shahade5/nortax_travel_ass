from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class TravelRequestCreate(BaseModel):
    purpose: str
    destination: str
    city_tier: str  # Tier 1, Tier 2, Tier 3
    start_date: date
    end_date: date
    estimated_amount: Decimal
    advance_requested: Decimal = Decimal("0")


class TravelRequestUpdate(BaseModel):
    purpose: Optional[str] = None
    destination: Optional[str] = None
    city_tier: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_amount: Optional[Decimal] = None
    advance_requested: Optional[Decimal] = None


class TravelRequestResponse(BaseModel):
    id: str
    travel_request_id: str
    employee_id: str
    purpose: str
    destination: str
    city_tier: str
    start_date: date
    end_date: date
    estimated_amount: Decimal
    advance_requested: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    employee_city: Optional[str] = None

    class Config:
        from_attributes = True


class TravelRequestDetail(TravelRequestResponse):
    approvals: List["ApprovalResponse"] = []
    advance: Optional["AdvanceResponse"] = None
    receipt_count: int = 0
    claim: Optional["ClaimResponse"] = None

    class Config:
        from_attributes = True


# Import here to avoid circular imports
from .approval import ApprovalResponse
from .advance import AdvanceResponse
from .claim import ClaimResponse

TravelRequestDetail.model_rebuild()
