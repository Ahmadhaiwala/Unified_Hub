from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.security import get_current_user
from app.schemas.chatgroups import (
    ChatGroupCreate, ChatGroupOut, ChatGroupListOut,
    ChatGroupUpdate, GroupMessegeCreate, GroupMessegeOut,
    GroupMesegeListOut, GroupMemberAdd, MemberListOut,
    GroupAttachmentOut, GroupAttachmentListOut, AvailableUsersListOut
)
from app.services.chatgroupservices import ChatGroupService
from typing import List

router = APIRouter()



@router.post("/chatgroups", response_model=ChatGroupOut)
async def create_group(
    group_data: ChatGroupCreate,
    current_user=Depends(get_current_user)
):
    """
    Create a new chat group
    """
    return await ChatGroupService.create_chat_group(
        group_data, 
        current_user.id
    )

@router.get("/chatgroups", response_model=ChatGroupListOut)
async def get_user_groups(current_user=Depends(get_current_user)):
    """
    Get all chat groups the current user is a member of
    """
    print("Fetching chat groups for user:", current_user.id)
    return await ChatGroupService.get_user_conversations(current_user.id)

@router.get("/chatgroups/{group_id}", response_model=ChatGroupOut)
async def get_group_details(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get details of a specific chat group
    """
    return await ChatGroupService.get_group_details(group_id, current_user.id)

@router.put("/chatgroups/{group_id}")
async def update_group(
    group_id: str,
    update_data: ChatGroupUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update chat group name/description/avatar (admin only)
    """
    return await ChatGroupService.update_group_details(
        group_id, 
        current_user.id, 
        update_data.dict(exclude_unset=True)
    )

@router.delete("/chatgroups/{group_id}")
async def delete_group(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete a chat group (admin only)
    """
    await ChatGroupService.delete_group(group_id, current_user.id)
    return {"message": "Group deleted successfully"}

# ===== MEMBER MANAGEMENT =====

@router.get("/chatgroups/{group_id}/members", response_model=MemberListOut)
async def get_group_members(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get all members of a chat group with user details
    """
    return await ChatGroupService.get_group_members(group_id, current_user.id)

@router.get("/chatgroups/{group_id}/available-users", response_model=AvailableUsersListOut)
async def get_available_users(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get users that can be added to the group
    """
    return await ChatGroupService.get_available_users(group_id, current_user.id)

@router.post("/chatgroups/{group_id}/members")
async def add_members(
    group_id: str,
    member_data: GroupMemberAdd,
    current_user=Depends(get_current_user)
):
    """
    Add members to a chat group (admin only)
    """
    return await ChatGroupService.add_members(
        group_id, 
        current_user.id, 
        member_data.user_ids
    )

@router.delete("/chatgroups/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    current_user=Depends(get_current_user)
):
    """
    Remove a member from a chat group (admin only)
    """
    await ChatGroupService.remove_member(group_id, current_user.id, user_id)
    return {"message": "Member removed successfully"}

@router.post("/chatgroups/{group_id}/leave")
async def leave_group(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    Leave a chat group
    """
    await ChatGroupService.leave_group(group_id, current_user.id)
    return {"message": "Left group successfully"}

@router.patch("/chatgroups/{group_id}/members/{user_id}/role")
async def update_member_role(
    group_id: str,
    user_id: str,
    role_data: dict,
    current_user=Depends(get_current_user)
):
    """
    Update a member's role (admin only)
    """
    new_role = role_data.get("role")
    if new_role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'member'")
    
    return await ChatGroupService.update_member_role(
        group_id, 
        current_user.id, 
        user_id,
        new_role
    )

# ===== MESSAGING =====

@router.get("/chatgroups/{group_id}/messages", response_model=GroupMesegeListOut)
async def get_group_messages(
    group_id: str,
    current_user=Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """
    Get messages from a chat group
    """
    return await ChatGroupService.get_group_messages(
        group_id, 
        current_user.id, 
        limit, 
        offset
    )

@router.post("/chatgroups/{group_id}/messages", response_model=GroupMessegeOut)
async def send_group_message(
    group_id: str,
    message_data: GroupMessegeCreate,
    current_user=Depends(get_current_user)
):
    """
    Send a message to a chat group
    """
    return await ChatGroupService.send_group_message(
        group_id, 
        current_user.id, 
        message_data.content
    )

@router.delete("/chatgroups/{group_id}/messages/{message_id}")
async def delete_message(
    group_id: str,
    message_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete a message (sender only)
    """
    return await ChatGroupService.delete_group_message(
        message_id,
        current_user.id,
        group_id
    )

@router.put("/chatgroups/{group_id}/messages/{message_id}")
async def edit_message(
    group_id: str,
    message_id: str,
    message_data: GroupMessegeCreate,
    current_user=Depends(get_current_user)
):
    """
    Edit a message (sender only)
    """
    return await ChatGroupService.edit_group_message(
        message_id,
        current_user.id,
        group_id,
        message_data.content
    )



@router.post("/chatgroups/{group_id}/attachments", response_model=GroupAttachmentOut)
async def upload_attachment(
    group_id: str,
    file: UploadFile = File(...),
    message_id: str = None,
    current_user=Depends(get_current_user)
):
    """
    Upload a file/document to a group chat
    """
    return await ChatGroupService.upload_document(
        group_id,
        current_user.id,
        file,
        message_id
    )

@router.get("/chatgroups/{group_id}/attachments", response_model=GroupAttachmentListOut)
async def get_group_attachments(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get all attachments in a group
    """
    return await ChatGroupService.get_group_attachments(group_id, current_user.id)

@router.get("/chatgroups/{group_id}/attachments/{attachment_id}")
async def get_attachment_download_url(
    group_id: str,
    attachment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a signed URL to download an attachment
    """
    return await ChatGroupService.get_attachment_download_url(attachment_id, current_user.id)

@router.delete("/chatgroups/{group_id}/attachments/{attachment_id}")
async def delete_attachment(
    group_id: str,
    attachment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete an attachment (uploader or admin only)
    """
    await ChatGroupService.delete_attachment(attachment_id, current_user.id)
    return {"message": "Attachment deleted successfully"}

@router.post("/chatgroups/{group_id}/avatar", response_model=ChatGroupOut)
async def upload_group_avatar(
    group_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    """
    Upload group avatar (admin only)
    """
    return await ChatGroupService.upload_group_avatar(group_id, current_user.id, file)

