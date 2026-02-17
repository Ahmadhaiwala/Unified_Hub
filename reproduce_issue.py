
import json
import re
from typing import Dict, List, Optional

def _extract_and_parse_json_original(text: str) -> Dict:
    """Extract and parse JSON from AI response (ORIGINAL BROKEN VERSION)"""
    try:
        # Remove markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        # Find JSON boundaries
        # BUG: This assumes the top-level element is always an object!
        start = text.index('{')
        end = text.rindex('}') + 1
        text = text[start:end]
        
        # Parse JSON
        return json.loads(text)
        
    except (ValueError, json.JSONDecodeError) as e:
        # Try to fix common issues
        try:
            text = text.replace("'", '"')
            text = text.replace("True", "true").replace("False", "false")
            text = text.replace("None", "null")
            text = re.sub(r',(\s*[}\]])', r'\1', text)
            return json.loads(text)
        except:
            raise Exception(f"Failed to parse AI response: {text[:200]}")

def _extract_and_parse_json_fixed(text: str) -> Dict | List:
    """Extract and parse JSON from AI response (FIXED VERSION)"""
    text = text.strip()
    
    # Remove markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
        
    # Attempt 1: Direct parse
    try:
        return json.loads(text)
    except:
        pass

    # Attempt 2: Find array boundaries
    try:
        start = text.index('[')
        end = text.rindex(']') + 1
        candidate = text[start:end]
        return json.loads(candidate)
    except:
        pass

    # Attempt 3: Find object boundaries
    try:
        start = text.index('{')
        end = text.rindex('}') + 1
        candidate = text[start:end]
        return json.loads(candidate)
    except:
        pass

    # Attempt 4: Common fixes
    try:
        text = text.replace("'", '"')
        text = text.replace("True", "true").replace("False", "false")
        text = text.replace("None", "null")
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        
        # Retry finding array
        if '[' in text and ']' in text:
            start = text.index('[')
            end = text.rindex(']') + 1
            return json.loads(text[start:end])
            
        # Retry finding object
        if '{' in text and '}' in text:
            start = text.index('{')
            end = text.rindex('}') + 1
            return json.loads(text[start:end])
    except:
        pass

    raise Exception(f"Failed to parse AI response: {text[:200]}")

# Test cases
test_inputs = [
    # 1. Valid array (The case that is currently failing)
    '[\n  { "number": 1 },\n  { "number": 2 }\n]',
    
    # 2. Valid object
    '{ "is_assignment": true }',
    
    # 3. Array wrapped in markdown
    '```json\n[\n  { "number": 1 }\n]\n```',
    
    # 4. Object wrapped in markdown
    '```\n{ "key": "value" }\n```',
    
    # 5. Text before/after
    'Here is the JSON:\n[{"a":1}]',
]

print("--- Testing Original Function ---")
for i, inp in enumerate(test_inputs):
    try:
        res = _extract_and_parse_json_original(inp)
        print(f"Case {i+1}: Success - {type(res)}")
    except Exception as e:
        print(f"Case {i+1}: Failed - {e}")

print("\n--- Testing Fixed Function ---")
for i, inp in enumerate(test_inputs):
    try:
        res = _extract_and_parse_json_fixed(inp)
        print(f"Case {i+1}: Success - {type(res)}")
    except Exception as e:
        print(f"Case {i+1}: Failed - {e}")
