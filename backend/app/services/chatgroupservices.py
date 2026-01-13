from fastapi import HTTPException
from app.core.supabase import supabase
from app.schemas.chatgroups import ChatGroupOut,ChatGroupListOut
from typing import List
from fastapi.concurrency import run_in_threadpool
class ChatGroupService:
    """
    Service layer for chat group-related business logic
    """
    
    @staticmethod
    async def create_chat_group(chat_group_data: ChatGroupOut) -> ChatGroupOut:
        """
        Create a new chat group in the database
        
        Args:
            chat_group_data: chatgroups object with chat group details
            
        Returns:
            Created chatgroups object
            
        Raises:
            HTTPException: If database error occurs
        """
        try:
            response = supabase.table("chatgroups").insert(chat_group_data.dict()).execute()
            
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create chat group"
                )
            
            return ChatGroup(**response.data[0])
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create chat group: {str(e)}"
            )
    
            


    @staticmethod
    async def get_user_conversations(user_id: str):
        print("Service Layer: Fetching conversations for user_id:", user_id)

        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("conversation_members")
                    .select(
                        "conversations!conversation_members_conversation_id_fkey(id, title, type, created_at)"
                    )
                    .eq("user_id", user_id)
                    .execute()
            )

            print("Database response:", response)

            conversations = [
                row["conversations"]
                for row in (response.data or [])
                if row.get("conversations")
            ]

            return {
                "count": len(conversations),
                "conversations": conversations
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
