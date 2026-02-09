# AI Chat and Answer Linking Setup Guide

## Prerequisites
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))
- Python 3.8+
- Node.js and npm

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install google-generativeai
```

### 2. Configure API Key
Add your Gemini API key to `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Database Migration
Execute the SQL migration file in your Supabase SQL editor:
```
backend/migrations/002_ai_chat_history.sql
```

This creates:
- `ai_chat_history` - Stores AI conversation history
- `assignment_answers` - Links student answers to assignments

### 4. Restart Backend Server
```bash
cd backend
python start_server.py
```

## Frontend Setup

No additional setup required! The AI Chat tab is now available in the Chat page.

## Usage

### AI Chat
1. Navigate to the Chat page
2. Click on the "🤖 AI Assistant" tab
3. Start chatting with the AI

The AI will:
- Remember conversation context (last 10 messages)
- Have awareness of group context if applicable
- Provide helpful responses based on your questions

### Answer Linking
Answer linking works automatically when students post messages in group chats. The system:
1. Detects if a message is an answer to an assignment
2. Uses AI to evaluate relevance
3. Links the answer to the assignment in the database

## API Endpoints

### AI Chat
- **POST** `/api/ai/chat` - Send message to AI
  ```json
  {
    "message": "Hello, how can you help me?",
    "group_id": "optional-group-id"
  }
  ```

- **GET** `/api/ai/chat/history?limit=20` - Get conversation history

## Features

✅ Conversational AI powered by Google Gemini  
✅ Context-aware responses  
✅ Conversation history persistence  
✅ Group context integration  
✅ Beautiful, themable UI  
✅ Error handling and loading states  
✅ Auto-scroll to latest messages  

## Troubleshooting

### AI not responding
- Check that `GEMINI_API_KEY` is set in `.env`
- Verify the API key is valid
- Check backend logs for errors

### Database errors
- Ensure migration `002_ai_chat_history.sql` was run successfully
- Check Supabase dashboard for table creation

### Frontend not loading
- Clear browser cache
- Restart the frontend dev server
- Check browser console for errors

## Security

- All API endpoints are protected with JWT authentication
- Row Level Security (RLS) ensures users can only access their own chat history
- API keys are stored securely in environment variables
