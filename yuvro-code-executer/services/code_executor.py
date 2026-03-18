"""
Secure Code Execution Service
Handles execution of code in multiple languages with security constraints
"""

import subprocess
import tempfile
import os
import time
import psutil
import signal
import resource
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class CodeExecutorService:
    """Secure code execution with resource limits"""
    
    LANGUAGE_CONFIGS = {
        'python': {
            'extension': '.py',
            'command': ['python3', '{filename}'],
            'compile_command': None,
            'timeout': 10,
            'memory_limit': 128  # MB
        },
        'javascript': {
            'extension': '.js',
            'command': ['node', '{filename}'],
            'compile_command': None,
            'timeout': 10,
            'memory_limit': 128
        },
        'java': {
            'extension': '.java',
            'command': ['java', 'Solution'],
            'compile_command': ['javac', 'Solution.java'],
            'timeout': 15,
            'memory_limit': 256
        },
        'cpp': {
            'extension': '.cpp',
            'command': ['./solution'],
            'compile_command': ['g++', '-o', 'solution', '{filename}', '-std=c++17'],
            'timeout': 15,
            'memory_limit': 128
        },
        'c': {
            'extension': '.c',
            'command': ['./solution'],
            'compile_command': ['gcc', '-o', 'solution', '{filename}'],
            'timeout': 15,
            'memory_limit': 128
        }
    }
    
    def __init__(self):
        self.temp_dir_base = '/tmp/code_execution'
        os.makedirs(self.temp_dir_base, exist_ok=True)
    
    def execute(self, code: str, language: str, input: str = "", 
                timeout: int = None, memory_limit: int = None) -> Dict[str, Any]:
        """Execute code with security constraints"""
        
        if language not in self.LANGUAGE_CONFIGS:
            return {
                'success': False,
                'error': f'Unsupported language: {language}',
                'output': '',
                'execution_time': 0,
                'memory_usage': 0
            }
        
        config = self.LANGUAGE_CONFIGS[language]
        timeout = timeout or config['timeout']
        memory_limit = memory_limit or config['memory_limit']
        
        with tempfile.TemporaryDirectory(dir=self.temp_dir_base) as temp_dir:
            try:
                # Create source file
                filename = self._get_filename(language, config['extension'])
                filepath = os.path.join(temp_dir, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile if needed
                if config['compile_command']:
                    compile_result = self._compile_code(config['compile_command'], filepath, temp_dir)
                    if not compile_result['success']:
                        return compile_result
                
                return self._execute_code(
                    config['command'], filepath, temp_dir, input, 
                    timeout, memory_limit
                )
                
            except Exception as e:
                logger.error(f"Code execution error: {str(e)}")
                return {
                    'success': False,
                    'error': f'Execution error: {str(e)}',
                    'output': '',
                    'execution_time': 0,
                    'memory_usage': 0
                }
    
    def _get_filename(self, language: str, extension: str) -> str:
        """Get appropriate filename for the language"""
        if language == 'java':
            return 'Solution.java'
        else:
            return f'solution{extension}'
    
    def _compile_code(self, compile_command: list, filepath: str, temp_dir: str) -> Dict[str, Any]:
        """Compile code if needed"""
        try:
            # Prepare compile command
            command = []
            for part in compile_command:
                if '{filename}' in part:
                    command.append(part.format(filename=os.path.basename(filepath)))
                else:
                    command.append(part)
            
            # Run compilation
            process = subprocess.Popen(
                command,
                cwd=temp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(timeout=30)
            
            if process.returncode != 0:
                return {
                    'success': False,
                    'error': f'Compilation error: {stderr}',
                    'output': stdout,
                    'execution_time': 0,
                    'memory_usage': 0
                }
            
            return {'success': True}
            
        except subprocess.TimeoutExpired:
            process.kill()
            return {
                'success': False,
                'error': 'Compilation timeout',
                'output': '',
                'execution_time': 0,
                'memory_usage': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Compilation error: {str(e)}',
                'output': '',
                'execution_time': 0,
                'memory_usage': 0
            }
    
    def _execute_code(self, command: list, filepath: str, temp_dir: str, 
                     input: str, timeout: int, memory_limit: int) -> Dict[str, Any]:
        """Execute compiled/interpreted code with resource limits"""
        
        # Prepare execution command
        exec_command = []
        for part in command:
            if '{filename}' in part:
                exec_command.append(part.format(filename=os.path.basename(filepath)))
            else:
                exec_command.append(part)
        
        start_time = time.time()
        max_memory = 0
        
        try:
            # Set resource limits
            def set_limits():
                # Set memory limit (in bytes)
                resource.setrlimit(resource.RLIMIT_AS, (memory_limit * 1024 * 1024, memory_limit * 1024 * 1024))
                # Set CPU time limit
                resource.setrlimit(resource.RLIMIT_CPU, (timeout, timeout))
                # Disable core dumps
                resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
                # Limit number of processes
                resource.setrlimit(resource.RLIMIT_NPROC, (10, 10))
            
            # Execute with limits
            process = subprocess.Popen(
                exec_command,
                cwd=temp_dir,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                preexec_fn=set_limits
            )
            
            try:
                ps_process = psutil.Process(process.pid)
                stdout, stderr = process.communicate(input=input, timeout=timeout)
                
                # Get memory usage
                try:
                    memory_info = ps_process.memory_info()
                    max_memory = memory_info.rss / 1024 / 1024  # Convert to MB
                except:
                    max_memory = 0
                
            except psutil.NoSuchProcess:
                stdout, stderr = process.communicate(input=input, timeout=timeout)
            
            execution_time = time.time() - start_time
            
            if process.returncode == 0:
                return {
                    'success': True,
                    'output': stdout.strip(),
                    'error': stderr.strip() if stderr else '',
                    'execution_time': execution_time,
                    'memory_usage': max_memory
                }
            else:
                return {
                    'success': False,
                    'output': stdout.strip(),
                    'error': stderr.strip(),
                    'execution_time': execution_time,
                    'memory_usage': max_memory
                }
        
        except subprocess.TimeoutExpired:
            try:
                process.kill()
                process.wait(timeout=1)
            except:
                pass
            
            return {
                'success': False,
                'error': f'Execution timed out after {timeout} seconds',
                'output': '',
                'execution_time': timeout,
                'memory_usage': max_memory
            }
        
        except Exception as e:
            try:
                process.kill()
            except:
                pass
            
            return {
                'success': False,
                'error': f'Execution error: {str(e)}',
                'output': '',
                'execution_time': time.time() - start_time,
                'memory_usage': max_memory
            }