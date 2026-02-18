
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

try:
    from app.services.assignment_detector import OPENROUTER_API_URL
    print(f"assignment_detector.OPENROUTER_API_URL = '{OPENROUTER_API_URL}'")
    
    # Check other services if possible
    try:
        from app.services.ai_chat_service import OPENROUTER_API_URL as CHAT_URL
        print(f"ai_chat_service.OPENROUTER_API_URL = '{CHAT_URL}'")
    except ImportError:
        print("ai_chat_service.OPENROUTER_API_URL not found or not exported")
    except Exception as e:
        print(f"Error importing ai_chat_service: {e}")

except Exception as e:
    print(f"Error importing assignment_detector: {e}")
