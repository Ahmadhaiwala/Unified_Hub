# app/api/v1/profile.py

from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.profile import ProfileResponse
from app.schemas.profileupdate import ProfileUpdate
from app.services.profileservices import ProfileService

router = APIRouter()


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user=Depends(get_current_user)):
    """
    Get the current user's profile from the profiles table
    """
    return await ProfileService.get_profile_by_user_id(current_user.id)


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update the current user's profile using request body
    """
    return await ProfileService.update_profile(current_user.id, payload)


@router.post("/profile", response_model=ProfileResponse)
async def create_profile(
    payload: ProfileUpdate,
    current_user=Depends(get_current_user)
):
    """
    Create a new profile for the current user
    """
    return await ProfileService.create_profile(current_user.id, payload)
