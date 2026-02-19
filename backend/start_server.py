import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Unified Hub Backend...")
    print("📍 API documentation: http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to stop the server\n")
    
    uvicorn.run(
        "app.main:app",
        
        host="127.0.0.1",
        port=8000,
        reload=True
    )
