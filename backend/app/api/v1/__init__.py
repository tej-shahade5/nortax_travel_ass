from fastapi import APIRouter
from .auth import router as auth_router
from .travel_requests import router as travel_requests_router
from .approvals import router as approvals_router
from .advances import router as advances_router
from .emails import router as emails_router
from .receipts import router as receipts_router
from .claims import router as claims_router
from .finance import router as finance_router
from .dashboard import router as dashboard_router
from .admin import router as admin_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(travel_requests_router)
api_router.include_router(approvals_router)
api_router.include_router(advances_router)
api_router.include_router(emails_router)
api_router.include_router(receipts_router)
api_router.include_router(claims_router)
api_router.include_router(finance_router)
api_router.include_router(dashboard_router)
api_router.include_router(admin_router)
