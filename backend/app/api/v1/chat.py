from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.security import get_current_user
from app.core.supabase import supabase
from app.schemas.chat import MessageCreate, Message, ConversationListOut, ConversationDetail, MessageUpdateRequest
from app.services.chatservices import ChatService
from app.services.chatgroupservices import ChatGroupService
from typing import List, Dict, Set
import json

router = APIRouter()

# Store active WebSocket connections don't edit 
class ConnectionManager:
    def __init__(self):
        # Map of user_id -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        # Map of group_id -> set of user_ids subscribed to that group
        self.group_subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            # Remove from all group subscriptions
            for group_id in list(self.group_subscriptions.keys()):
                if user_id in self.group_subscriptions[group_id]:
                    self.group_subscriptions[group_id].remove(user_id)
                    if not self.group_subscriptions[group_id]:
                        del self.group_subscriptions[group_id]
            print(f"User {user_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                print(f"Error sending message to {user_id}: {e}")
    
    # Group chat methods
    def subscribe_to_group(self, user_id: str, group_id: str):
        """Subscribe a user to a group for real-time updates"""
        if group_id not in self.group_subscriptions:
            self.group_subscriptions[group_id] = set()
        self.group_subscriptions[group_id].add(user_id)
        print(f"User {user_id} subscribed to group {group_id}. Total subscribers: {len(self.group_subscriptions[group_id])}")
    
    def unsubscribe_from_group(self, user_id: str, group_id: str):
        """Unsubscribe a user from a group"""
        if group_id in self.group_subscriptions:
            self.group_subscriptions[group_id].discard(user_id)
            if not self.group_subscriptions[group_id]:
                del self.group_subscriptions[group_id]
            print(f"User {user_id} unsubscribed from group {group_id}")
    
    async def send_group_message(self, message: dict, group_id: str):
        """Send message to all users subscribed to a group"""
        if group_id in self.group_subscriptions:
            subscribers = self.group_subscriptions[group_id].copy()
            print(f"Broadcasting to {len(subscribers)} subscribers in group {group_id}")
            for user_id in subscribers:
                await self.send_personal_message(message, user_id)

manager = ConnectionManager()

@router.websocket("/ws/chat/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time chat"""
    
    
    # Verify token and get user
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            await websocket.close(code=1008)
            return
        user_id = user_response.user.id
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        await websocket.close(code=1008)
        return
    
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            action = data.get("action")
            
            if action == "send_message":
                conversation_id = data.get("conversation_id")
                content = data.get("content")
                
                # Save message to database
                message = await ChatService.send_message(conversation_id, user_id, content)
                
                # Get the other participant
                conversation = await ChatService.get_conversation_details(conversation_id, user_id)
                other_user_id = (
                    conversation["participant2_id"] 
                    if conversation["participant1_id"] == user_id 
                    else conversation["participant1_id"]
                )
                
                # Send to both users
                message_data = {
                    "type": "new_message",
                    "message": {
                        "id": str(message.id),
                        "conversation_id": str(message.conversation_id),
                        "sender_id": str(message.sender_id),
                        "content": message.content,
                        "created_at": message.created_at.isoformat(),
                        "read_at": message.read_at.isoformat() if message.read_at else None
                    }
                }
                
                
                await manager.send_personal_message(message_data, user_id)
                
                
                await manager.send_personal_message(message_data, str(other_user_id))
            
            elif action == "mark_read":
                conversation_id = data.get("conversation_id")
                await ChatService.mark_messages_as_read(conversation_id, user_id)
            
            # Group chat actions
            elif action == "join_group":
                # Subscribe to group messages
                group_id = data.get("group_id")
                manager.subscribe_to_group(user_id, group_id)
                await manager.send_personal_message({
                    "type": "group_joined",
                    "group_id": group_id
                }, user_id)
            
            elif action == "leave_group":
                # Unsubscribe from group messages
                group_id = data.get("group_id")
                manager.unsubscribe_from_group(user_id, group_id)
                await manager.send_personal_message({
                    "type": "group_left",
                    "group_id": group_id
                }, user_id)
            
            elif action == "send_group_message":
                group_id = data.get("group_id")
                content = data.get("content")
                attachment_id = data.get("attachment_id")  # Get attachment_id if present
                
                try:
                    # Save message to database
                    message = await ChatGroupService.send_group_message(group_id, user_id, content)
                    
                    # If attachment_id is provided, link it to this message
                    if attachment_id:
                        try:
                            supabase.table("group_attachments").update({
                                "message_id": str(message["id"])
                            }).eq("id", attachment_id).execute()
                            
                            # Fetch attachment data to include in broadcast
                            attachment_response = supabase.table("group_attachments").select(
                                "id, file_name, file_type, file_size, uploader_id, created_at, file_path"
                            ).eq("id", attachment_id).execute()
                            
                            if attachment_response.data and len(attachment_response.data) > 0:
                                attachment = attachment_response.data[0]
                                
                                # Generate file URL
                                bucket_name = "message"
                                file_path = attachment.get("file_path")
                                if file_path:
                                    public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
                                    attachment["file_url"] = public_url
                                    print("Generated file URL (WebSocket):", public_url)
                                
                                # Get uploader username
                                uploader_response = supabase.table("profiles").select(
                                    "username"
                                ).eq("id", attachment["uploader_id"]).execute()
                                
                                if uploader_response.data and len(uploader_response.data) > 0:
                                    attachment["uploader_username"] = uploader_response.data[0].get("username")
                                
                                # Add attachment to message
                                message["attachment"] = attachment
                        except Exception as e:
                            print(f"Error linking attachment: {e}")
                    
                    # Broadcast to all group members
                    message_data = {
                        "type": "new_group_message",
                        "message": {
                            "id": str(message["id"]),
                            "group_id": str(message["group_id"]),
                            "sender_id": str(message["sender_id"]),
                            "content": message["content"],
                            "created_at": message["created_at"],
                            "attachment": message.get("attachment")  # Include attachment if present
                        }
                    }
                    
                    # Send to all subscribed members
                    await manager.send_group_message(message_data, group_id)
                except Exception as e:
                    print(f"Error sending group message: {e}")
                    import traceback
                    traceback.print_exc()
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Failed to send message: {str(e)}"
                    }, user_id)
            
            elif action == "typing_in_group":
                # Broadcast typing indicator to group
                group_id = data.get("group_id")
                typing_data = {
                    "type": "user_typing",
                    "group_id": group_id,
                    "user_id": user_id
                }
                await manager.send_group_message(typing_data, group_id)
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(user_id)

@router.get("/chat/conversations", response_model=ConversationListOut)
async def get_conversations(current_user=Depends(get_current_user)):
    
    return await ChatService.get_user_conversations(current_user.id)

@router.post("/chat/conversations/{friend_id}", response_model=ConversationDetail)
async def start_conversation(friend_id: str, current_user=Depends(get_current_user)):
    """Start or get existing conversation with a friend"""
    return await ChatService.get_or_create_conversation(current_user.id, friend_id)

@router.get("/chat/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str, 
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get messages in a conversation with pagination"""
    return await ChatService.get_conversation_messages(conversation_id, current_user.id, limit, offset)

@router.get("/chat/conversations/{conversation_id}/title")
async def get_conversation_title(conversation_id: str, current_user=Depends(get_current_user)):
    """Get conversation title (friend name) for caching"""
    try:
        conversation = await ChatService.get_conversation_details(conversation_id, current_user.id)
        
        # Get the other participant
        other_user_id = (
            conversation["participant2_id"] 
            if conversation["participant1_id"] == current_user.id 
            else conversation["participant1_id"]
        )
        
        # Get other user's profile
        from app.core.supabase import supabase
        profile = (
            supabase.table("profiles")
            .select("username")
            .eq("id", other_user_id)
            .execute()
        ).data
        
        if not profile_data:
            raise HTTPException(404, "Participant not found")
        
        return ConversationTitle(
            conversation_id=conversation_id,
            title=profile_data[0]["username"] if profile_data else "Unknown",
            type="direct"
        )
    except Exception as e:
        print(f"Error getting conversation title: {str(e)}")
        raise HTTPException(500, f"Failed to get conversation title: {str(e)}")

@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user=Depends(get_current_user)):
    """Delete entire conversation and all its messages"""
    return await ChatService.delete_conversation(conversation_id, current_user.id)

@router.delete("/chat/messages/{message_id}")
async def delete_message(message_id: str, current_user=Depends(get_current_user)):
    """Delete a specific message (only if user is sender)"""
    return await ChatService.delete_message(message_id, current_user.id)

@router.put("/chat/messages/{message_id}")
async def update_message(
    message_id: str,
    request: MessageUpdateRequest,
    current_user=Depends(get_current_user)
):
    """Update/edit a message (only if user is sender)"""
    return await ChatService.update_message(message_id, current_user.id, request.content)


@router.post("/chat/conversations/{conversation_id}/messages", response_model=Message)
async def send_message(
    conversation_id: str, 
    message: MessageCreate,
    current_user=Depends(get_current_user)
):
    """Send a message in a conversation"""
    return await ChatService.send_message(conversation_id, current_user.id, message.content)

@router.put("/chat/conversations/{conversation_id}/read")
async def mark_as_read(conversation_id: str, current_user=Depends(get_current_user)):
    """Mark all messages in a conversation as read"""
    await ChatService.mark_messages_as_read(conversation_id, current_user.id)
    return {"message": "Messages marked as read"}
