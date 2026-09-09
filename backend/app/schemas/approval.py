from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ApprovalAction(BaseModel):
    remarks: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: str
    travel_request_id: str
    approver_id: str
    level: int
    status: str
    remarks: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: datetime
    approver_name: Optional[str] = None

    class Config:
        from_attributes = True
