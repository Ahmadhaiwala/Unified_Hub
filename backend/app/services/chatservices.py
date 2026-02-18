from app.core.supabase import supabase
from fastapi import HTTPException
from app.schemas.chat import Message, ConversationOut, ConversationParticipant
from typing import List
from uuid import UUID
import asyncio
from fastapi.concurrency import run_in_threadpool

class ChatService:
    @staticmethod
    async def get_or_create_conversation(user_id: str, friend_id: str) -> dict:
        """Get existing conversation or create new one between two users"""
        try:
            # Use the database function to get or create conversation
            result = supabase.rpc(
                'get_or_create_conversation',
                {'user1_id': user_id, 'user2_id': friend_id}
            ).execute()
            
            if not result.data:
                raise HTTPException(500, "Failed to create conversation")
            
            conversation_id = result.data
            
            # Fetch the conversation details
            conversation = (
                supabase.table("conversations")
                .select("*")
                .eq("id", conversation_id)
                .execute()
            ).data
            
            if not conversation:
                raise HTTPException(404, "Conversation not found")
                
            return conversation[0]
            
        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, f"Failed to get/create conversation: {str(e)}")

    @staticmethod
    async def get_user_conversations(user_id: str) -> dict:
        """Get all conversations for a user with last message and unread count"""
        try:
            print(f"\n=== Getting conversations for user: {user_id} ===")
            
            # Get all conversations where user is a participant
            conversations = (
                supabase.table("conversations")
                .select("*")
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")
                .order("updated_at", desc=True)
                .execute()
            ).data
            
            print(f"Found {len(conversations) if conversations else 0} conversations")
            
            if not conversations:
                return {"conversations": []}
            
            # Prepare concurrent tasks for each conversation
            async def process_conversation(conv):
                # Determine the other participant
                other_user_id = conv["participant2_id"] if conv["participant1_id"] == user_id else conv["participant1_id"]
                
                # Fetch profile, last message, and unread count concurrently
                profile_task = run_in_threadpool(
                    lambda: supabase.table("profiles")
                    .select("id, username")
                    .eq("id", other_user_id)
                    .execute()
                )
                
                last_message_task = run_in_threadpool(
                    lambda: supabase.table("messages")
                    .select("*")
                    .eq("conversation_id", conv["id"])
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                
                unread_task = run_in_threadpool(
                    lambda: supabase.table("messages")
                    .select("id", count="exact")
                    .eq("conversation_id", conv["id"])
                    .eq("sender_id", other_user_id)
                    .is_("read_at", "null")
                    .execute()
                )
                
                # Wait for all tasks to complete
                profile_response, last_message_response, unread_response = await asyncio.gather(
                    profile_task, last_message_task, unread_task
                )
                
                profile = profile_response.data
                last_message = last_message_response.data
                unread_count = unread_response.count if unread_response.count else 0
                
                if not profile:
                    return None
                
                return ConversationOut(
                    id=conv["id"],
                    participant=ConversationParticipant(
                        id=profile[0]["id"],
                        username=profile[0]["username"]
                    ),
                    last_message=Message(**last_message[0]) if last_message else None,
                    unread_count=unread_count,
                    created_at=conv["created_at"],
                    updated_at=conv["updated_at"]
                )
            
            # Process all conversations concurrently
            results = await asyncio.gather(*[process_conversation(conv) for conv in conversations])
            
            # Filter out None results (conversations with missing profiles)
            result = [r for r in results if r is not None]
            
            print(f"\nReturning {len(result)} conversations")
            return {"conversations": result}
            
        except Exception as e:
            print("ERROR:", e)
            import traceback
            traceback.print_exc()
            raise HTTPException(500, f"Failed to fetch conversations: {str(e)}")

    @staticmethod
    async def get_conversation_messages(conversation_id: str, user_id: str, limit: int = 20, offset: int = 0) -> dict:
        """Get messages in a conversation with pagination"""
        try:
            # Verify user is part of the conversation
            conversation = (
                supabase.table("conversations")
                .select("*")
                .eq("id", conversation_id)
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")
                .execute()
            ).data
            
            if not conversation:
                raise HTTPException(403, "Not authorized to view this conversation")
            
            # Get total count
            count_response = await run_in_threadpool(
                lambda: supabase.table("messages")
                .select("id", count="exact")
                .eq("conversation_id", conversation_id)
                .execute()
            )
            total_count = count_response.count if count_response.count else 0
            
            # Get messages with pagination (most recent first, then reverse for display)
            messages_response = await run_in_threadpool(
                lambda: supabase.table("messages")
                .select("*")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=True)
                .limit(limit)
                .range(offset, offset + limit - 1)
                .execute()
            )
            
            messages = messages_response.data or []
            # Reverse to show oldest first in the UI
            messages.reverse()
            
            return {
                "messages": [Message(**msg) for msg in messages],
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + len(messages)) < total_count
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, f"Failed to fetch messages: {str(e)}")

    @staticmethod
    async def send_message(conversation_id: str, user_id: str, content: str) -> Message:
        """Send a message in a conversation"""
        try:
            # Verify user is part of the conversation
            conversation = (
                supabase.table("conversations")
                .select("*")
                .eq("id", conversation_id)
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")
                .execute()
            ).data
            
            if not conversation:
                raise HTTPException(403, "Not authorized to send messages in this conversation")
            
            # Insert message
            message = (
                supabase.table("messages")
                .insert({
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "content": content
                })
                .execute()
            ).data
            
            if not message:
                raise HTTPException(500, "Failed to send message")
            
            return Message(**message[0])
            
        except HTTPException:
            raise
        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, f"Failed to send message: {str(e)}")

    @staticmethod
    async def mark_messages_as_read(conversation_id: str, user_id: str) -> bool:
        """Mark all unread messages in a conversation as read"""
        try:
            # Get the other participant's ID
            conversation = (
                supabase.table("conversations")
                .select("*")
                .eq("id", conversation_id)
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")
                .execute()
            ).data
            
            if not conversation:
                raise HTTPException(403, "Not authorized")
            
            conv = conversation[0]
            other_user_id = conv["participant2_id"] if conv["participant1_id"] == user_id else conv["participant1_id"]
            
            # Mark messages from other user as read
            supabase.table("messages")\
                .update({"read_at": "now()"})\
                .eq("conversation_id", conversation_id)\
                .eq("sender_id", other_user_id)\
                .is_("read_at", "null")\
                .execute()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, f"Failed to mark messages as read: {str(e)}")
    
    @staticmethod
    async def delete_conversation(conversation_id: str, user_id: str) -> dict:
        """Delete entire conversation and all its messages"""
        try:
            # Verify user is a participant
            conversation = await run_in_threadpool(
                lambda: supabase.table("conversations")
                .select("*")
                .eq("id", conversation_id)
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")
                .execute()
            )
            
            if not conversation.data:
                raise HTTPException(403, "Not authorized to delete this conversation")
            
            # Delete all messages in the conversation first
            await run_in_threadpool(
                lambda: supabase.table("messages")
                .delete()
                .eq("conversation_id", conversation_id)
                .execute()
            )
            
            # Delete the conversation
            await run_in_threadpool(
                lambda: supabase.table("conversations")
                .delete()
                .eq("id", conversation_id)
                .execute()
            )
            
            return {
                "success": True,
                "message": "Conversation deleted successfully",
                "conversation_id": conversation_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting conversation: {str(e)}")
            raise HTTPException(500, f"Failed to delete conversation: {str(e)}")
    
    @staticmethod
    async def delete_message(message_id: str, user_id: str) -> dict:
        """Delete a specific message (only if user is the sender)"""
        try:
            # Verify user is the sender
            message = await run_in_threadpool(
                lambda: supabase.table("messages")
                .select("*")
                .eq("id", message_id)
                .eq("sender_id", user_id)
                .execute()
            )
            
            if not message.data:
                raise HTTPException(403, "Not authorized to delete this message")
            
            # Delete the message
            await run_in_threadpool(
                lambda: supabase.table("messages")
                .delete()
                .eq("id", message_id)
                .execute()
            )
            
            return {
                "success": True,
                "message": "Message deleted successfully",
                "message_id": message_id,
                "conversation_id": message.data[0]["conversation_id"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting message: {str(e)}")
            raise HTTPException(500, f"Failed to delete message: {str(e)}")
    
    @staticmethod
    async def update_message(message_id: str, user_id: str, new_content: str) -> dict:
        """Update/edit a message (only if user is the sender)"""
        try:
            # Verify user is the sender
            message = await run_in_threadpool(
                lambda: supabase.table("messages")
                .select("*")
                .eq("id", message_id)
                .eq("sender_id", user_id)
                .execute()
            )
            
            if not message.data:
                raise HTTPException(403, "Not authorized to edit this message")
            
            # Update the message
            from datetime import datetime
            updated_message = await run_in_threadpool(
                lambda: supabase.table("messages")
                .update({
                    "content": new_content,
                    "updated_at": datetime.now().isoformat()
                })
                .eq("id", message_id)
                .execute()
            )
            
            if not updated_message.data:
                raise HTTPException(500, "Failed to update message")
            
            return {
                "success": True,
                "message": updated_message.data[0],
                "conversation_id": message.data[0]["conversation_id"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating message: {str(e)}")
            raise HTTPException(500, f"Failed to update message: {str(e)}")

           

    @staticmethod
    async def get_conversation_details(conversation_id: str, user_id: str) -> dict:
        """Get conversation details for WebSocket"""
        try:
            conversation = (
                supabase.table("conversations")
                .select("*")
                .eq("id", conversation_id)
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")
                .execute()
            ).data
            
            if not conversation:
                raise HTTPException(403, "Not authorized")
            
            return conversation[0]
            
        except HTTPException:
            raise
        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, f"Failed to get conversation: {str(e)}")
