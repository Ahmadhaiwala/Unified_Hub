"""
Embedding Service for Intelligent Assignment System
Generates embeddings using OpenRouter/OpenAI API and stores them in Supabase (pgvector).
"""

import os
import requests
import asyncio
from typing import List, Dict, Optional
from app.core.supabase import supabase

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings"
local_cache = {}

async def generate_embedding(text: str, model: str = "openai/text-embedding-3-small") -> Optional[List[float]]:
    """
    Generates vector embedding for text using OpenRouter API.
    """
    if not text:
        return None
        
    # Check cache first
    if text in local_cache:
        return local_cache[text]

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://assignment-system.local", # OpenRouter requirement
        "X-Title": "Assignment System"
    }
    
    payload = {
        "model": model,
        "input": text
    }
    
    try:
        response = requests.post(OPENROUTER_EMBEDDING_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # OpenRouter/OpenAI response format:
        # { "data": [ { "embedding": [...] } ] }
        embedding = data['data'][0]['embedding']
        
        # Simple in-memory cache
        if len(local_cache) > 1000:
            local_cache.clear()
        local_cache[text] = embedding
        
        return embedding
        
    except Exception as e:
        print(f"⚠️ Embedding generation error: {e}")
        return None

async def store_question_embeddings(assignment_id: str, questions: List[Dict]):
    """
    Generates and stores embeddings for a list of questions.
    Run this as a background task.
    
    Args:
        assignment_id: ID of the assignment
        questions: List of dicts with 'id' and 'question_text'
    """
    print(f"🔄 Generating embeddings for {len(questions)} questions...")
    
    tasks = []
    
    async def process_question(q):
        text = q.get('question_text')
        question_id = q.get('id')
        
        if not text or not question_id:
            return
            
        embedding = await generate_embedding(text)
        
        if embedding:
            # Store in question_embeddings table
            data = {
                "question_id": question_id,
                "assignment_id": assignment_id,
                "embedding": embedding,
                "model": "openai/text-embedding-3-small"
            }
            
            try:
                supabase.table("question_embeddings").insert(data).execute()
                print(f"✅ Stored embedding for Q: {text[:20]}...")
            except Exception as e:
                print(f"❌ DB Error storing embedding: {e}")
                
    # Create tasks for all questions
    # Limit concurrency to avoid rate limits
    chunk_size = 5
    for i in range(0, len(questions), chunk_size):
        chunk = questions[i:i+chunk_size]
        await asyncio.gather(*[process_question(q) for q in chunk])
        
    print(f"✨ Finished storing embeddings for assignment {assignment_id}")
