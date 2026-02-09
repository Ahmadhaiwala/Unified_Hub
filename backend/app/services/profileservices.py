# app/services/profileservices.py

from fastapi import HTTPException
from app.core.supabase import supabase
from app.schemas.profile import ProfileResponse
from app.schemas.profileupdate import ProfileUpdate


class ProfileService:
    """
    Service layer for profile-related business logic
    """
    
    @staticmethod
    async def get_profile_by_user_id(user_id: str) -> ProfileResponse:
        """
        Fetch a user's profile from the database
        
        Args:
            user_id: The user's unique identifier
            
        Returns:
            ProfileResponse object
            
        Raises:
            HTTPException: If profile not found or database error
        """
        try:
            response = supabase.table("profiles").select("*").eq("id", user_id).execute()
            
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Profile not found"
                )
            
            return ProfileResponse(**response.data[0])
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch profile: {str(e)}"
            )
    
    @staticmethod
    async def update_profile(user_id: str, profile_data: ProfileUpdate) -> ProfileResponse:
        """
        Update a user's profile with provided data
        
        Args:
            user_id: The user's unique identifier
            profile_data: ProfileUpdate object with fields to update
            
        Returns:
            Updated ProfileResponse object
            
        Raises:
            HTTPException: If no data provided, profile not found, or database error
        """
        try:
            
            update_data = profile_data.model_dump(exclude_none=True)
            
            if not update_data:
                raise HTTPException(
                    status_code=400,
                    detail="No fields provided to update"
                )
            
            response = (
                supabase
                .table("profiles")
                .update(update_data)
                .eq("id", user_id)
                .execute()
            )
            
            if not response.data:
                raise HTTPException(
                    status_code=404,
                    detail="Profile not found"
                )
            
            return ProfileResponse(**response.data[0])
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update profile: {str(e)}"
            )
    @staticmethod
    async def getAllUser()->list[ProfileResponse]:
        print('methd of get all users called')
        response = supabase.table("profiles").select("*").execute()
        if not response.data:
            return []
        print(response.data)
        return [ProfileResponse(**item) for item in response.data]
        
    @staticmethod
    async def create_profile(user_id: str, profile_data: ProfileUpdate) -> ProfileResponse:
        """
        Create a new profile for a user
        
        Args:
            user_id: The user's unique identifier
            profile_data: ProfileUpdate object with initial profile data
            
        Returns:
            Created ProfileResponse object
            
        Raises:
            HTTPException: If creation fails
        """
        try:
           
            insert_data = profile_data.model_dump(exclude_none=True)
            insert_data["id"] = user_id
            
            response = supabase.table("profiles").insert(insert_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create profile"
                )
            
            return ProfileResponse(**response.data[0])
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create profile: {str(e)}"
            )
