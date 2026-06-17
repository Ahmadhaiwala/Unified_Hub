# 🚀 UnifiedHub - Complete Full-Stack Chat & AI System

A modern chat application with AI integration, document processing, and real-time messaging capabilities.

## ✨ Features

- **Real-time Chat**: WebSocket-based instant messaging
- **AI Chat Integration**: Contextual AI responses with document understanding  
- **Document Processing**: PDF text extraction and embedding
- **Group Chat**: Multi-user chat rooms with file sharing
- **Vector Embeddings**: Semantic search and memory system
- **User Management**: Authentication and profile system

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI** web framework with async support
- **Supabase** for database and file storage
- **LanceDB** for vector embeddings storage
- **SentenceTransformers** for AI embeddings
- **OpenRouter API** for AI chat responses
- **PyPDF2** for document text extraction

### Frontend (React)
- **React 19** with modern hooks
- **Tailwind CSS** for styling
- **Supabase Client** for real-time features
- **Axios** for API communication

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account

### Backend Setup

1. **Clone and navigate to backend**
```bash
cd backend
```

2. **Create environment file**
```bash
cp .env.example .env
```

3. **Configure your `.env` file**
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
OPEN_ROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key
```

4. **Install dependencies**
```bash
pip install -r requirements.txt
pip install supabase lancedb sentence-transformers pyarrow PyPDF2
```

5. **Start the backend (Fast Mode)**
```bash
python start_fast.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend**
```bash
cd frontend  
```

2. **Configure environment**
```bash
# Edit .env file with your Supabase credentials
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

3. **Install and start**
```bash
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

## ⚡ Performance Optimizations

### Fast Startup (1-2 seconds)
The backend uses lazy loading for AI models:
- API server starts immediately
- AI models load only when first needed  
- 90% faster than previous versions

### Development vs Production
```bash
# Development (with auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Fast startup (optimized)  
python start_fast.py

# Production
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 📄 Document Processing Flow

1. **Upload**: Files stored in Supabase storage
2. **Extraction**: PDF text extracted using PyPDF2
3. **Embeddings**: Text converted to 384-dim vectors
4. **Storage**: Vectors stored in LanceDB
5. **Chat Integration**: Document content injected into AI context

## 🧠 AI Memory System

- **Model**: SentenceTransformer (all-MiniLM-L6-v2)
- **Dimensions**: 384D vectors
- **Storage**: LanceDB vector database
- **Search**: Cosine similarity for semantic search
- **Context**: Automatic document context injection

## 🛠️ API Endpoints

### Core Endpoints
- `GET /` - Health check
- `GET /docs` - Interactive API documentation

### AI Chat
- `POST /api/ai/chat` - Standard AI chat
- `POST /api/ai/chat/stream` - Streaming responses
- `GET /api/ai/chat/history` - Chat history

### Real-time Chat  
- `WebSocket /api/chat/ws/{token}` - Real-time messaging
- `GET /api/chat/conversations` - User conversations
- `POST /api/chat/conversations/{friend_id}` - Start conversation

## 🔧 Configuration

### Environment Variables
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPEN_ROUTER_API_KEY=your_openrouter_key

# Performance (optional)
HF_HUB_DISABLE_SYMLINKS_WARNING=1
TOKENIZERS_PARALLELISM=false
OMP_NUM_THREADS=1
```

## 📊 Database Schema

### Key Tables
- `profiles` - User profiles
- `conversations` - Chat conversations  
- `messages` - Chat messages
- `group_messeges` - Group chat messages
- `group_attachments` - File attachments
- `ai_chat_history` - AI conversation history

### Vector Storage
- `memory` - LanceDB table for embeddings

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check if backend is running
curl http://localhost:8000/

# View logs
python start_fast.py

# Test AI memory system
python -c "from app.core.ai_memory import MEMORY_ENABLED; print(f'Memory: {MEMORY_ENABLED}')"
```

### Common Issues
1. **Slow startup**: Use `python start_fast.py` instead of uvicorn directly
2. **Import errors**: Install missing dependencies with pip
3. **Memory errors**: AI models load ~90MB, ensure sufficient RAM

## 📝 Development Notes

### Project Structure
```
backend/
├── app/
│   ├── api/         # API endpoints
│   ├── core/        # Core functionality
│   ├── services/    # Business logic  
│   └── schemas/     # Data models
├── memory_db/       # Vector database
└── start_fast.py    # Optimized startup

frontend/
├── src/
│   ├── components/  # React components
│   ├── pages/       # Page components
│   └── services/    # API services
└── public/          # Static assets
```

### Key Features
- **Lazy Loading**: AI models load on demand
- **Async Processing**: Non-blocking embedding generation
- **Error Handling**: Graceful degradation for AI failures
- **Security**: API key protection and validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly  
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using FastAPI, React, and modern AI technologies**