"""
AI Chat API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.ai_chat_service import ai_chat_service
from app.services.code_executor import code_executor
from typing import Optional

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    group_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    error: bool

class CodeExecuteRequest(BaseModel):
    code: str
    language: Optional[str] = None

class CodeExecuteResponse(BaseModel):
    success: bool
    output: str
    error: str
    language: Optional[str]
    execution_time: float

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user = Depends(get_current_user)
):
    """
    Send a message to the AI assistant and get a response
    """
    try:
        user_id = current_user.id
        
        result = await ai_chat_service.chat(
            user_id=user_id,
            message=request.message,
            group_id=request.group_id
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        print(f"AI Chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process AI chat: {str(e)}"
        )

@router.post("/chat/stream")
async def stream_chat_with_ai(
    request: ChatRequest,
    current_user = Depends(get_current_user)
):
    """
    Stream AI responses in real-time using Server-Sent Events
    """
    import json
    from fastapi.responses import StreamingResponse
    
    async def event_generator():
        try:
            user_id = current_user.id
            
            async for chunk in ai_chat_service.chat_stream(
                user_id=user_id,
                message=request.message,
                group_id=request.group_id
            ):
                # Format as Server-Sent Event
                yield f"data: {json.dumps(chunk)}\n\n"
                
        except Exception as e:
            print(f"Stream error: {str(e)}")
            error_chunk = {
                "content": f"Stream error: {str(e)}",
                "done": True,
                "error": True
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/chat/history")
async def get_chat_history(
    limit: int = 20,
    group_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get AI chat history for the current user, optionally filtered by group
    """
    try:
        user_id = current_user.id
        
        # Get history from service with optional group_id filter
        history = await ai_chat_service._get_conversation_history(user_id, limit, group_id)
        
        return {
            "count": len(history),
            "messages": history
        }
        
    except Exception as e:
        print(f"Get history error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch chat history: {str(e)}"
        )

@router.post("/execute-code", response_model=CodeExecuteResponse)
async def execute_code(
    request: CodeExecuteRequest,
    current_user = Depends(get_current_user)
):
    """
    Execute code snippet and return output
    
    Supports Python and JavaScript (Node.js required)
    """
    try:
        print(f"🔧 Executing code for user {current_user.id}")
        print(f"   Language: {request.language or 'auto-detect'}")
        print(f"   Code length: {len(request.code)} characters")
        
        result = code_executor.execute_code(
            code=request.code,
            language=request.language
        )
        
        print(f"   Result: {'✅ Success' if result['success'] else '❌ Error'}")
        print(f"   Execution time: {result['execution_time']}s")
        
        return CodeExecuteResponse(**result)
        
    except Exception as e:
        print(f"Code execution error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute code: {str(e)}"
        )
