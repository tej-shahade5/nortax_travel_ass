from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal


class ClaimLineCreate(BaseModel):
    receipt_id: str
    category: str
    claimed_amount: Decimal
    allowed_amount: Decimal
    disallowed_amount: Decimal = Decimal("0")
    disallow_reason: Optional[str] = None
    policy_rule_ref: Optional[str] = None


class ClaimLineUpdate(BaseModel):
    category: Optional[str] = None
    claimed_amount: Optional[Decimal] = None
    allowed_amount: Optional[Decimal] = None
    disallowed_amount: Optional[Decimal] = None
    disallow_reason: Optional[str] = None


class ClaimLineResponse(BaseModel):
    id: str
    claim_id: str
    receipt_id: Optional[str] = None
    category: str
    claimed_amount: Decimal
    allowed_amount: Decimal
    disallowed_amount: Decimal
    disallow_reason: Optional[str] = None
    policy_rule_ref: Optional[str] = None
    created_at: datetime
    receipt: Optional[Any] = None

    class Config:
        from_attributes = True


class ClaimResponse(BaseModel):
    id: str
    travel_request_id: str
    employee_id: str
    total_claimed: Decimal
    advance_adjusted: Decimal
    net_payable: Decimal
    status: str
    submitted_at: Optional[datetime] = None
    finance_verified_at: Optional[datetime] = None
    payment_run_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    lines: List[ClaimLineResponse] = []
    employee_name: Optional[str] = None
    travel_request_id_ref: Optional[str] = None

    class Config:
        from_attributes = True


class ClaimCreate(BaseModel):
    travel_request_id: str


class ClaimUpdate(BaseModel):
    lines: Optional[List[ClaimLineUpdate]] = None


class FinanceVerify(BaseModel):
    remarks: Optional[str] = None
