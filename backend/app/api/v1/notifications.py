from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.notification import NotificationResponse, NotificationUpdate
from app.core.security import get_current_user
from app.core.supabase import supabase
from datetime import datetime
import asyncio

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_user_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get all notifications for the current user"""
    try:
        user_id = current_user["sub"]
        
        query = supabase.table("notifications") \
            .select("*") \
            .eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: query.order("created_at", desc=True).limit(limit).execute()
        )
        
        return response.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notifications: {str(e)}"
        )

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read (dismiss)"""
    try:
        user_id = current_user["sub"]
        
        # Update notification
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: supabase.table("notifications")
            .update({
                "is_read": True,
                "read_at": datetime.utcnow().isoformat()
            })
            .eq("id", notification_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"status": "success", "message": "Notification dismissed"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}"
        )

@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification permanently"""
    try:
        user_id = current_user["sub"]
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: supabase.table("notifications")
            .delete()
            .eq("id", notification_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        return {"status": "success", "message": "Notification deleted"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}"
        )

@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    try:
        user_id = current_user["sub"]
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: supabase.table("notifications")
            .update({
                "is_read": True,
                "read_at": datetime.utcnow().isoformat()
            })
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        
        count = len(response.data) if response.data else 0
        
        return {
            "status": "success",
            "message": f"Marked {count} notifications as read"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all as read: {str(e)}"
        )

@router.get("/notifications/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of unread notifications"""
    try:
        user_id = current_user["sub"]
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        
        return {"unread_count": response.count or 0}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unread count: {str(e)}"
        )
