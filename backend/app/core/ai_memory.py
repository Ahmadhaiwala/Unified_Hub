"""
AI Memory Service using Vector Embeddings with LanceDB
"""
from typing import Dict, Optional, List
import lancedb
from sentence_transformers import SentenceTransformer
import json
from datetime import datetime
import uuid

# Initialize LanceDB connection and model
try:
    db = lancedb.connect("./memory_db")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # Get or create memory table
    if "memory" not in db.table_names():
        # Create schema and table if it doesn't exist
        import pyarrow as pa
        schema = pa.schema([
            ("id", pa.string()),
            ("text", pa.string()),
            ("vector", pa.list_(pa.float32(), 384)),
            ("timestamp", pa.string()),
            ("metadata", pa.string())
        ])
        db.create_table("memory", schema=schema)
    
    memory_table = db.open_table("memory")
    MEMORY_ENABLED = True
except Exception as e:
    print(f"⚠️ Memory DB initialization failed: {str(e)}")
    print("Memory storage will be disabled")
    MEMORY_ENABLED = False
    memory_table = None

async def store_embedding(text: str, metadata: Optional[Dict] = None):
    """
    Store text embeddings for semantic search and AI memory (non-blocking)
    
    Args:
        text: Text to create embedding from
        metadata: Additional metadata to store with the embedding
    """
    if not MEMORY_ENABLED:
        return
        
    try:
        # Import here to avoid circular dependencies
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        # Run embedding generation in thread pool to not block
        def _generate_and_store():
            try:
                # Generate embedding (CPU-intensive, runs in thread)
                embedding = model.encode(text).tolist()
                
                # Create record
                record = {
                    "id": str(uuid.uuid4()),
                    "text": text,
                    "vector": embedding,
                    "timestamp": datetime.now().isoformat(),
                    "metadata": json.dumps(metadata) if metadata else "{}"
                }
                
                # Store in LanceDB
                memory_table.add([record])
                
                print(f"🧠 Stored: {text[:30]}... | {metadata}")
            except Exception as e:
                print(f"⚠️ Memory store error: {str(e)}")
        
        # Execute in thread pool without blocking
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, _generate_and_store)
        
    except Exception as e:
        # Silently fail - memory storage shouldn't break main flow
        pass

async def search_similar(query: str, limit: int = 5, filter_metadata: Optional[Dict] = None) -> List[Dict]:
    """
    Search for similar content using embeddings
    
    Args:
        query: Search query
        limit: Maximum number of results
        filter_metadata: Optional metadata filters (e.g., {"group_id": "123"})
        
    Returns:
        List of similar items with text and metadata
    """
    if not MEMORY_ENABLED:
        print(f"🔍 Memory disabled - would search: {query}")
        return []
        
    try:
        # Generate query embedding
        query_embedding = model.encode(query).tolist()
        
        # Search in LanceDB
        results = memory_table.search(query_embedding).limit(limit).to_list()
        
        # Parse and format results
        formatted_results = []
        for result in results:
            metadata = json.loads(result.get("metadata", "{}"))
            
            # Apply metadata filter if provided
            if filter_metadata:
                if all(metadata.get(k) == v for k, v in filter_metadata.items()):
                    formatted_results.append({
                        "text": result["text"],
                        "metadata": metadata,
                        "timestamp": result["timestamp"],
                        "score": result.get("_distance", 0)
                    })
            else:
                formatted_results.append({
                    "text": result["text"],
                    "metadata": metadata,
                    "timestamp": result["timestamp"],
                    "score": result.get("_distance", 0)
                })
        
        print(f"🔍 Found {len(formatted_results)} results for: {query}")
        return formatted_results
        
    except Exception as e:
        print(f"Error searching embeddings: {str(e)}")
        return []
