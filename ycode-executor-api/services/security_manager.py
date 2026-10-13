"""
Security Manager for Code Execution
Validates and sanitizes code before execution
"""

import re
import ast
from typing import Dict, List, Set
import logging

logger = logging.getLogger(__name__)

class SecurityManager:
    """Manages security validation for code execution"""
    
    def __init__(self):
        # Dangerous patterns for different languages
        self.dangerous_patterns = {
            'python': [
                r'import\s+os',
                r'import\s+sys',
                r'import\s+subprocess',
                r'import\s+socket',
                r'import\s+urllib',
                r'import\s+requests',
                r'import\s+shutil',
                r'import\s+pickle',
                r'from\s+os\s+import',
                r'from\s+sys\s+import',
                r'from\s+subprocess\s+import',
                r'__import__',
                r'eval\s*\(',
                r'exec\s*\(',
                r'compile\s*\(',
                r'open\s*\(',
                r'file\s*\(',
                r'input\s*\(',
                r'raw_input\s*\(',
                r'exit\s*\(',
                r'quit\s*\(',
            ],
            'javascript': [
                r'require\s*\(',
                r'process\.',
                r'global\.',
                r'Buffer\.',
                r'fs\.',
                r'child_process',
                r'eval\s*\(',
                r'Function\s*\(',
                r'setTimeout',
                r'setInterval',
                r'XMLHttpRequest',
                r'fetch\s*\(',
            ],
            'java': [
                r'import\s+java\.io',
                r'import\s+java\.net',
                r'import\s+java\.lang\.reflect',
                r'import\s+java\.lang\.Runtime',
                r'Runtime\.getRuntime',
                r'ProcessBuilder',
                r'System\.exit',
                r'System\.getProperty',
                r'Class\.forName',
                r'Thread\.',
            ],
            'cpp': [
                r'#include\s*<fstream>',
                r'#include\s*<cstdlib>',
                r'#include\s*<unistd.h>',
                r'#include\s*<sys/',
                r'system\s*\(',
                r'exec\w*\s*\(',
                r'fork\s*\(',
                r'exit\s*\(',
                r'abort\s*\(',
            ],
            'c': [
                r'#include\s*<stdlib.h>',
                r'#include\s*<unistd.h>',
                r'#include\s*<sys/',
                r'system\s*\(',
                r'exec\w*\s*\(',
                r'fork\s*\(',
                r'exit\s*\(',
                r'abort\s*\(',
            ]
        }
        
        # Allowed imports/modules for each language
        self.allowed_imports = {
            'python': {
                'math', 'random', 'collections', 'itertools', 'functools',
                'operator', 'bisect', 'heapq', 'copy', 'string', 'datetime',
                'decimal', 'fractions', 're', 'json', 'hashlib', 'base64',
                'statistics', 'typing'
            },
            'javascript': {
                'Math', 'Date', 'Array', 'Object', 'String', 'Number',
                'Boolean', 'RegExp', 'JSON'
            },
            'java': {
                'java.util', 'java.math', 'java.text', 'java.time'
            }
        }
    
    def validate_code(self, code: str, language: str) -> bool:
        """Validate code for security issues"""
        
        try:
            # Check for dangerous patterns
            if not self._check_dangerous_patterns(code, language):
                return False
            
            # Language-specific validation
            if language == 'python':
                return self._validate_python_code(code)
            elif language == 'javascript':
                return self._validate_javascript_code(code)
            elif language in ['java', 'cpp', 'c']:
                return self._validate_compiled_language_code(code, language)
            
            return True
            
        except Exception as e:
            logger.error(f"Code validation error: {str(e)}")
            return False
    
    def _check_dangerous_patterns(self, code: str, language: str) -> bool:
        """Check for dangerous patterns in code"""
        
        if language not in self.dangerous_patterns:
            return True
        
        patterns = self.dangerous_patterns[language]
        
        for pattern in patterns:
            if re.search(pattern, code, re.IGNORECASE):
                logger.warning(f"Dangerous pattern detected: {pattern}")
                return False
        
        return True
    
    def _validate_python_code(self, code: str) -> bool:
        """Validate Python code using AST"""
        
        try:
            # Parse the code
            tree = ast.parse(code)
            
            # Check for dangerous nodes
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name not in self.allowed_imports['python']:
                            logger.warning(f"Disallowed import: {alias.name}")
                            return False
                
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.module not in self.allowed_imports['python']:
                        logger.warning(f"Disallowed import from: {node.module}")
                        return False
                
                elif isinstance(node, ast.Call):
                    # Check for dangerous function calls
                    if isinstance(node.func, ast.Name):
                        if node.func.id in ['eval', 'exec', 'compile', '__import__']:
                            logger.warning(f"Dangerous function call: {node.func.id}")
                            return False
            
            return True
            
        except SyntaxError as e:
            logger.warning(f"Python syntax error: {str(e)}")
            return False
    
    def _validate_javascript_code(self, code: str) -> bool:
        """Validate JavaScript code"""
        
        # Basic validation - could be enhanced with a proper JS parser
        dangerous_keywords = [
            'require', 'process', 'global', 'Buffer', 'eval', 'Function'
        ]
        
        for keyword in dangerous_keywords:
            if re.search(rf'\b{keyword}\b', code):
                logger.warning(f"Dangerous JavaScript keyword: {keyword}")
                return False
        
        return True
    
    def _validate_compiled_language_code(self, code: str, language: str) -> bool:
        """Validate C/C++/Java code"""
        
        # Check includes/imports
        if language == 'java':
            import_pattern = r'import\s+([a-zA-Z0-9_.]+)'
            imports = re.findall(import_pattern, code)
            
            for imp in imports:
                base_package = imp.split('.')[0] + '.' + imp.split('.')[1] if '.' in imp else imp
                if base_package not in self.allowed_imports.get('java', set()):
                    logger.warning(f"Disallowed Java import: {imp}")
                    return False
        
        return True
    
    def sanitize_code(self, code: str, language: str) -> str:
        """Sanitize code by removing/replacing dangerous parts"""
        
        # Remove comments that might contain dangerous instructions
        if language == 'python':
            code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
        elif language in ['java', 'cpp', 'c', 'javascript']:
            code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
            code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        # Remove excessive whitespace
        code = re.sub(r'\n\s*\n', '\n', code)
        code = code.strip()
        
        return code
    
    def get_resource_limits(self, language: str) -> Dict[str, int]:
        """Get resource limits for different languages"""
        
        limits = {
            'python': {
                'memory_mb': 128,
                'timeout_seconds': 10,
                'max_processes': 1,
                'max_files': 0
            },
            'javascript': {
                'memory_mb': 128,
                'timeout_seconds': 10,
                'max_processes': 1,
                'max_files': 0
            },
            'java': {
                'memory_mb': 256,
                'timeout_seconds': 15,
                'max_processes': 1,
                'max_files': 0
            },
            'cpp': {
                'memory_mb': 128,
                'timeout_seconds': 15,
                'max_processes': 1,
                'max_files': 0
            },
            'c': {
                'memory_mb': 128,
                'timeout_seconds': 15,
                'max_processes': 1,
                'max_files': 0
            }
        }
        
        return limits.get(language, limits['python'])