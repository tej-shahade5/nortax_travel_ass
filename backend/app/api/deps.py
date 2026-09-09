from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..utils.security import get_current_user
from ..models.employee import Employee


async def require_employee(
    current_user: Employee = Depends(get_current_user),
) -> Employee:
    """Require the current user to be an Employee."""
    return current_user


async def require_manager(
    current_user: Employee = Depends(get_current_user),
) -> Employee:
    """Require the current user to be a Manager or above."""
    allowed_roles = ["Reporting Manager", "Head of Department", "Head of Division", "MD", "Finance"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or above required",
        )
    return current_user


async def require_finance(
    current_user: Employee = Depends(get_current_user),
) -> Employee:
    """Require the current user to be Finance."""
    if current_user.role != "Finance":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance role required",
        )
    return current_user


async def require_hod_or_above(
    current_user: Employee = Depends(get_current_user),
) -> Employee:
    """Require the current user to be HOD or above."""
    allowed_roles = ["Head of Department", "Head of Division", "MD"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Head of Department or above required",
        )
    return current_user
