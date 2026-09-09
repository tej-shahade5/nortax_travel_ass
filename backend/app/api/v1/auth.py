from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...database import get_db
from ...models.employee import Employee
from ...schemas.employee import EmployeeLogin, EmployeeResponse, Token
from ...utils.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(credentials: EmployeeLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate an employee and return a JWT token."""
    result = await db.execute(select(Employee).where(Employee.email == credentials.email))
    employee = result.scalar_one_or_none()

    if not employee or not verify_password(credentials.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(data={"sub": employee.emp_code})
    return Token(
        access_token=access_token,
        employee=EmployeeResponse.model_validate(employee),
    )


@router.get("/me", response_model=EmployeeResponse)
async def get_me(current_user: Employee = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return EmployeeResponse.model_validate(current_user)
