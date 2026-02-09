"""
Code Execution Service
Detects programming languages and executes code snippets with safety constraints
"""
import subprocess
import re
import tempfile
import os
from typing import Dict, Optional, Tuple

class CodeExecutor:
    # Language detection patterns
    LANGUAGE_PATTERNS = {
        'python': [
            r'import\s+\w+',
            r'from\s+\w+\s+import',
            r'def\s+\w+\s*\(',
            r'print\s*\(',
            r'if\s+__name__\s*==\s*["\']__main__["\']'
        ],
        'javascript': [
            r'console\.log\(',
            r'const\s+\w+\s*=',
            r'let\s+\w+\s*=',
            r'function\s+\w+\s*\(',
            r'=>\s*{',
            r'require\(["\']'
        ],
        'java': [
            r'public\s+class\s+\w+',
            r'System\.out\.println\(',
            r'public\s+static\s+void\s+main'
        ],
        'cpp': [
            r'#include\s*<\w+>',
            r'std::cout',
            r'int\s+main\s*\(',
            r'cout\s*<<'
        ]
    }

    # Execution configurations
    EXECUTORS = {
        'python': {
            'command': ['python', '-c'],
            'timeout': 5,
            'extension': '.py'
        },
        'javascript': {
            'command': ['node', '-e'],
            'timeout': 5,
            'extension': '.js'
        },
        'java': {
            'command': None,  # Requires compilation
            'timeout': 10,
            'extension': '.java'
        }
    }

    def detect_language(self, code: str) -> Optional[str]:
        """Detect programming language from code snippet"""
        # Check for explicit markdown language hints
        # If code starts with ```language, extract that
        
        scores = {}
        for lang, patterns in self.LANGUAGE_PATTERNS.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, code, re.MULTILINE):
                    score += 1
            if score > 0:
                scores[lang] = score
        
        if not scores:
            return None
        
        # Return language with highest score
        return max(scores, key=scores.get)

    def execute_code(self, code: str, language: Optional[str] = None) -> Dict:
        """
        Execute code and return output
        
        Args:
            code: Code snippet to execute
            language: Programming language (auto-detect if None)
            
        Returns:
            Dict with success, output, error, language, execution_time
        """
        # Detect language if not provided
        if not language:
            language = self.detect_language(code)
        
        if not language:
            return {
                'success': False,
                'output': '',
                'error': 'Could not detect programming language',
                'language': None,
                'execution_time': 0
            }
        
        if language not in self.EXECUTORS:
            return {
                'success': False,
                'output': '',
                'error': f'Execution not supported for {language}',
                'language': language,
                'execution_time': 0
            }
        
        # Execute based on language
        if language == 'python':
            return self._execute_python(code)
        elif language == 'javascript':
            return self._execute_javascript(code)
        elif language == 'java':
            return self._execute_java(code)
        
        return {
            'success': False,
            'output': '',
            'error': 'Unsupported language',
            'language': language,
            'execution_time': 0
        }

    def _execute_python(self, code: str) -> Dict:
        """Execute Python code"""
        import time
        
        try:
            start_time = time.time()
            
            # Execute with timeout
            result = subprocess.run(
                ['python', '-c', code],
                capture_output=True,
                text=True,
                timeout=5,  # 5 second timeout
                cwd=tempfile.gettempdir()  # Prevent file system access to project
            )
            
            execution_time = time.time() - start_time
            
            # Limit output size
            stdout = result.stdout[:10000] if result.stdout else ''
            stderr = result.stderr[:10000] if result.stderr else ''
            
            return {
                'success': result.returncode == 0,
                'output': stdout,
                'error': stderr,
                'language': 'python',
                'execution_time': round(execution_time, 3)
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Execution timed out (5 second limit)',
                'language': 'python',
                'execution_time': 5.0
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': f'Execution error: {str(e)}',
                'language': 'python',
                'execution_time': 0
            }

    def _execute_javascript(self, code: str) -> Dict:
        """Execute JavaScript code using Node.js"""
        import time
        
        try:
            start_time = time.time()
            
            # Execute with timeout
            result = subprocess.run(
                ['node', '-e', code],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=tempfile.gettempdir()
            )
            
            execution_time = time.time() - start_time
            
            stdout = result.stdout[:10000] if result.stdout else ''
            stderr = result.stderr[:10000] if result.stderr else ''
            
            return {
                'success': result.returncode == 0,
                'output': stdout,
                'error': stderr,
                'language': 'javascript',
                'execution_time': round(execution_time, 3)
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Execution timed out (5 second limit)',
                'language': 'javascript',
                'execution_time': 5.0
            }
        except FileNotFoundError:
            return {
                'success': False,
                'output': '',
                'error': 'Node.js not found. Please install Node.js to execute JavaScript.',
                'language': 'javascript',
                'execution_time': 0
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': f'Execution error: {str(e)}',
                'language': 'javascript',
                'execution_time': 0
            }

    def _execute_java(self, code: str) -> Dict:
        """Execute Java code (requires compilation)"""
        # Java requires more complex handling - placeholder for now
        return {
            'success': False,
            'output': '',
            'error': 'Java execution not yet implemented (requires compilation)',
            'language': 'java',
            'execution_time': 0
        }

# Singleton instance
code_executor = CodeExecutor()
