#!/usr/bin/env python3
"""
Analyze and optimize backend startup performance
"""
import time
import sys
from pathlib import Path

def analyze_startup_bottlenecks():
    """Analyze what's causing slow startup times"""
    print("🔍 BACKEND STARTUP PERFORMANCE ANALYSIS")
    print("=" * 60)
    
    print("⏱️  Timing Analysis:")
    
    # Time Python imports
    print("\n1. Testing import times...")
    
    modules_to_test = [
        "fastapi",
        "uvicorn", 
        "supabase",
        "sentence_transformers",
        "lancedb",
        "torch",
        "transformers",
        "PyPDF2"
    ]
    
    for module in modules_to_test:
        start_time = time.time()
        try:
            exec(f"import {module}")
            import_time = time.time() - start_time
            print(f"   {module:20}: {import_time:.3f}s")
        except ImportError as e:
            print(f"   {module:20}: FAILED ({e})")
    
    # Time AI model loading
    print("\n2. Testing AI model initialization...")
    
    start_time = time.time()
    try:
        from sentence_transformers import SentenceTransformer
        model_load_time = time.time() - start_time
        print(f"   SentenceTransformer import: {model_load_time:.3f}s")
        
        start_time = time.time()
        model = SentenceTransformer("all-MiniLM-L6-v2")
        model_init_time = time.time() - start_time
        print(f"   Model loading: {model_init_time:.3f}s")
        
        # Test encoding speed
        start_time = time.time()
        embedding = model.encode("test sentence")
        encoding_time = time.time() - start_time
        print(f"   First encoding: {encoding_time:.3f}s")
        
    except Exception as e:
        print(f"   AI model test failed: {e}")
    
    # Time database connections
    print("\n3. Testing database connections...")
    
    try:
        start_time = time.time()
        import lancedb
        db = lancedb.connect("./memory_db")
        lance_time = time.time() - start_time
        print(f"   LanceDB connection: {lance_time:.3f}s")
    except Exception as e:
        print(f"   LanceDB test failed: {e}")
    
    try:
        start_time = time.time()
        sys.path.append("app")
        from core.supabase import supabase
        supabase_time = time.time() - start_time
        print(f"   Supabase connection: {supabase_time:.3f}s")
    except Exception as e:
        print(f"   Supabase test failed: {e}")

def recommend_optimizations():
    """Provide optimization recommendations"""
    print(f"\n🚀 OPTIMIZATION RECOMMENDATIONS")
    print("=" * 60)
    
    print("1. Lazy Loading Strategy:")
    print("   - Load AI models only when first needed")
    print("   - Use background threads for model initialization") 
    print("   - Cache loaded models in memory")
    
    print(f"\n2. Environment Variables:")
    print("   - Set HF_HUB_DISABLE_SYMLINKS_WARNING=1")
    print("   - Set TOKENIZERS_PARALLELISM=false")
    print("   - Set OMP_NUM_THREADS=1 for CPU optimization")
    
    print(f"\n3. Model Optimization:")
    print("   - Use smaller model variants if accuracy allows")
    print("   - Pre-download models to avoid network delays")
    print("   - Use model quantization for faster loading")
    
    print(f"\n4. Database Optimization:")
    print("   - Use connection pooling")
    print("   - Initialize databases lazily")
    print("   - Pre-warm commonly used queries")
    
    print(f"\n5. FastAPI Optimization:")
    print("   - Disable auto-reload in production")
    print("   - Use multiple workers with gunicorn")
    print("   - Enable response caching")

if __name__ == "__main__":
    analyze_startup_bottlenecks()
    recommend_optimizations()