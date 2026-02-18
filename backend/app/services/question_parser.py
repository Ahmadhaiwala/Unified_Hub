"""
Question Parser Service for Intelligent Assignment System
Parses raw text into structured question objects with type detection.
"""

import re
from typing import List, Dict, Optional

def clean_text(text: str) -> str:
    """Removes common header/footer noise from assignment text."""
    # Remove common academic headers
    noise_patterns = [
        r'Time:\s*\d+\s*(?:hrs|hours|mins|minutes)?',
        r'Max\.?\s*Marks:\s*\d+',
        r'Total\s*Marks:\s*\d+',
        r'Section\s*[A-Z]',
        r'Page\s*\d+\s*of\s*\d+'
    ]
    
    cleaned = text
    for pattern in noise_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    return cleaned.strip()

def detect_question_type(text: str) -> str:
    """
    Heuristic detection of question type.
    Returns: 'mcq', 'coding', 'numerical', 'theory', 'general'
    """
    text_lower = text.lower()
    
    # MCQ Detection: looks for (a), (b), (c) or A. B. C. patterns
    mcq_pattern = r'(\([a-d]\)|[a-d]\.|[A-D]\.)\s'
    if len(re.findall(mcq_pattern, text)) >= 3:
        return 'mcq'
        
    # Coding Detection
    coding_keywords = ['write a program', 'function', 'class', 'algorithm', 'code', 'implement', 'java', 'python', 'c++']
    if any(k in text_lower for k in coding_keywords):
        return 'coding'
        
    # Numerical Detection
    numerical_keywords = ['calculate', 'evaluate', 'find the value', 'solve for', 'equation']
    if any(k in text_lower for k in numerical_keywords):
        # Also check for mathematical symbols
        if re.search(r'[=\+\-\*/\^]', text):
            return 'numerical'
            
    # Theory Detection
    theory_keywords = ['explain', 'describe', 'discuss', 'define', 'compare', 'contrast', 'what is']
    if any(k in text_lower for k in theory_keywords):
        return 'theory'
        
    return 'general'

def extract_options(text: str) -> List[str]:
    """Extracts MCQ options from text."""
    options = []
    # Match patterns like (a) Option text (b) Option text...
    # or a. Option text b. Option text...
    
    # Split by option markers
    # This is a bit tricky to get perfect with regex alone, but good enough for now
    parts = re.split(r'\s(?:[a-d]\)|[A-D]\.)\s', text)
    
    # First part is the question, subsequent parts are options
    if len(parts) > 1:
        # Clean up the parts
        return [p.strip() for p in parts[1:] if p.strip()]
        
    return []

def parse_assignment_text(text: str) -> List[Dict]:
    """
    Main entry point to parse assignment text into structured questions.
    """
    cleaned_text = clean_text(text)
    
    questions = []
    
    # Regex for splitting questions
    # Matches: "1.", "1)", "Q1", "Question 1" and similar
    split_pattern = r'(?:^|\n)(?:\d+[\.\)]|Q\d+[:\.]?|Question\s*\d+[:\.]?)\s+'
    
    # Split text
    # We use capturing group to keep delimiters if we want to extract number, 
    # but for now let's just split and re-process or use finditer
    
    # Better approach: find all starts, then slice
    matches = list(re.finditer(split_pattern, cleaned_text, re.MULTILINE))
    
    if not matches:
        # Fallback: Treat as single question or try newline split if short
        return [{
            "question_number": "1",
            "text": cleaned_text,
            "question_type": detect_question_type(cleaned_text),
            "options": extract_options(cleaned_text) if detect_question_type(cleaned_text) == 'mcq' else []
        }]
    
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i+1].start() if i + 1 < len(matches) else len(cleaned_text)
        
        full_q_text = cleaned_text[start:end].strip()
        
        # Extract question number from the match
        q_num_match = re.search(r'\d+', match.group())
        q_num = q_num_match.group() if q_num_match else str(i+1)
        
        # Clean the number from the text body
        # e.g. "1. What is..." -> "What is..."
        # The split pattern match is at the start, so we remove it
        q_body = full_q_text[len(match.group()):].strip()
        
        q_type = detect_question_type(q_body)
        options = extract_options(q_body) if q_type == 'mcq' else []
        
        questions.append({
            "question_number": q_num,
            "text": q_body,
            "question_type": q_type,
            "options": options
        })
        
    return questions
