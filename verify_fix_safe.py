
import json
import re

# Read the file content
with open(r"C:\Users\haiwa\fsd1\project1\backend\app\services\assignment_detector.py", "r", encoding="utf-8") as f:
    content = f.read()

# Extract the function definition
# It starts at "def _extract_and_parse_json(text: str)" and ends before the next def
start_marker = "def _extract_and_parse_json(text: str)"
end_marker = "def _validate_analysis"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Could not find function definition start")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("Could not find function definition end")
    exit(1)

func_code = content[start_idx:end_idx]

# Remove imports that might be needed or mocking them?
# The function uses `json` and `re`. They are standard.
# It uses `Dict` and `List` from typing?
# The signature `-> Dict | List:` might need `Dict` and `List` available in scope.

exec_globals = {
    "json": json,
    "re": re,
    "Dict": dict,
    "List": list
}

# Execute the function code to define it in exec_globals
try:
    exec(func_code, exec_globals)
except Exception as e:
    print(f"Failed to execute function code: {e}")
    # Print code for debugging
    print("--- Code ---")
    print(func_code)
    print("--- End Code ---")
    exit(1)

_extract_and_parse_json = exec_globals["_extract_and_parse_json"]

# Test cases
test_inputs = [
    '[\n  { "number": 1 },\n  { "number": 2 }\n]',
    '{ "is_assignment": true }',
    '```json\n[\n  { "number": 1 }\n]\n```',
    '```\n{ "key": "value" }\n```',
]

print("--- Verifying Fix in Actual File ---")
for i, inp in enumerate(test_inputs):
    try:
        res = _extract_and_parse_json(inp)
        print(f"Case {i+1}: Success - Type: {type(res).__name__}")
        if i == 0 and not isinstance(res, list):
             print("FAILURE: Case 1 should be a list!")
    except Exception as e:
        print(f"Case {i+1}: Failed - {e}")
