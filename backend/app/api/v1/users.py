from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.profile import ProfileBase
from app.schemas.profile import ProfileResponse
from app.services.profileservices import ProfileService

router = APIRouter()

@router.get("/users", response_model=list[ProfileResponse])
async def get_users(current_user=Depends(get_current_user)):
    """
    Get a list of users
    """
    return await ProfileService.getAllUser()

