from typing import List, Optional
from fastapi import HTTPException, status
from app.core.supabase import supabase
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import asyncio
from app.services.notification_service import notification_service

class ReminderService:
    
    @staticmethod
    async def create_reminder(group_id: str, admin_id: str, data: ReminderCreate) -> ReminderResponse:
        """Create a new reminder (admin only)"""
        try:
            # Check if user is admin of the group
            admin_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("role")
                .eq("group_id", group_id)
                .eq("user_id", admin_id)
                .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can create reminders"
                )
            
            # Create reminder
            reminder_data = {
                "group_id": group_id,
                "creator_id": admin_id,
                "title": data.title,
                "description": data.description,
                "due_date": data.due_date.isoformat() if data.due_date else None,
                "priority": data.priority.value
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("reminders").insert(reminder_data).execute()
            )
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create reminder"
                )
            
            created_reminder = result.data[0]
            created_reminder["is_read"] = False
            created_reminder["read_at"] = None
            
            # Schedule notification if due_date is set
            if data.due_date:
                await notification_service.schedule_reminder_notification(
                    reminder_id=created_reminder["id"],
                    due_date=data.due_date,
                    group_id=group_id
                )
            
            return ReminderResponse(**created_reminder)
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating reminder: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create reminder: {str(e)}"
            )
    
    @staticmethod
    async def get_group_reminders(group_id: str, user_id: str) -> List[ReminderResponse]:
        """Get all reminders for a group with user's read status"""
        try:
            # Check if user is member of group
            member_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("id")
                .eq("group_id", group_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of this group"
                )
            
            # Get reminders with read status from view
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_reminders_with_status")
                .select("*")
                .eq("group_id", group_id)
                .order("created_at", desc=True)
                .execute()
            )
            
            reminders = [ReminderResponse(**reminder) for reminder in result.data]
            return reminders
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching reminders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch reminders: {str(e)}"
            )
    
    @staticmethod
    async def get_user_pending_reminders(user_id: str) -> List[ReminderResponse]:
        """Get all pending (unread) reminders for a user across all groups"""
        try:
            # Get all unread reminders from view
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_reminders_with_status")
                .select("*")
                .is_("read_at", "null")
                .order("due_date", desc=False)
                .execute()
            )
            
            reminders = [ReminderResponse(**reminder) for reminder in result.data]
            return reminders
            
        except Exception as e:
            print(f"Error fetching pending reminders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch pending reminders: {str(e)}"
            )
    
    @staticmethod
    async def mark_reminder_read(reminder_id: str, user_id: str) -> dict:
        """Mark a reminder as read by a user"""
        try:
            # Insert or update reminder status
            status_data = {
                "reminder_id": reminder_id,
                "user_id": user_id,
                "read_at": datetime.utcnow().isoformat()
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_reminder_status")
                .upsert(status_data, on_conflict="reminder_id,user_id")
                .execute()
            )
            
            return {"status": "success", "message": "Reminder marked as read"}
            
        except Exception as e:
            print(f"Error marking reminder as read: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to mark reminder as read: {str(e)}"
            )
    
    @staticmethod
    async def delete_reminder(reminder_id: str, admin_id: str) -> dict:
        """Delete a reminder (admin/creator only)"""
        try:
            # Verify user is the creator
            reminder_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("reminders")
                .select("creator_id")
                .eq("id", reminder_id)
                .execute()
            )
            
            if not reminder_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Reminder not found"
                )
            
            if reminder_check.data[0]["creator_id"] != admin_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the creator can delete this reminder"
                )
            
            # Cancel scheduled notification
            await notification_service.cancel_reminder_notification(reminder_id)
            
            # Delete reminder
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("reminders")
                .delete()
                .eq("id", reminder_id)
                .execute()
            )
            
            return {"status": "success", "message": "Reminder deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting reminder: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete reminder: {str(e)}"
            )

# Singleton instance
reminder_service = ReminderService()
