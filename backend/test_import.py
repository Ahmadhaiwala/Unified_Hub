
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

try:
    print("Attempting to import assignment_service...")
    from app.services import assignment_service
    print("Successfully imported assignment_service!")
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)
except Exception as e:
    print(f"An error occurred: {e}")
    sys.exit(1)
