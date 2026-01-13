from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.profile import router as profile_router
from app.api.v1.chatgroups import router as chatgroups_router

app = FastAPI(title="Unified Hub Backend 🚀")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(profile_router, prefix="/api", tags=["profile"])
app.include_router(chatgroups_router, prefix="/api", tags=["chatgroups"])


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Backend is alive ⚡"
    }
