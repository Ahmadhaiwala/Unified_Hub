from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.chatgroups import ChatGroupListOut, ChatGroupOut
from app.services.chatgroupservices import ChatGroupService

router = APIRouter()
@router.get("/chatgroups", response_model=ChatGroupListOut)
async def getchats(current_user=Depends(get_current_user)):
    """
    Get the current user's chat groups from the chatgroups table
    """
    print("Fetching chat groups for user:", current_user.id)
   
    return await ChatGroupService.get_user_conversations(current_user.id)
