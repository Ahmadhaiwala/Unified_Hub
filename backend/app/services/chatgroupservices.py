from fastapi import HTTPException
from app.core.supabase import supabase
from app.schemas.chatgroups import ChatGroupOut,ChatGroupListOut
from typing import List
from fastapi.concurrency import run_in_threadpool
import uuid
from datetime import datetime, timezone

class ChatGroupService:
    """
    Service layer for chat group-related business logic
    """
    
    @staticmethod
    async def create_chat_group(chat_group_data, creator_id: str) -> ChatGroupOut:
        """
        Create a new chat group in the database
        
        Args:
            chat_group_data: ChatGroupCreate object with chat group details
            creator_id: ID of the user creating the group
            
        Returns:
            Created ChatGroupOut object
            
        Raises:
            HTTPException: If database error occurs
        """
        try:
            # Generate a UUID for the group
            group_id = str(uuid.uuid4())
            current_time = datetime.now(timezone.utc)
            
            # Insert group data with creator_id and explicit id
            group_data = {
                "id": group_id,
                "name": chat_group_data.name,
                "description": chat_group_data.description,
                "creator_id": creator_id,
                "created_at": current_time.isoformat(),
                "updated_at": current_time.isoformat()
            }
            
            # Insert the group
            insert_response = supabase.table("chat_groups").insert(group_data).execute()
            
            if not insert_response.data or len(insert_response.data) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create chat group"
                )
            
            # Fetch the complete group record with auto-generated timestamps
            fetch_response = supabase.table("chat_groups").select("*").eq("id", group_id).execute()
            
            if not fetch_response.data or len(fetch_response.data) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to fetch created chat group"
                )
            
            created_group = fetch_response.data[0]
            
            # Add the creator as a member of the group
            member_id = str(uuid.uuid4())
            member_data = {
                "id": member_id,
                "group_id": group_id,
                "user_id": creator_id
            }
            
            print(f"Attempting to add creator as member: {member_data}")
            member_response = supabase.table("group_members").insert(member_data).execute()
            print(f"Member insert response: {member_response}")
            
            if not member_response.data or len(member_response.data) == 0:
                # This is critical - creator must be a member
                print(f"ERROR: Failed to add creator as group member for group {group_id}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to add creator as group member"
                )
            
            return ChatGroupOut(**created_group)
            
        except Exception as e:
            print(f"Exception in create_chat_group: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create chat group: {str(e)}"
            )
    
            


   
    @staticmethod
    async def get_user_groups(user_id: str):
        print("Service Layer: Fetching groups for user_id:", user_id)

        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select(
                        "chat_groups!group_members_group_id_fkey(id, name, description, created_at)"
                    )
                    .eq("user_id", user_id)
                    .execute()
            )

            print("Database response:", response)

            groups = [
                row["chat_groups"]
                for row in (response.data or [])
                if row.get("chat_groups")
            ]

            return {
                "count": len(groups),
                "groups": groups
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def get_group_details(group_id,user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("chat_groups")
                    .select(
                        "id, name, description, created_at"
                    )
                    .eq("id", group_id)
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def update_group(group_id,user_id,group_data):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("chatgroups")
                    .update(group_data)
                    .eq("id", group_id)
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def delete_group(group_id,user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("chat_groups")
                    .delete()
                    .eq("id", group_id)
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def add_member(group_id,user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .insert({
                        "group_id": group_id,
                        "user_id": user_id
                    })
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def remove_member(group_id,user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .delete()
                    .eq("group_id", group_id)
                    .eq("user_id", user_id)
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def get_group_members(group_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select(
                        "user_id"
                    )
                    .eq("group_id", group_id)
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def leave_group(group_id,user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .delete()
                    .eq("group_id", group_id)
                    .eq("user_id", user_id)
                    .execute()
            )

            print("Database response:", response)

            group = response.data[0]

            return {
                "group": group
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def send_group_message(group_id, user_id, message):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_messages")
                    .insert({
                        "group_id": group_id,
                        "sender_id": user_id,
                        "content": message
                    })
                    .execute()
            )

            print("Database response:", response)

            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to send message"
                )
            
            # Fetch the complete message with all fields
            message_id = response.data[0].get("id")
            if message_id:
                fetch_response = await run_in_threadpool(
                    lambda: supabase
                        .table("group_messages")
                        .select("id, group_id, sender_id, content, created_at, updated_at")
                        .eq("id", message_id)
                        .execute()
                )
                if fetch_response.data and len(fetch_response.data) > 0:
                    return fetch_response.data[0]
            
            return response.data[0]

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def get_group_messages(group_id, user_id, limit=50, offset=0):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_messages")
                    .select(
                        "id, group_id, sender_id, content, created_at, updated_at"
                    )
                    .eq("group_id", group_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .range(offset, offset + limit - 1)
                    .execute()
            )

            print("Database response:", response)

            messages = response.data or []

            return {
                "count": len(messages),
                "messages": messages
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def delete_message(message_id, user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                .table("group_messages")
                .delete()
                .eq("id", message_id)
                .eq("sender_id", user_id)
                .execute()
            )
            print("Database response:", response)

            return {"message": "Message deleted successfully"}

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def get_user_conversations(user_id):
        try:
            print(f"Fetching groups for user: {user_id}")
            
            # First, get all group IDs where the user is a member
            member_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("group_id")
                    .eq("user_id", user_id)
                    .execute()
            )
            
            print(f"Member response: {member_response.data}")
            
            if not member_response.data or len(member_response.data) == 0:
                return {
                    "count": 0,
                    "groups": []
                }
            
            # Extract group IDs
            group_ids = [row["group_id"] for row in member_response.data]
            print(f"Group IDs: {group_ids}")
            
            # Then, fetch the chat groups for those IDs
            groups_response = await run_in_threadpool(
                lambda: supabase
                    .table("chat_groups")
                    .select("id, name, description, created_at, updated_at")
                    .in_("id", group_ids)
                    .execute()
            )
            
            print(f"Groups response: {groups_response.data}")
            
            groups = groups_response.data or []

            return {
                "count": len(groups),
                "groups": groups
            }

        except Exception as e:
            print(f"ERROR in get_user_conversations: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))



