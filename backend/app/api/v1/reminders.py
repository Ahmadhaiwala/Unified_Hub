from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from app.services.reminder_service import reminder_service
from app.core.security import get_current_user

router = APIRouter()

@router.post("/reminders/{group_id}", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    group_id: str,
    reminder_data: ReminderCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new reminder for a group (admin only)
    """
    user_id = current_user["id"]
    return await reminder_service.create_reminder(group_id, user_id, reminder_data)

@router.get("/reminders/{group_id}", response_model=List[ReminderResponse])
async def get_group_reminders(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all reminders for a group with user's read status
    """
    user_id = current_user["id"]
    return await reminder_service.get_group_reminders(group_id, user_id)

@router.get("/reminders/me/pending", response_model=List[ReminderResponse])
async def get_pending_reminders(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all pending (unread) reminders for the current user across all groups
    """
    user_id = current_user["id"]
    return await reminder_service.get_user_pending_reminders(user_id)

@router.post("/reminders/{reminder_id}/read")
async def mark_reminder_read(
    reminder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a reminder as read
    """
    user_id = current_user["id"]
    return await reminder_service.mark_reminder_read(reminder_id, user_id)

@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_200_OK)
async def delete_reminder(
    reminder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a reminder (creator/admin only)
    """
    user_id = current_user["id"]
    return await reminder_service.delete_reminder(reminder_id, user_id)
