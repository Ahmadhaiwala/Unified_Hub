
import os
from dotenv import load_dotenv

load_dotenv()

print(f"GOOGLE_API_KEY exists: {'GOOGLE_API_KEY' in os.environ}")
if 'GOOGLE_API_KEY' in os.environ:
    print(f"GOOGLE_API_KEY length: {len(os.environ['GOOGLE_API_KEY'])}")
