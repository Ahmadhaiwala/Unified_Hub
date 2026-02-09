from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.profile import router as profile_router
from app.api.v1.chatgroups import router as chatgroup_router
from app.api.v1.friends import router as friend_router
from app.api.v1.users import router as users_router
from app.api.v1.chat import router as chat_router
from app.api.v1.chatgroups import router as chatgroup_router
from app.api.v1.ai_chat import router as ai_chat_router
from app.api.v1.reminders import router as reminders_router
from app.api.v1.question_sheets import router as question_sheets_router
from app.api.v1.notifications import router as notifications_router
app = FastAPI(title="Unified Hub Backend 🚀")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)   
app.include_router(friend_router, prefix="/api", tags=["friends"])
app.include_router(users_router, prefix="/api", tags=["users"])
app.include_router(profile_router, prefix="/api", tags=["profile"])
app.include_router(chatgroup_router, prefix="/api", tags=["chatgroups"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(ai_chat_router, prefix="/api/ai", tags=["ai-chat"])
app.include_router(reminders_router, prefix="/api", tags=["reminders"])
app.include_router(question_sheets_router, prefix="/api", tags=["question-sheets"])
app.include_router(notifications_router, prefix="/api", tags=["notifications"])
@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Backend is alive ⚡"
    }
