
import os
import sys
from dotenv import load_dotenv

load_dotenv()

print(f"GEMINI_API_KEY exists: {'GEMINI_API_KEY' in os.environ}")
if 'GEMINI_API_KEY' in os.environ:
    print(f"GEMINI_API_KEY length: {len(os.environ['GEMINI_API_KEY'])}")

try:
    import google.generativeai
    print("google.generativeai is installed")
except ImportError:
    print("google.generativeai is NOT installed")
