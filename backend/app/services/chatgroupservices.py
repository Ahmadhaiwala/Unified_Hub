from fastapi import HTTPException
from app.core.supabase import supabase
from app.schemas.chatgroups import ChatGroupOut,ChatGroupListOut
from typing import List
from fastapi.concurrency import run_in_threadpool
import uuid
from datetime import datetime, timezone
from app.services.assignment_detector import detect_and_store_assignment
from app.core.ai_memory import store_embedding
from app.services.answer_linker import detect_answer_and_link
import asyncio
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
            
            
            member_id = str(uuid.uuid4())
            member_data = {
                "id": member_id,
                "group_id": group_id,
                "user_id": creator_id,
                "role": "admin"
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
                        "id, name, description, avatar_url, created_at, updated_at"
                    )
                    .eq("id", group_id)
                    .execute()
            )

            print("Database response:", response)

            if not response.data:
                raise HTTPException(status_code=404, detail="Group not found")

            group = response.data[0]

            # Return the group data directly (not wrapped in "group" key)
            return group

        except HTTPException:
            raise
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
    async def add_members(group_id, current_user_id, user_ids):
        """Add multiple members to a group (admin only)"""
        try:
            # Check if current user is admin
            admin_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("role")
                    .eq("group_id", group_id)
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Only admins can add members"
                )
            
            # Add each user as a member
            members_to_add = []
            for user_id in user_ids:
                member_id = str(uuid.uuid4())
                members_to_add.append({
                    "id": member_id,
                    "group_id": group_id,
                    "user_id": str(user_id),
                    "role": "member"
                })
            
            # Bulk insert
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .insert(members_to_add)
                    .execute()
            )

            print("Add members response:", response)

            if not response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to add members"
                )
            
            # Return added members with user info
            return {
                "message": f"Successfully added {len(user_ids)} member(s)",
                "added_count": len(response.data)
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def remove_member(group_id, current_user_id, user_id_to_remove):
        """Remove a member from the group (admin only, cannot remove last admin)"""
        try:
            # Check if current user is admin
            admin_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("role")
                    .eq("group_id", group_id)
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Only admins can remove members"
                )
            
            # Check if user to remove is an admin
            target_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("role")
                    .eq("group_id", group_id)
                    .eq("user_id", user_id_to_remove)
                    .execute()
            )
            
            if target_check.data and target_check.data[0].get("role") == "admin":
                # Count total admins
                admin_count = await run_in_threadpool(
                    lambda: supabase
                        .table("group_members")
                        .select("id")
                        .eq("group_id", group_id)
                        .eq("role", "admin")
                        .execute()
                )
                
                if len(admin_count.data) <= 1:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot remove the last admin"
                    )
            
            # Remove the member
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .delete()
                    .eq("group_id", group_id)
                    .eq("user_id", user_id_to_remove)
                    .execute()
            )

            print("Remove member response:", response)

            return {
                "message": "Member removed successfully"
            }

        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def update_member_role(group_id, admin_user_id, target_user_id, new_role):
        """Update a member's role in the group (admin only)"""
        try:
            # Check if current user is admin
            admin_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("role")
                    .eq("group_id", group_id)
                    .eq("user_id", admin_user_id)
                    .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Only admins can change member roles"
                )
            
            # Prevent changing own role
            if admin_user_id == target_user_id:
                raise HTTPException(
                    status_code=400,
                    detail="You cannot change your own role"
                )
            
            # If demoting from admin, check there's at least one other admin
            if new_role != "admin":
                # Get current role of target user
                target_role_check = await run_in_threadpool(
                    lambda: supabase
                        .table("group_members")
                        .select("role")
                        .eq("group_id", group_id)
                        .eq("user_id", target_user_id)
                        .execute()
                )
                
                if target_role_check.data and target_role_check.data[0].get("role") == "admin":
                    # Count total admins
                    admin_count = await run_in_threadpool(
                        lambda: supabase
                            .table("group_members")
                            .select("id")
                            .eq("group_id", group_id)
                            .eq("role", "admin")
                            .execute()
                    )
                    
                    if len(admin_count.data) <= 1:
                        raise HTTPException(
                            status_code=400,
                            detail="Cannot demote the last admin. Promote another member first."
                        )
            
            # Update the member's role
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .update({"role": new_role})
                    .eq("group_id", group_id)
                    .eq("user_id", target_user_id)
                    .execute()
            )

            print("Update role response:", response)

            if not response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to update member role"
                )

            return {
                "message": f"Member role updated to {new_role} successfully"
            }

        except HTTPException:
            raise
        except Exception as e:
            print("ERROR:", str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def get_group_members(group_id, current_user_id):
        """Get all members of a group with user details"""
        try:
            # Verify user is a member
            member_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("id")
                    .eq("group_id", group_id)
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=403,
                    detail="You are not a member of this group"
                )
            
            # Get members with user details using the view
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_members_with_details")
                    .select("*")
                    .eq("group_id", group_id)
                    .execute()
            )

            print("Get group members response:", response)

            members = response.data or []

            return {
                "count": len(members),
                "members": members
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
            # Generate UUID for the message
            message_id = str(uuid.uuid4())
            
            print(f"📝 Attempting to save message: {message_id}")
            print(f"   Group: {group_id}, User: {user_id}")
            print(f"   Content: {message[:50]}...")
            
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_messeges")
                    .insert({
                        "id": message_id,
                        "group_id": group_id,
                        "sender_id": user_id,
                        "content": message
                    })
                    .execute()
            )

            print(f"✅ Database insert response: {response.data}")
            print(f"   Response status: {response}")

            if not response.data:
                print("❌ ERROR: No data returned from insert")
                print(f"   Full response: {response}")
                raise HTTPException(status_code=500, detail="Failed to send message - no data returned")

            # Verify the message was actually inserted by fetching it
            fetch_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_messeges")
                    .select("id, group_id, sender_id, content, created_at, updated_at")
                    .eq("id", message_id)
                    .execute()
            )
            
            print(f"🔍 Verification fetch: {fetch_response.data}")

            if not fetch_response.data or len(fetch_response.data) == 0:
                print(f"❌ CRITICAL: Message {message_id} was NOT found in database after insert!")
                print(f"   This means the insert failed silently or was rolled back")
                raise HTTPException(status_code=500, detail="Message insert verification failed")

            message_record = fetch_response.data[0]
            print(f"✅ Message saved and verified: {message_record['id']}")

            # Fetch sender profile for embedding
            sender_response = await run_in_threadpool(
                lambda: supabase
                    .table("profiles")
                    .select("username, email")
                    .eq("id", user_id)
                    .execute()
            )
            
            sender_name = "User"
            if sender_response.data and len(sender_response.data) > 0:
                sender = sender_response.data[0]
                sender_name = sender.get("username") or sender.get("email") or "User"

            # 🧠 Background AI (only after success)
            import asyncio
            asyncio.create_task(
                detect_and_store_assignment(
                    text=message,
                    group_id=group_id,
                    user_id=user_id
                )
            )
            asyncio.create_task(
                    detect_answer_and_link(
                        message_text=message,
                        message_id=message_id,
                        group_id=group_id,
                        student_id=user_id
                    )
                )


            asyncio.create_task(
                store_embedding(
                    text=f"{sender_name} said: {message}",
                    metadata={
                        "message_id": message_id,
                        "group_id": group_id,
                        "sender_id": user_id,
                        "sender_name": sender_name,
                        "type": "message"
                    }
                )
            )

            return message_record

        except Exception as e:
            print(f"❌ ERROR in send_group_message: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def get_group_messages(group_id, user_id, limit=20, offset=0):
        try:
            print(f"📥 Fetching messages for group: {group_id}, user: {user_id}")
            
            # Verify user is a member of the group
            member_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("id")
                    .eq("group_id", group_id)
                    .eq("user_id", user_id)
                    .execute()
            )
            
            if not member_check.data:
                print(f"❌ User {user_id} is not a member of group {group_id}")
                raise HTTPException(
                    status_code=403,
                    detail="You are not a member of this group"
                )
            
            print(f"✅ User is a member, fetching messages...")
            
            # Get total count
            count_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_messeges")
                    .select("id", count="exact")
                    .eq("group_id", group_id)
                    .execute()
            )
            total_count = count_response.count if count_response.count else 0
            print(f"📊 Total messages in group: {total_count}")
            
            # Get messages - fetch without strict ordering first
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_messeges")
                    .select("id, group_id, sender_id, content, created_at, updated_at")
                    .eq("group_id", group_id)
                    .execute()
            )

            all_messages = response.data or []
            print(f"📨 Fetched {len(all_messages)} total messages from database")
            
            # Sort messages in Python, handling NULL timestamps
            # Messages with NULL created_at will use a very old date for sorting
            from datetime import datetime
            def get_sort_key(msg):
                if msg.get("created_at"):
                    try:
                        return datetime.fromisoformat(msg["created_at"].replace('Z', '+00:00'))
                    except:
                        return datetime.min
                return datetime.min  # NULL timestamps go to the beginning
            
            all_messages.sort(key=get_sort_key, reverse=True)
            
            # Apply pagination manually
            start_idx = offset
            end_idx = offset + limit
            messages = all_messages[start_idx:end_idx]
            
            print(f"📨 Returning {len(messages)} messages (offset={offset}, limit={limit})")
            
            # Fetch sender info for each message
            for msg in messages:
                try:
                    print(f"🔍 Fetching sender info for message {msg['id']}, sender_id: {msg.get('sender_id')}")
                    
                    sender_response = await run_in_threadpool(
                        lambda m=msg: supabase
                            .table("profiles")
                            .select("username, email")
                            .eq("id", m["sender_id"])
                            .execute()
                    )
                    
                    print(f"   Sender response: {sender_response.data}")
                    
                    if sender_response.data and len(sender_response.data) > 0:
                        sender = sender_response.data[0]
                        username = sender.get("username") or sender.get("email")
                        msg["sender_username"] = username
                        print(f"   ✅ Set sender_username to: {username}")
                    else:
                        msg["sender_username"] = "Unknown"
                        print(f"   ⚠️ No profile found for sender_id: {msg.get('sender_id')}")
                except Exception as e:
                    print(f"⚠️ Error fetching sender info for message {msg['id']}: {e}")
                    import traceback
                    traceback.print_exc()
                    msg["sender_username"] = "Unknown"
            
            print(f"✅ Fetched sender info for all messages")
            
            # Fetch attachments for all messages sequentially to avoid socket issues
            print(f"🔄 Processing attachments...")
            for msg in messages:
                try:
                    attachment_response = await run_in_threadpool(
                        lambda m=msg: supabase
                            .table("group_attachments")
                            .select("id, file_name, file_type, file_size, uploader_id, created_at, file_path")
                            .eq("message_id", m["id"])
                            .execute()
                    )
                    
                    if attachment_response.data and len(attachment_response.data) > 0:
                        attachment = attachment_response.data[0]

                        # Generate file URL
                        bucket_name = "message"
                        file_path = attachment.get("file_path")

                        if file_path:
                            public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
                            attachment["file_url"] = public_url

                        # Get uploader username
                        uploader_response = await run_in_threadpool(
                            lambda a=attachment: supabase
                                .table("profiles")
                                .select("username")
                                .eq("id", a["uploader_id"])
                                .execute()
                        )

                        if uploader_response.data and len(uploader_response.data) > 0:
                            attachment["uploader_username"] = uploader_response.data[0].get("username")

                        msg["attachment"] = attachment
                except Exception as e:
                    print(f"⚠️ Error fetching attachment for message {msg['id']}: {e}")
            
            # Reverse to show oldest first
            messages.reverse()
            
            print(f"✅ Successfully fetched {len(messages)} messages with all data")

            return {
                "count": len(messages),
                "messages": messages,
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + len(messages)) < total_count
            }

        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ ERROR in get_group_messages: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
    @staticmethod
    async def delete_message(message_id, user_id):
        try:
            response = await run_in_threadpool(
                lambda: supabase
                .table("group_messeges")
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
                    .select("id, name, description, avatar_url, created_at, updated_at")
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

    # ===== DOCUMENT/ATTACHMENT MANAGEMENT =====
    
    @staticmethod
    async def upload_document(group_id, current_user_id, file, message_id=None):
        """Upload a document/file to a group"""
        try:
            
           

            # Verify user is a member
            member_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("id")
                    .eq("group_id", group_id)
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=403,
                    detail="You must be a member to upload files"
                )
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Validate file size (10MB limit)
            max_size = 10 * 1024 * 1024  # 10MB
            if file_size > max_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size exceeds maximum of {max_size / (1024*1024)}MB"
                )
            
            # Generate file path: {group_id}/{uploader_id}/{filename}
            file_path = f"{group_id}/{current_user_id}/{file.filename}"
            
            # Upload to Supabase Storage
            upload_response = await run_in_threadpool(
                lambda: supabase.storage
                    .from_("message")
                    .upload(file_path, file_content, {
                        "content-type": file.content_type
                    })
            )
            # Note: Supabase Python client raises exceptions on upload errors
            
            # Save attachment metadata to database
            attachment_id = str(uuid.uuid4())
            attachment_data = {
                "id": attachment_id,
                "group_id": group_id,
                "message_id": message_id,
                "uploader_id": current_user_id,
                "file_name": file.filename,
                "file_path": file_path,
                "file_type": file.content_type,
                "file_size": file_size
            }
            
            db_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_attachments")
                    .insert(attachment_data)
                    .execute()
            )
            
            if not db_response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save attachment metadata"
                )
            await detect_and_store_assignment(
                                            file_content=file_content,
                                            file_name=file.filename,
                                            group_id=group_id,
                                            user_id=current_user_id
                                        )
            asyncio.create_task(
                store_embedding(
                    text=f"File uploaded: {file.filename}",
                    metadata={
                        "attachment_id": attachment_id,
                        "group_id": group_id,
                        "type": "attachment"
                    }
                )
            )
            
            return db_response.data[0]

        except Exception as e:
            print(f"Upload error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def delete_group_message(message_id: str, user_id: str, group_id: str) -> dict:
        """Delete a group message (only if user is the sender)"""
        try:
            # Verify user is the sender and message belongs to group
            message = await run_in_threadpool(
                lambda: supabase.table("group_messeges")
                .select("*")
                .eq("id", message_id)
                .eq("sender_id", user_id)
                .eq("group_id", group_id)
                .execute()
            )
            
            if not message.data:
                raise HTTPException(403, "Not authorized to delete this message")
            
            # Delete the message
            await run_in_threadpool(
                lambda: supabase.table("group_messeges")
                .delete()
                .eq("id", message_id)
                .execute()
            )
            
            return {
                "success": True,
                "message": "Message deleted successfully",
                "message_id": message_id,
                "group_id": group_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting group message: {str(e)}")
            raise HTTPException(500, f"Failed to delete group message: {str(e)}")
    
    @staticmethod
    async def edit_group_message(message_id: str, user_id: str, group_id: str, new_content: str) -> dict:
        """Edit a group message (only if user is the sender)"""
        try:
            print(f"✏️ Editing message {message_id} in group {group_id}")
            
            # Verify user is the sender and message belongs to group
            message = await run_in_threadpool(
                lambda: supabase.table("group_messeges")
                .select("*")
                .eq("id", message_id)
                .eq("sender_id", user_id)
                .eq("group_id", group_id)
                .execute()
            )
            
            if not message.data:
                print(f"❌ User {user_id} not authorized to edit message {message_id}")
                raise HTTPException(403, "Not authorized to edit this message")
            
            # Update the message content
            response = await run_in_threadpool(
                lambda: supabase.table("group_messeges")
                .update({"content": new_content})
                .eq("id", message_id)
                .execute()
            )
            
            if not response.data:
                raise HTTPException(500, "Failed to update message")
            
            updated_message = response.data[0]
            print(f"✅ Message {message_id} updated successfully")
            
            return {
                "success": True,
                "message": "Message updated successfully",
                "updated_message": updated_message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error editing group message: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(500, f"Failed to edit group message: {str(e)}")
    
    @staticmethod
    async def update_group_details(group_id: str, user_id: str, updates: dict) -> dict:
        """Update group details (only if user is admin/creator)"""
        try:
            # Verify user is the creator (admin)
            group = await run_in_threadpool(
                lambda: supabase.table("chat_groups")
                .select("*")
                .eq("id", group_id)
                .execute()
            )
            
            if not group.data:
                raise HTTPException(404, "Group not found")
            
            if group.data[0]["creator_id"] != user_id:
                raise HTTPException(403, "Only admin can edit group details")
            
            # Prepare update data (only allow specific fields)
            update_data = {}
            if "name" in updates and updates["name"]:
                update_data["name"] = updates["name"]
            if "description" in updates:
                update_data["description"] = updates["description"]
            if "avatar_url" in updates:
                update_data["avatar_url"] = updates["avatar_url"]
            
            if not update_data:
                raise HTTPException(400, "No valid fields to update")
            
            from datetime import datetime, timezone
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update the group
            updated_group = await run_in_threadpool(
                lambda: supabase.table("chat_groups")
                .update(update_data)
                .eq("id", group_id)
                .execute()
            )
            
            if not updated_group.data:
                raise HTTPException(500, "Failed to update group")
            
            return {
                "success": True,
                "group": updated_group.data[0]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating group: {str(e)}")
            raise HTTPException(500, f"Failed to update group: {str(e)}")

    
    @staticmethod
    async def upload_group_avatar(group_id, user_id, file):
        """Upload group avatar (admin only)"""
        try:
            # Check if current user is admin
            admin_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("role")
                    .eq("group_id", group_id)
                    .eq("user_id", user_id)
                    .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Only admins can update group avatar"
                )
            
            # Validate file type (images only)
            allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400,
                    detail="Only image files are allowed for avatars"
                )
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Validate file size (2MB limit for avatars)
            max_size = 2 * 1024 * 1024  # 2MB
            if file_size > max_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"Avatar size exceeds maximum of {max_size / (1024*1024)}MB"
                )
            
            # Generate file path: group-avatars/{group_id}/avatar.{ext}
            import os
            file_ext = os.path.splitext(file.filename)[1]
            file_path = f"group-avatars/{group_id}/avatar{file_ext}"
            
            # Upload to Supabase Storage
            upload_response = await run_in_threadpool(
                lambda: supabase.storage
                    .from_("group-documents")
                    .upload(file_path, file_content, {
                        "content-type": file.content_type,
                        "upsert": "true"  # Overwrite existing avatar
                    })
            )
            # Note: Supabase Python client raises exceptions on upload errors
            
            # Get public URL
            avatar_url = supabase.storage.from_("group-documents").get_public_url(file_path)
            
            # Update group with new avatar_url
            response = await run_in_threadpool(
                lambda: supabase
                    .table("chat_groups")
                    .update({"avatar_url": avatar_url})
                    .eq("id", group_id)
                    .execute()
            )
            
            if not response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to update group avatar"
                )
            
            return response.data[0]
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Avatar upload error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def get_group_attachments(group_id, current_user_id):
        """Get all attachments in a group"""
        try:
            # Verify user is a member
            member_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("id")
                    .eq("group_id", group_id)
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=403,
                    detail="You must be a member to view attachments"
                )
            
            # Get attachments with user info
            response = await run_in_threadpool(
                lambda: supabase
                    .table("group_attachments_with_user")
                    .select("*")
                    .eq("group_id", group_id)
                    .order("created_at", desc=True)
                    .execute()
            )
            
            attachments = response.data or []
            
            return {
                "count": len(attachments),
                "attachments": attachments
            }

        except Exception as e:
            print(f"Get attachments error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def get_attachment_download_url(attachment_id, current_user_id):
        """Get a signed URL to download an attachment"""
        try:
            # Get attachment details
            attachment_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_attachments")
                    .select("*")
                    .eq("id", attachment_id)
                    .execute()
            )
            
            if not attachment_response.data:
                raise HTTPException(
                    status_code=404,
                    detail="Attachment not found"
                )
            
            attachment = attachment_response.data[0]
            
            # Verify user is a member of the group
            member_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("id")
                    .eq("group_id", attachment["group_id"])
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=403,
                    detail="You must be a member to download this file"
                )
            
            # Generate signed URL (expires in 1 hour)
            signed_url = await run_in_threadpool(
                lambda: supabase.storage
                    .from_("message")
                    .create_signed_url(attachment["file_path"], 3600)
            )
            
            if signed_url.get("error"):
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate download URL"
                )
            
            return {
                "file_name": attachment["file_name"],
                "download_url": signed_url["signedURL"],
                "expires_in": 3600
            }

        except Exception as e:
            print(f"Download URL error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def delete_attachment(attachment_id, current_user_id):
        """Delete an attachment (uploader or admin only)"""
        try:
            # Get attachment details
            attachment_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_attachments")
                    .select("*")
                    .eq("id", attachment_id)
                    .execute()
            )
            
            if not attachment_response.data:
                raise HTTPException(
                    status_code=404,
                    detail="Attachment not found"
                )
            
            attachment = attachment_response.data[0]
            
            # Check if user is uploader or admin
            is_uploader = attachment["uploader_id"] == current_user_id
            
            if not is_uploader:
                # Check if user is admin
                admin_check = await run_in_threadpool(
                    lambda: supabase
                        .table("group_members")
                        .select("role")
                        .eq("group_id", attachment["group_id"])
                        .eq("user_id", current_user_id)
                        .execute()
                )
                
                if not admin_check.data or admin_check.data[0].get("role") != "admin":
                    raise HTTPException(
                        status_code=403,
                        detail="Only the uploader or group admin can delete this file"
                    )
            
            # Delete from storage
            storage_response = await run_in_threadpool(
                lambda: supabase.storage
                    .from_("message")
                    .remove([attachment["file_path"]])
            )
            
            # Delete from database
            db_response = await run_in_threadpool(
                lambda: supabase
                    .table("group_attachments")
                    .delete()
                    .eq("id", attachment_id)
                    .execute()
            )
            
            return {"message": "Attachment deleted successfully"}

        except Exception as e:
            print(f"Delete attachment error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def get_available_users(group_id, current_user_id):
        """Get users that can be added to the group (not already members)"""
        try:
            # Verify current user is a member (and preferably admin)
            member_check = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("role")
                    .eq("group_id", group_id)
                    .eq("user_id", current_user_id)
                    .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=403,
                    detail="You must be a member to view available users"
                )
            
            # Get existing member user IDs
            existing_members = await run_in_threadpool(
                lambda: supabase
                    .table("group_members")
                    .select("user_id")
                    .eq("group_id", group_id)
                    .execute()
            )
            
            existing_user_ids = [m["user_id"] for m in existing_members.data]
            
            # Get all users
            all_users = await run_in_threadpool(
                lambda: supabase
                    .table("profiles")  # Fixed: table name is profiles, not user_profiles
                    .select("id, username, full_name, avatar_url")  # Fixed: column is id, not user_id
                    .execute()
            )
            
            # Filter out existing members
            available_users = [
                {
                    "user_id": user["id"],  # Map id to user_id for consistency
                    "username": user.get("username"),
                    "full_name": user.get("full_name"),
                    "avatar_url": user.get("avatar_url")
                }
                for user in all_users.data
                if user["id"] not in existing_user_ids  # Compare with id field
            ]
            
            return {
                "count": len(available_users),
                "users": available_users
            }

        except Exception as e:
            print(f"Get available users error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
  
            

