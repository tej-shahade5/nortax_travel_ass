from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class EmployeeBase(BaseModel):
    emp_code: str
    name: str
    email: EmailStr
    designation: Optional[str] = None
    department: Optional[str] = None
    cost_centre: Optional[str] = None
    city: Optional[str] = None
    reporting_manager_code: Optional[str] = None
    role: str


class EmployeeCreate(EmployeeBase):
    password: str


class EmployeeResponse(EmployeeBase):
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: EmployeeResponse
