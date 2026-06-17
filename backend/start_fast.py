#!/usr/bin/env python3
"""
Fast startup script for UnifiedHub backend
"""
import os
import sys
import time

def optimize_environment():
    """Set environment variables for optimal performance"""
    os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
    os.environ['TOKENIZERS_PARALLELISM'] = 'false' 
    os.environ['OMP_NUM_THREADS'] = '1'
    os.environ['TORCH_CPP_LOG_LEVEL'] = 'WARNING'
    
    # Disable verbose PyTorch warnings
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning)

def main():
    print("🚀 Starting UnifiedHub Backend (Fast Mode)")
    print("=" * 50)
    
    # Optimize environment
    optimize_environment()
    
    start_time = time.time()
    print("⚡ Environment optimized")
    
    # Import and run uvicorn
    try:
        import uvicorn
        import_time = time.time() - start_time
        print(f"📥 FastAPI imported ({import_time:.1f}s)")
        
        print("🔄 Starting server...")
        print("📝 Note: AI models will load on first use (lazy loading)")
        print()
        
        # Run server
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0", 
            port=8000,
            reload=False,  
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Startup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()