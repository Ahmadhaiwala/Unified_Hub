
import os
import sys
from dotenv import load_dotenv

# Add project root to path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.append(backend_dir)

load_dotenv(os.path.join(backend_dir, ".env"))

try:
    from app.core.supabase import supabase
    print("Supabase client initialized.")
except Exception as e:
    print(f"Failed to initialize Supabase client: {e}")
    # Try manual init if import fails due to other deps
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("Missing env vars for manual init")
            exit(1)
        supabase = create_client(url, key)
        print("Supabase client manually initialized.")
    except Exception as e2:
        print(f"Manual init failed: {e2}")
        exit(1)

try:
    print("Checking 'question_sheet_questions' table...")
    response = supabase.table("question_sheet_questions").select("*").limit(1).execute()
    print("Success! Table exists.")
    if response.data:
        print("Sample data:", response.data[0].keys())
    else:
        print("Table is empty but accessible.")
except Exception as e:
    print(f"Failed to access 'question_sheet_questions': {e}")

try:
    print("Checking 'questions' table (expecting failure)...")
    response = supabase.table("questions").select("*").limit(1).execute()
    print("Warning: 'questions' table exists! (Unexpected)")
except Exception as e:
    print(f"Confirmed: 'questions' table does not exist or error as expected: {e}")
