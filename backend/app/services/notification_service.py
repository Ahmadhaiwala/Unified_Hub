from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from datetime import datetime
from typing import List
import asyncio
from app.core.supabase import supabase

class NotificationService:
    """Service for scheduling and sending notifications"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.scheduler.start()
        print("✅ Notification scheduler started")
    
    async def schedule_reminder_notification(self, reminder_id: str, due_date: datetime, group_id: str):
        """
        Schedule a notification to be sent at the reminder's due date
        
        Args:
            reminder_id: ID of the reminder
            due_date: When to send the notification
            group_id: Group to notify
        """
        try:
            # Add job to scheduler
            job_id = f"reminder_{reminder_id}"
            
            # Remove existing job if it exists (for updates)
            existing_job = self.scheduler.get_job(job_id)
            if existing_job:
                existing_job.remove()
            
            # Schedule new job
            self.scheduler.add_job(
                self._send_reminder_notification,
                trigger=DateTrigger(run_date=due_date),
                args=[reminder_id, group_id],
                id=job_id,
                name=f"Reminder notification for {reminder_id}",
                replace_existing=True
            )
            
            print(f"📅 Scheduled reminder notification for {due_date.isoformat()}")
            print(f"   Job ID: {job_id}")
            
        except Exception as e:
            print(f"❌ Error scheduling reminder: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def _send_reminder_notification(self, reminder_id: str, group_id: str):
        """
        Internal method to send notification when scheduled time is reached
        
        This is called automatically by the scheduler at due_date
        """
        try:
            print(f"⏰ Sending reminder notification: {reminder_id}")
            
            # Get reminder details
            reminder_response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("reminders")
                .select("*")
                .eq("id", reminder_id)
                .execute()
            )
            
            if not reminder_response.data:
                print(f"❌ Reminder {reminder_id} not found")
                return
            
            reminder = reminder_response.data[0]
            
            # Get all group members
            members_response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("user_id, profiles:user_id(full_name)")
                .eq("group_id", group_id)
                .execute()
            )
            
            if not members_response.data:
                print(f"❌ No members found in group {group_id}")
                return
            
            # Create notification for each member
            for member in members_response.data:
                user_id = member["user_id"]
                
                # Insert notification into database
                notification_data = {
                    "user_id": user_id,
                    "type": "reminder",
                    "title": f"⏰ Reminder: {reminder['title']}",
                    "message": reminder.get("description") or reminder["title"],
                    "reference_id": reminder_id,
                    "reference_type": "reminder",
                    "priority": reminder.get("priority", "medium")
                }
                
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: supabase.table("notifications")
                    .insert(notification_data)
                    .execute()
                )
                
                print(f"✅ Notification sent to user {user_id[:8]}...")
            
            print(f"✅ Reminder notification complete: {len(members_response.data)} users notified")
            
        except Exception as e:
            print(f"❌ Error sending reminder notification: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def cancel_reminder_notification(self, reminder_id: str):
        """Cancel a scheduled reminder notification"""
        try:
            job_id = f"reminder_{reminder_id}"
            job = self.scheduler.get_job(job_id)
            
            if job:
                job.remove()
                print(f"🗑️ Cancelled scheduled notification for reminder {reminder_id}")
            else:
                print(f"ℹ️ No scheduled notification found for reminder {reminder_id}")
                
        except Exception as e:
            print(f"❌ Error cancelling notification: {str(e)}")
    
    def get_scheduled_jobs(self) -> List[dict]:
        """Get list of all scheduled notification jobs"""
        jobs = self.scheduler.get_jobs()
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in jobs
        ]
    
    def shutdown(self):
        """Shutdown the scheduler gracefully"""
        self.scheduler.shutdown()
        print("🛑 Notification scheduler stopped")

# Singleton instance
notification_service = NotificationService()
