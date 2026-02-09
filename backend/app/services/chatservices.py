from app.core.supabase import supabase
from fastapi import HTTPException
from app.schemas.chat import Message, ConversationOut, ConversationParticipant
from typing import List
from uuid import UUID

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
            print(f"Conversations data: {conversations}")
            
            if not conversations:
                return {"conversations": []}
            
            result = []
            
            for conv in conversations:
                print(f"\nProcessing conversation: {conv['id']}")
                # Determine the other participant
                other_user_id = conv["participant2_id"] if conv["participant1_id"] == user_id else conv["participant1_id"]
                print(f"Other user ID: {other_user_id}")
                
                # Get other user's profile
                profile = (
                    supabase.table("profiles")
                    .select("id, username")
                    .eq("id", other_user_id)
                    .execute()
                ).data
                
                print(f"Profile found: {profile}")
                
                if not profile:
                    print("No profile found, skipping...")
                    continue
                
                # Get last message
                last_message = (
                    supabase.table("messages")
                    .select("*")
                    .eq("conversation_id", conv["id"])
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                ).data
                
                # Get unread count (messages sent by other user that haven't been read)
                unread = (
                    supabase.table("messages")
                    .select("id", count="exact")
                    .eq("conversation_id", conv["id"])
                    .eq("sender_id", other_user_id)
                    .is_("read_at", "null")
                    .execute()
                )
                
                unread_count = unread.count if unread.count else 0
                
                result.append(
                    ConversationOut(
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
                )
            
            print(f"\nReturning {len(result)} conversations")
            return {"conversations": result}
            
        except Exception as e:
            print("ERROR:", e)
            import traceback
            traceback.print_exc()
            raise HTTPException(500, f"Failed to fetch conversations: {str(e)}")

    @staticmethod
    async def get_conversation_messages(conversation_id: str, user_id: str) -> List[Message]:
        """Get all messages in a conversation"""
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
            
            # Get messages
            messages = (
                supabase.table("messages")
                .select("*")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=False)
                .execute()
            ).data
            
            return [Message(**msg) for msg in messages]
            
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
