from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import subprocess
from database_evaluator import DatabaseEvaluatorFactory
import tempfile
import os
import time
import psutil
import difflib
import asyncio
import json
import shutil
import signal
from pathlib import Path
from observability import setup_telemetry, instrument_fastapi_app, get_tracer, record_code_execution
import re as _re
from database_evaluator.factory import DatabaseEvaluatorFactory

import base64
import io
import tempfile
from playwright.sync_api import sync_playwright
import datetime as _dt
def kill_process_tree(pid: int):
    try:
        parent = psutil.Process(pid)
        for child in parent.children(recursive=True):
            try:
                child.kill()
            except:
                pass
        try:
            parent.kill()
        except:
            pass
    except psutil.NoSuchProcess:
        pass
    except Exception as e:
        print(f"Error killing process tree for pid {pid}: {e}")

# Initialize OpenTelemetry
setup_telemetry()

app = FastAPI(title="Code Executor Service", version="1.0.0")

# Instrument FastAPI app for tracing
instrument_fastapi_app(app)

# Get tracer for custom spans
tracer = get_tracer(__name__)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        # Dev environment (AWS) - all subdomains
        "https://code-dev.yuvro.ai",
        "https://campus-dev.yuvro.ai",
        "https://backend-code-dev.yuvro.ai",
        "https://backend-campus-dev.yuvro.ai",
        "https://code-executer-dev.yuvro.ai",
        "https://labs-dev.yuvro.ai",
        "https://dev.yuvrolabs.com",
        "https://backend-dev.yuvrolabs.com",
        "https://backend-hub-dev.yuvro.ai",
        "http://code-dev.yuvro.ai",
        "http://campus-dev.yuvro.ai",
        "http://backend-code-dev.yuvro.ai",
        "http://backend-campus-dev.yuvro.ai",
        "http://dev.yuvrolabs.com",
        # Staging / production
        "https://yuvro.ai",
        "https://www.yuvro.ai",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic models
class CodeExecutionRequest(BaseModel):
    code: str
    language: str
    input: str = ""
    timeout: int = 10

class TestCase(BaseModel):
    input: str
    expected_output: str
    weight: int = 1

class CodeExecutionWithTestsRequest(BaseModel):
    code: str
    language: str
    test_cases_basic: Optional[List[TestCase]] = []
    test_cases_advanced: Optional[List[TestCase]] = []
    test_cases_custom: Optional[List[TestCase]] = []
    timeout: int = 10
    time_limit: Optional[float] = None
    memory_limit: Optional[float] = None

class ExecutionResult(BaseModel):
    success: bool
    output: str
    error: str
    execution_time: float
    memory_usage: float
    status: str

class TestResult(BaseModel):
    passed: bool
    input: str
    expected_output: str
    actual_output: str
    error: str
    execution_time: float
    memory_usage: float = 0.0
    console_output: str = ""  # Add console output field

class CodeExecutionResponse(BaseModel):
    execution_result: ExecutionResult
    test_results: List[TestResult]
    total_passed: int
    total_tests: int
    plagiarism_score: float = 0.0
    # Separate results for different test case types
    basic_results: List[TestResult] = []
    advanced_results: List[TestResult] = []
    custom_results: List[TestResult] = []
    basic_passed: int = 0
    advanced_passed: int = 0
    custom_passed: int = 0

class ReferenceSubmission(BaseModel):
    submission_id: str
    user_id: str
    answer_data: Dict[str, Any]

class DatabaseRunRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: str
    query: Optional[str] = None
    task_file: Optional[str] = None
    task_id: Optional[str] = None
    database_engine: str = "sqlite"
    db_file: str = "lab.db"
    expected_query: Optional[str] = None
    expected_output: Optional[str] = None
    scoring_rules: Optional[Dict[str, Any]] = None
    system_query: Optional[str] = None
    evaluation_id: Optional[str] = None

    expected_result: Optional[str] = None
    connection_url: Optional[str] = None

class PlagiarismCheckRequest(BaseModel):
    target_code: str
    language: str
    reference_submissions: List[ReferenceSubmission]

class PlagiarismMatch(BaseModel):
    submission_id: str
    user_id: str
    similarity_score: float

class PlagiarismResult(BaseModel):
    is_plagiarized: bool
    max_similarity: float
    matches: List[PlagiarismMatch]

@app.post("/plagiarism-check", response_model=PlagiarismResult)
async def check_plagiarism(request: PlagiarismCheckRequest):
    """Check plagiarism between target code and multiple reference submissions"""
    try:
        matches = []
        max_similarity = 0.0
        
        target_code = request.target_code
        if not target_code:
            return PlagiarismResult(is_plagiarized=False, max_similarity=0.0, matches=[])

        for ref in request.reference_submissions:
            # Extract code from answer_data
            # Assuming answer_data has a 'code' field or similar structure for coding questions
            ref_code = ref.answer_data.get('code') or ref.answer_data.get('source_code') or ""
            
            if not isinstance(ref_code, str) or not ref_code:
                continue
                
            similarity = CodeExecutorService.calculate_similarity(target_code, ref_code)
            
            if similarity > 0.0:  # You might want a threshold here, e.g., > 0.5 to reduce noise
                matches.append(PlagiarismMatch(
                    submission_id=ref.submission_id,
                    user_id=ref.user_id,
                    similarity_score=similarity
                ))
                max_similarity = max(max_similarity, similarity)
        
        # Sort matches by similarity descending
        matches.sort(key=lambda x: x.similarity_score, reverse=True)
        
        return PlagiarismResult(
            is_plagiarized=max_similarity > 0.8,  # Threshold for flagging
            max_similarity=max_similarity,
            matches=matches[:10]  # Return top 10 matches
        )
        
    except Exception as e:
        # Log error or return empty result so we don't block submission
        print(f"Plagiarism check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Language configurations
LANGUAGE_CONFIGS = {
    'python': {
        'extension': '.py',
        'command': ['python3'],
        'timeout': 10,
        'template': """class Solution:
    def solve(self, *args):
        # Competitive Programming Template - Python
        # Each line of your test case input is passed as an argument in *args.
        # Arguments are automatically parsed as JSON/Numbers if possible.

        # Example: If your input lines are: "Hello", 42, [1, 2, 3]
        # You can access them like this:
        # input_str = args[0] if len(args) > 0 else ""
        # num = args[1] if len(args) > 1 else 0
        # list_data = args[2] if len(args) > 2 else []

        # Start your logic below:
        return None
"""
    },
    'javascript': {
        'extension': '.js',
        'command': ['node'],
        'timeout': 10,
        'template': """"use strict";

const fs = require('fs');

/**
 * Competitive Programming Template - Node.js
 * Reads stdin and parses lines. Often inputs are JSON strings.
 */
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(line => line.trim());
    if (lines.length === 0) return;

    // Example: parse first line as a JSON array
    try {
        const data = JSON.parse(lines[0]);
        // Your logic here
    } catch (e) {
        // Fallback for non-JSON input
        const data = lines[0];
    }
}

solve();
"""
    },
    'java': {
        'extension': '.java',
        'compile_command': ['javac', '-cp', '.'],
        'run_command': ['java', '-cp', '.'],
        'timeout': 15,
        'template': """import java.util.*;

/**
 * Competitive Programming Template - Java
 */
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // For array inputs, the platform provides [count] followed by [elements]
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int[] arr = new int[n];
            for(int i = 0; i < n; i++) {
                arr[i] = sc.nextInt();
            }
            // Your logic here
        }
    }
}
"""
    },
    'cpp': {
        'extension': '.cpp',
        'compile_command': ['g++', '-o'],
        'timeout': 15,
        'template': """#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

/**
 * Competitive Programming Template - C++
 */
int main() {
    // Faster I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    // For array inputs, the platform provides [count] followed by [elements]
    if (cin >> n) {
        vector<int> arr(n);
        for(int i = 0; i < n; i++) {
            cin >> arr[i];
        }
        // Your logic here
    }

    return 0;
}
"""
    },
    'c': {
        'extension': '.c',
        'compile_command': ['gcc', '-o'],
        'timeout': 15,
        'template': """#include <stdio.h>
#include <stdlib.h>

/**
 * Competitive Programming Template - C
 */
int main() {
    int n;
    // For array inputs, the platform provides [count] followed by [elements]
    if (scanf("%d", &n) == 1) {
        int* arr = (int*)malloc(n * sizeof(int));
        for(int i = 0; i < n; i++) {
            scanf("%d", &arr[i]);
        }
        
        // Your logic here
        
        free(arr);
    }
    return 0;
}
"""
    }
}

PYTHON_DRIVER_CODE = """
import sys
import json
import ast
import io
from contextlib import redirect_stdout

def _driver_execution():
    # check if Solution class exists
    if 'Solution' not in globals():
        return

    try:
        sol = globals()['Solution']()
        # Find method
        methods = [m for m in dir(sol) if callable(getattr(sol, m)) and not m.startswith('_')]
        if not methods:
            return
        
        # Use first available method
        method = getattr(sol, methods[0])
        
        # Read input
        input_str = sys.stdin.read().strip()
        if not input_str:
            return
            
        # Parse args
        args = []
        # Support multi-line inputs as separate arguments
        for line in input_str.split('\\n'):
            line = line.strip()
            if not line: continue
            try:
                arg = json.loads(line)
            except:
                try:
                    arg = ast.literal_eval(line)
                except:
                    arg = line
            args.append(arg)
            
        # Capture stdout (print statements) separately from return value
        console_output = io.StringIO()
        with redirect_stdout(console_output):
            result = method(*args)
        
        # Print console output to stderr so we can capture it separately
        console_content = console_output.getvalue()
        if console_content:
            print(console_content, file=sys.stderr, end='')
        
        # Print only the result to stdout
        if result is not None:
            # formatted output
            if isinstance(result, (list, dict, tuple)):
                print(json.dumps(result, separators=(',', ':')))
            elif isinstance(result, bool):
                print('true' if result else 'false')
            else:
                print(result)
                
    except Exception as e:
        print(f"Runtime Error: {str(e)}", file=sys.stderr)

if __name__ == '__main__':
    _driver_execution()
"""

class CodeExecutorService:
    # Blacklists for security validation
    BLACKLISTED_PYTHON_IMPORTS = ['os', 'subprocess', 'socket', 'ctypes', 'shutil', 'multiprocessing', 'threading', 'resource', 'psutil', 'importlib', 'pickle', 'marshal', 'asyncio']
    BLACKLISTED_PYTHON_FUNCTIONS = ['eval', 'exec', 'compile', 'open', '__import__']
    BLACKLISTED_SYSTEM_COMMANDS = ['rm', 'sudo', 'chmod', 'chown', 'shutdown', 'reboot', 'kill', 'pkill', 'systemctl', 'curl', 'wget', 'ssh', 'scp', 'bash']
    BLACKLISTED_JS_PATTERNS = ["require('fs')", 'require("fs")', "require('child_process')", 'require("child_process")', 'eval(', 'Function(', 'process.exit', 'fetch(', 'globalThis', 'setTimeout(', 'setInterval(']
    BLACKLISTED_JAVA_IMPORTS = ['java.io', 'java.net', 'ProcessBuilder', 'Runtime.getRuntime', 'System.exit']
    BLACKLISTED_CPP_HEADERS = ['unistd.h', 'sys/socket.h', 'arpa/inet.h', 'filesystem', 'thread', 'fstream', 'system(', 'popen(', 'fork(', 'exec(']
    BLACKLISTED_PATHS = ['/etc/', '/proc/', '/sys/', '/dev/', '/root/']

    @staticmethod
    def validate_code(code: str, language: str) -> Dict[str, Any]:
        """
        Validates code against dangerous patterns before execution.
        
        Security context:
        - Arbitrary code execution can lead to host compromise if not properly sandboxed.
        - Filesystem access risks sensitive data exposure (e.g., /etc/passwd).
        - Process spawning can be used for denial of service or evasion.
        - Networking can be used for data exfiltration or lateral movement.
        - NOTE: Regex-based validation is limited and can sometimes be bypassed via obfuscation.
          It serves as a first line of defense alongside OS-level sandboxing (e.g., Docker, timeouts).

        Sample security test cases:
        - Reading /etc/passwd: python: open('/etc/passwd').read(), bash: cat /etc/passwd
        - Using eval: python: eval('print(1)'), js: eval('console.log(1)')
        - Using subprocess: python: import subprocess
        - Using os.system: python: import os; os.system('ls')
        - Using require('fs'): js: require('fs').readFileSync(...)
        - Using ProcessBuilder: java: new ProcessBuilder("ls").start()
        - Using fork(): cpp: fork()
        """
        import re
        
        code_lower = code.lower()
        
        # Check for dangerous paths
        for path in CodeExecutorService.BLACKLISTED_PATHS:
            if path in code_lower:
                return {"success": False, "error": f"Security exception: Detected dangerous filesystem path access: {path}"}
                
        # Check for dangerous system commands (usually useful if they are spawning shells)
        for cmd in CodeExecutorService.BLACKLISTED_SYSTEM_COMMANDS:
            # Word boundary check to avoid false positives (e.g., matching 'arm' inside a variable)
            if re.search(r'\b' + re.escape(cmd) + r'\b', code_lower):
                return {"success": False, "error": f"Security exception: Detected dangerous system command: {cmd}"}

        if language == 'python':
            # Check imports
            for imp in CodeExecutorService.BLACKLISTED_PYTHON_IMPORTS:
                # Match 'import X' or 'from X import'
                if re.search(r'\bimport\s+' + re.escape(imp) + r'\b', code) or \
                   re.search(r'\bfrom\s+' + re.escape(imp) + r'\b', code):
                    return {"success": False, "error": f"Security exception: Detected dangerous Python import: {imp}"}
            
            # Check functions
            for func in CodeExecutorService.BLACKLISTED_PYTHON_FUNCTIONS:
                if re.search(r'\b' + re.escape(func) + r'\s*\(', code):
                    return {"success": False, "error": f"Security exception: Detected dangerous Python function: {func}"}
                    
        elif language == 'javascript':
            for pattern in CodeExecutorService.BLACKLISTED_JS_PATTERNS:
                # Escape pattern but allow flexible whitespace for functions
                esc_pattern = re.escape(pattern).replace(r'\(', r'\s*\(')
                if re.search(esc_pattern, code):
                    return {"success": False, "error": f"Security exception: Detected dangerous JavaScript pattern: {pattern}"}
                    
        elif language == 'java':
            for imp in CodeExecutorService.BLACKLISTED_JAVA_IMPORTS:
                if imp in code:
                    return {"success": False, "error": f"Security exception: Detected dangerous Java import/pattern: {imp}"}
                    
        elif language in ['cpp', 'c']:
            for header in CodeExecutorService.BLACKLISTED_CPP_HEADERS:
                if header in code:
                    return {"success": False, "error": f"Security exception: Detected dangerous C/C++ header/function: {header}"}

        return {"success": True}

    @staticmethod
    async def execute_code(code: str, language: str, input_data: str = "", timeout: int = 10) -> Dict[str, Any]:
        """Execute code and return results"""
        # Note: Input is passed as-is to all languages (no preprocessing).
        # Solutions in C/C++/Java parse the same raw JSON input as Python.

        if language not in LANGUAGE_CONFIGS:
            return {
                'success': False,
                'error': f'Unsupported language: {language}',
                'output': '',
                'execution_time': 0,
                'memory_usage': 0,
                'status': 'error'
            }
            
        validation_result = CodeExecutorService.validate_code(code, language)
        if not validation_result['success']:
            return {
                'success': False,
                'error': validation_result['error'],
                'output': '',
                'execution_time': 0,
                'memory_usage': 0,
                'status': 'error'
            }

        config = LANGUAGE_CONFIGS[language]
        # Cap timeout between 2 and 300 seconds to prevent backend/CPU resource abuse
        timeout = min(max(timeout or 3, 2), 300)

        with tracer.start_as_current_span(
            f"execute_code_{language}",
            attributes={
                "code.language": language,
                "code.length": len(code),
                "input.length": len(input_data),
                "timeout": timeout
            }
        ) as span:
            start_time = time.time()
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    # Create source file
                    if language == 'java':
                        filename = f"Solution{config['extension']}"
                    else:
                        filename = f"solution{config['extension']}"
                        
                    filepath = os.path.join(temp_dir, filename)
                    
                    with open(filepath, 'w') as f:
                        f.write(code)
                        if language == 'python':
                            f.write(PYTHON_DRIVER_CODE)

                    # Prepare and execute command
                    start_time = time.time()
                    
                    process = None
                    if language == 'java':
                        # Compile Java
                        compile_cmd = config['compile_command'] + [filename]
                        compile_process = await asyncio.create_subprocess_exec(
                            *compile_cmd,
                            cwd=temp_dir,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        
                        try:
                            compile_stdout, compile_stderr = await asyncio.wait_for(
                                compile_process.communicate(), timeout=timeout
                            )
                        except asyncio.TimeoutError:
                            if compile_process:
                                try:
                                    kill_process_tree(compile_process.pid)
                                except:
                                    pass
                            res = {
                                'success': False,
                                'error': 'Compilation timed out',
                                'output': '',
                                'execution_time': timeout,
                                'memory_usage': 0,
                                'status': 'tle'
                            }
                            record_code_execution(language, 'tle', timeout)
                            return res
                        
                        if compile_process.returncode != 0:
                            res = {
                                'success': False,
                                'error': compile_stderr.decode(),
                                'output': '',
                                'execution_time': time.time() - start_time,
                                'memory_usage': 0,
                                'status': 'compilation_error'
                            }
                            record_code_execution(language, 'compilation_error', res['execution_time'])
                            return res
                        
                        # Run Java
                        run_cmd = config['run_command'] + ['Solution']
                        process = await asyncio.create_subprocess_exec(
                            *run_cmd,
                            cwd=temp_dir,
                            stdin=asyncio.subprocess.PIPE,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        
                    elif language in ['cpp', 'c']:
                        # Compile C/C++
                        output_file = os.path.join(temp_dir, 'solution')
                        compile_cmd = config['compile_command'] + [output_file, filename]
                        compile_process = await asyncio.create_subprocess_exec(
                            *compile_cmd,
                            cwd=temp_dir,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        
                        try:
                            compile_stdout, compile_stderr = await asyncio.wait_for(
                                compile_process.communicate(), timeout=timeout
                            )
                        except asyncio.TimeoutError:
                            if compile_process:
                                try:
                                    kill_process_tree(compile_process.pid)
                                except:
                                    pass
                                try:
                                    compile_process.kill()
                                except:
                                    pass
                            res = {
                                'success': False,
                                'error': 'Compilation timed out',
                                'output': '',
                                'execution_time': timeout,
                                'memory_usage': 0,
                                'status': 'tle'
                            }
                            record_code_execution(language, 'tle', timeout)
                            return res
                        
                        if compile_process.returncode != 0:
                            res = {
                                'success': False,
                                'error': compile_stderr.decode(),
                                'output': '',
                                'execution_time': time.time() - start_time,
                                'memory_usage': 0,
                                'status': 'compilation_error'
                            }
                            record_code_execution(language, 'compilation_error', res['execution_time'])
                            return res
                        
                        # Run compiled binary
                        process = await asyncio.create_subprocess_exec(
                            output_file,
                            cwd=temp_dir,
                            stdin=asyncio.subprocess.PIPE,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        
                    else:
                        # Direct execution for Python/JavaScript
                        cmd = config['command'] + [filename]
                        process = await asyncio.create_subprocess_exec(
                            *cmd,
                            cwd=temp_dir,
                            stdin=asyncio.subprocess.PIPE,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )

                    # Execute with timeout
                    try:
                        stdout, stderr = await asyncio.wait_for(
                            process.communicate(input=input_data.encode()),
                            timeout=timeout
                        )
                        
                        execution_time = time.time() - start_time
                        
                        # Get memory usage
                        memory_usage = 0
                        try:
                            if process.pid:
                                ps_process = psutil.Process(process.pid)
                                memory_info = ps_process.memory_info()
                                memory_usage = memory_info.rss / 1024 / 1024
                        except:
                            pass
                        
                        if process.returncode == 0:
                            result = {
                                'success': True,
                                'output': stdout.decode().strip(),
                                'error': stderr.decode().strip(),
                                'execution_time': execution_time,
                                'memory_usage': memory_usage,
                                'status': 'completed'
                            }
                        else:
                            result = {
                                'success': False,
                                'output': stdout.decode().strip(),
                                'error': stderr.decode().strip(),
                                'execution_time': execution_time,
                                'memory_usage': memory_usage,
                                'status': 'runtime_error'
                            }
                        
                        record_code_execution(language, result['status'], execution_time)
                        return result

                    except asyncio.TimeoutError:
                        if process:
                            try:
                                kill_process_tree(process.pid)
                            except:
                                pass
                            try:
                                process.kill()
                            except:
                                pass
                        res = {
                            'success': False,
                            'error': f'Execution timed out after {timeout} seconds',
                            'output': '',
                            'execution_time': timeout,
                            'memory_usage': 0,
                            'status': 'tle'
                        }
                        record_code_execution(language, 'tle', timeout)
                        return res

                except Exception as e:
                    res = {
                        'success': False,
                        'error': str(e),
                        'output': '',
                        'execution_time': 0,
                        'memory_usage': 0,
                        'status': 'error'
                    }
                    record_code_execution(language, 'error', 0)
                    return res

    @staticmethod
    def calculate_similarity(code1: str, code2: str) -> float:
        """Calculate similarity between two code snippets"""
        # Normalize code
        normalized_code1 = CodeExecutorService._normalize_code(code1)
        normalized_code2 = CodeExecutorService._normalize_code(code2)
        
        # Use SequenceMatcher for similarity
        matcher = difflib.SequenceMatcher(None, normalized_code1, normalized_code2)
        return matcher.ratio()

    @staticmethod
    def _normalize_code(code: str) -> str:
        """Normalize code for plagiarism detection"""
        lines = []
        for line in code.split('\n'):
            # Remove comments
            if '//' in line:
                line = line[:line.index('//')]
            if '#' in line and not line.strip().startswith('#'):
                line = line[:line.index('#')]
            
            # Remove extra whitespace
            line = ' '.join(line.split())
            if line:
                lines.append(line)
        
        return '\n'.join(lines)

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Code Executor Service", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "code-executor"}

@app.post("/execute")
async def execute_code(request: CodeExecutionRequest):
    """Execute code and return results"""
    try:
        # Cap timeout between 2 and 300 seconds to prevent resource abuse
        exec_timeout = min(max(request.timeout or 3, 2), 300)
        result = await CodeExecutorService.execute_code(
            request.code,
            request.language,
            request.input,
            exec_timeout
        )
        if result.get('status') == 'tle':
            return JSONResponse(
                status_code=200,
                content={
                    "status": "tle",
                    "message": "Time Limit Exceeded"
                }
            )
        return ExecutionResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute-with-tests")
async def execute_code_with_tests(request: CodeExecutionWithTestsRequest):
    """Execute code and run test cases"""
    try:
        all_test_cases = []
        all_test_cases.extend(request.test_cases_basic or [])
        all_test_cases.extend(request.test_cases_advanced or [])
        all_test_cases.extend(request.test_cases_custom or [])
        
        # Track counts for separation
        basic_count = len(request.test_cases_basic or [])
        advanced_count = len(request.test_cases_advanced or [])
        custom_count = len(request.test_cases_custom or [])
        
        if not all_test_cases:
            raise HTTPException(status_code=400, detail="No test cases provided")

        language = request.language
        if language not in LANGUAGE_CONFIGS:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

        # Check code validation for security
        validation_result = CodeExecutorService.validate_code(request.code, language)
        if not validation_result['success']:
            err_msg = validation_result['error']
            
            basic_results = [TestResult(
                passed=False,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output='',
                error=err_msg,
                execution_time=0,
                console_output=''
            ) for tc in (request.test_cases_basic or [])]
            
            advanced_results = [TestResult(
                passed=False,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output='',
                error=err_msg,
                execution_time=0,
                console_output=''
            ) for tc in (request.test_cases_advanced or [])]
            
            custom_results = [TestResult(
                passed=False,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output='',
                error=err_msg,
                execution_time=0,
                console_output=''
            ) for tc in (request.test_cases_custom or [])]
            
            all_results = basic_results + advanced_results + custom_results
            
            return CodeExecutionResponse(
                execution_result=ExecutionResult(
                    success=False,
                    output='',
                    error=err_msg,
                    execution_time=0,
                    memory_usage=0,
                    status='security_error'
                ),
                test_results=all_results,
                total_passed=0,
                total_tests=len(all_results),
                basic_results=basic_results,
                advanced_results=advanced_results,
                custom_results=custom_results,
                basic_passed=0,
                advanced_passed=0,
                custom_passed=0
            )

        config = LANGUAGE_CONFIGS[language]
        # Cap timeout between 2 and 300 seconds to prevent resource abuse
        exec_timeout = min(max(request.timeout or 3, 2), 300)
        
        # 1. First, compile the code once if needed
        with tempfile.TemporaryDirectory() as temp_dir:
            if language == 'java':
                filename = "Solution.java"
            else:
                filename = f"solution{config['extension']}"
            
            filepath = os.path.join(temp_dir, filename)
            with open(filepath, 'w') as f:
                f.write(request.code)
                if language == 'python':
                    f.write(PYTHON_DRIVER_CODE)

            # Compilation step (if applicable)
            is_compiled = 'compile_command' in config
            if is_compiled:
                if language == 'java':
                    compile_cmd = config['compile_command'] + [filename]
                elif language in ['cpp', 'c']:
                    output_file = os.path.join(temp_dir, 'solution')
                    compile_cmd = config['compile_command'] + [output_file, filename]
                
                compile_process = await asyncio.create_subprocess_exec(
                    *compile_cmd,
                    cwd=temp_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                try:
                    stdout, stderr = await asyncio.wait_for(compile_process.communicate(), timeout=exec_timeout)
                except asyncio.TimeoutError:
                    if compile_process:
                        try:
                            kill_process_tree(compile_process.pid)
                        except:
                            pass
                        try:
                            compile_process.kill()
                        except:
                            pass
                    return JSONResponse(
                        status_code=200,
                        content={
                            "status": "tle",
                            "message": "Time Limit Exceeded"
                        }
                    )
                
                if compile_process.returncode != 0:
                    # Return error for all tests if compilation failed
                    error_result = TestResult(
                        passed=False,
                        input='',
                        expected_output='',
                        actual_output='',
                        error=stderr.decode(),
                        execution_time=0
                    )
                    
                    basic_results = [TestResult(
                        passed=False,
                        input=tc.input,
                        expected_output=tc.expected_output,
                        actual_output='',
                        error=stderr.decode(),
                        execution_time=0,
                        console_output=''
                    ) for tc in (request.test_cases_basic or [])]
                    
                    advanced_results = [TestResult(
                        passed=False,
                        input=tc.input,
                        expected_output=tc.expected_output,
                        actual_output='',
                        error=stderr.decode(),
                        execution_time=0,
                        console_output=''
                    ) for tc in (request.test_cases_advanced or [])]
                    
                    custom_results = [TestResult(
                        passed=False,
                        input=tc.input,
                        expected_output=tc.expected_output,
                        actual_output='',
                        error=stderr.decode(),
                        execution_time=0,
                        console_output=''
                    ) for tc in (request.test_cases_custom or [])]
                    
                    all_results = basic_results + advanced_results + custom_results
                    
                    return CodeExecutionResponse(
                        execution_result=ExecutionResult(
                            success=False,
                            output='',
                            error=stderr.decode(),
                            execution_time=0,
                            memory_usage=0,
                            status='compilation_error'
                        ),
                        test_results=all_results,
                        total_passed=0,
                        total_tests=len(all_results),
                        basic_results=basic_results,
                        advanced_results=advanced_results,
                        custom_results=custom_results,
                        basic_passed=0,
                        advanced_passed=0,
                        custom_passed=0
                    )

            # 2. Run all test cases using the compiled binary (or source for script langs)
            test_results = []
            passed_count = 0
            
            semaphore = asyncio.Semaphore(5)

            async def run_single_test_case(test_case):
                async with semaphore:
                    input_data = test_case.input
                    
                    start_time = time.time()
                    if language == 'java':
                        run_cmd = config['run_command'] + ['Solution']
                    elif language in ['cpp', 'c']:
                        run_cmd = [os.path.join(temp_dir, 'solution')]
                    else:
                        run_cmd = config['command'] + [filename]

                    process = await asyncio.create_subprocess_exec(
                        *run_cmd,
                        cwd=temp_dir,
                        stdin=asyncio.subprocess.PIPE,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )

                    try:
                        if input_data and not input_data.endswith('\n'):
                            input_data = input_data + '\n'

                        mem_task = asyncio.create_task(
                            process.communicate(input=input_data.encode())
                        )
                        
                        async def track_peak_memory(pid):
                            max_mem = 0
                            try:
                                ps_proc = psutil.Process(pid)
                                while process.returncode is None:
                                    try:
                                        mem = ps_proc.memory_info().rss / 1024 / 1024
                                        if mem > max_mem:
                                            max_mem = mem
                                    except Exception:
                                        pass
                                    await asyncio.sleep(0.05)
                            except Exception:
                                pass
                            return max_mem
                            
                        monitor_task = asyncio.create_task(track_peak_memory(process.pid))

                        stdout, stderr = await asyncio.wait_for(mem_task, timeout=exec_timeout)
                        execution_time = time.time() - start_time
                        memory_usage = await monitor_task


                        actual_output = stdout.decode().strip()
                        console_output = stderr.decode().strip()
                        expected_output = test_case.expected_output.strip()
                        
                        passed = actual_output == expected_output
                        error_msg = stderr.decode() if not passed and not console_output else ""

                        if passed and request.time_limit is not None and execution_time > request.time_limit:
                            error_msg = "Time Limit Exceeded"
                            limit_warning = json.dumps({
                                "status": "failed",
                                "reason": "Time Limit Exceeded",
                                "message": f"Program execution exceeded the configured time limit of {request.time_limit} seconds. Execution took {execution_time:.2f}s."
                            })
                            console_output = (console_output + "\n" + limit_warning).strip() if console_output else limit_warning
                        elif passed and request.memory_limit is not None and memory_usage > request.memory_limit:
                            error_msg = "Memory Limit Exceeded"
                            limit_warning = json.dumps({
                                "status": "failed",
                                "reason": "Memory Limit Exceeded",
                                "message": f"Program execution exceeded the configured memory limit of {request.memory_limit} MB. Used {memory_usage:.2f} MB."
                            })
                            console_output = (console_output + "\n" + limit_warning).strip() if console_output else limit_warning

                        return TestResult(
                            passed=passed,
                            input=test_case.input,
                            expected_output=expected_output,
                            actual_output=actual_output,
                            error=error_msg,
                            execution_time=execution_time,
                            memory_usage=memory_usage,
                            console_output=console_output
                        )
                    except asyncio.TimeoutError:
                        if process:
                            try:
                                kill_process_tree(process.pid)
                            except:
                                pass
                            try:
                                process.kill()
                            except:
                                pass
                        raise asyncio.TimeoutError()

            try:
                tasks = [run_single_test_case(tc) for tc in all_test_cases]
                test_results = await asyncio.gather(*tasks)
                passed_count = sum(1 for t in test_results if t.passed)
            except asyncio.TimeoutError:
                return JSONResponse(
                    status_code=200,
                    content={
                        "status": "tle",
                        "message": "Time Limit Exceeded"
                    }
                )

            # Determine basic_result (first test or summary)
            has_timeout = any(t.error == 'Timeout' for t in test_results)
            basic_result = ExecutionResult(
                success=passed_count == len(all_test_cases),
                output=test_results[0].actual_output if test_results else "",
                error="",
                execution_time=sum(t.execution_time for t in test_results) * 1000,  # convert to ms
                memory_usage=max((t.memory_usage for t in test_results), default=0),
                status='timeout' if has_timeout else 'completed'
            )

            # Separate results by type
            basic_results = test_results[:basic_count]
            advanced_results = test_results[basic_count:basic_count + advanced_count]
            custom_results = test_results[basic_count + advanced_count:]
            
            # Count passed tests by type
            basic_passed = sum(1 for result in basic_results if result.passed)
            advanced_passed = sum(1 for result in advanced_results if result.passed)
            custom_passed = sum(1 for result in custom_results if result.passed)

            return CodeExecutionResponse(
                execution_result=basic_result,
                test_results=test_results,
                total_passed=passed_count,
                total_tests=len(all_test_cases),
                basic_results=basic_results,
                advanced_results=advanced_results,
                custom_results=custom_results,
                basic_passed=basic_passed,
                advanced_passed=advanced_passed,
                custom_passed=custom_passed
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/supported-languages-and-templates")
async def get_supported_languages():
    """Get list of supported programming languages, their templates, and example problems"""
    return {
        "languages": list(LANGUAGE_CONFIGS.keys()),
        "details": {
            lang: {
                "extension": config["extension"],
                "timeout": config["timeout"],
                "template": config.get("template", "")
            }
            for lang, config in LANGUAGE_CONFIGS.items()
        },
        "example_problems": EXAMPLE_PROBLEMS
    }

# Example problems with solutions for all languages
EXAMPLE_PROBLEMS = [
    {
        "id": "reverse-string",
        "title": "Reverse a String",
        "description": "Write a function that reverses an input string. The input will be a single string on one line.",
        "test_cases": [
            {"input": "hello", "expected_output": "olleh"},
            {"input": "world", "expected_output": "dlrow"},
            {"input": "OpenAI", "expected_output": "IAnepO"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        input_str = args[0] if len(args) > 0 else ""
        return input_str[::-1]
''',
            "javascript": '''"use strict";
const fs = require('fs');
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    console.log(lines[0].split('').reverse().join(''));
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            System.out.println(new StringBuilder(s).reverse().toString());
        }
    }
}
''',
            "cpp": '''#include <iostream>
#include <string>
#include <algorithm>
using namespace std;
int main() {
    string s;
    if (getline(cin, s)) {
        reverse(s.begin(), s.end());
        cout << s << endl;
    }
    return 0;
}
''',
            "c": '''#include <stdio.h>
#include <string.h>
int main() {
    char s[1000];
    if (fgets(s, sizeof(s), stdin)) {
        s[strcspn(s, "\\n")] = 0;
        int len = strlen(s);
        for(int i = 0; i < len / 2; i++) {
            char t = s[i];
            s[i] = s[len - 1 - i];
            s[len - 1 - i] = t;
        }
        printf("%s\\n", s);
    }
    return 0;
}
'''
        }
    },
    {
        "id": "find-max",
        "title": "Find Maximum in Array",
        "description": "Find the largest element in an array of integers. Input is a JSON array like [1, 3, 7, 2, 5].",
        "test_cases": [
            {"input": "[1, 3, 7, 2, 5]", "expected_output": "7"},
            {"input": "[-1, -5, -2]", "expected_output": "-1"},
            {"input": "[42]", "expected_output": "42"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        arr = args[0] if len(args) > 0 else []
        if not arr: return None
        return max(arr)
''',
            "javascript": '''"use strict";
const fs = require('fs');
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    const arr = JSON.parse(lines[0]);
    console.log(Math.max(...arr));
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int max = Integer.MIN_VALUE;
            for(int i = 0; i < n; i++) {
                int v = sc.nextInt();
                if (v > max) max = v;
            }
            System.out.println(max);
        }
    }
}
''',
            "cpp": '''#include <iostream>
#include <climits>
using namespace std;
int main() {
    int n;
    if (cin >> n) {
        int maxVal = INT_MIN;
        for(int i = 0; i < n; i++) {
            int v; cin >> v;
            if (v > maxVal) maxVal = v;
        }
        cout << maxVal << endl;
    }
    return 0;
}
''',
            "c": '''#include <stdio.h>
#include <limits.h>
int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int maxVal = INT_MIN;
        for(int i = 0; i < n; i++) {
            int v; scanf("%d", &v);
            if (v > maxVal) maxVal = v;
        }
        printf("%d\\n", maxVal);
    }
    return 0;
}
'''
        }
    },
    {
        "id": "even-odd",
        "title": "Even or Odd",
        "description": "Given an integer, determine if it is even or odd. Output 'Even' or 'Odd'.",
        "test_cases": [
            {"input": "4", "expected_output": "Even"},
            {"input": "7", "expected_output": "Odd"},
            {"input": "0", "expected_output": "Even"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        num = args[0] if len(args) > 0 else 0
        return "Even" if num % 2 == 0 else "Odd"
''',
            "javascript": '''"use strict";
const fs = require('fs');
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    const num = parseInt(lines[0]);
    console.log(num % 2 === 0 ? "Even" : "Odd");
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            System.out.println(n % 2 == 0 ? "Even" : "Odd");
        }
    }
}
''',
            "cpp": '''#include <iostream>
using namespace std;
int main() {
    int n;
    if (cin >> n) {
        cout << (n % 2 == 0 ? "Even" : "Odd") << endl;
    }
    return 0;
}
''',
            "c": '''#include <stdio.h>
int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%s\\n", n % 2 == 0 ? "Even" : "Odd");
    }
    return 0;
}
'''
        }
    },
    {
        "id": "factorial",
        "title": "Factorial (Recursive)",
        "description": "Calculate the factorial of a non-negative integer n using recursion. factorial(n) = n * factorial(n-1), with factorial(0) = 1.",
        "test_cases": [
            {"input": "5", "expected_output": "120"},
            {"input": "0", "expected_output": "1"},
            {"input": "7", "expected_output": "5040"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        n = args[0] if len(args) > 0 else 0
        def factorial(x):
            if x <= 1: return 1
            return x * factorial(x - 1)
        return factorial(n)
''',
            "javascript": '''"use strict";
const fs = require('fs');
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    console.log(factorial(parseInt(lines[0])));
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    static long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            System.out.println(factorial(sc.nextInt()));
        }
    }
}
''',
            "cpp": '''#include <iostream>
using namespace std;
long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
int main() {
    int n;
    if (cin >> n) {
        cout << factorial(n) << endl;
    }
    return 0;
}
''',
            "c": '''#include <stdio.h>
long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%lld\\n", factorial(n));
    }
    return 0;
}
'''
        }
    },
    {
        "id": "fibonacci",
        "title": "Fibonacci (Recursive)",
        "description": "Calculate the nth Fibonacci number using recursion. fib(0)=0, fib(1)=1, fib(n)=fib(n-1)+fib(n-2).",
        "test_cases": [
            {"input": "6", "expected_output": "8"},
            {"input": "0", "expected_output": "0"},
            {"input": "10", "expected_output": "55"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        n = args[0] if len(args) > 0 else 0
        def fib(x):
            if x <= 0: return 0
            if x == 1: return 1
            return fib(x - 1) + fib(x - 2)
        return fib(n)
''',
            "javascript": '''"use strict";
const fs = require('fs');
function fib(n) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    return fib(n - 1) + fib(n - 2);
}
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    console.log(fib(parseInt(lines[0])));
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    static int fib(int n) {
        if (n <= 0) return 0;
        if (n == 1) return 1;
        return fib(n - 1) + fib(n - 2);
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            System.out.println(fib(sc.nextInt()));
        }
    }
}
''',
            "cpp": '''#include <iostream>
using namespace std;
int fib(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    return fib(n - 1) + fib(n - 2);
}
int main() {
    int n;
    if (cin >> n) {
        cout << fib(n) << endl;
    }
    return 0;
}
''',
            "c": '''#include <stdio.h>
int fib(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    return fib(n - 1) + fib(n - 2);
}
int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%d\\n", fib(n));
    }
    return 0;
}
'''
        }
    },
    {
        "id": "reverse-string-tle",
        "title": "Reverse a String (TLE)",
        "description": "Write a function that reverses an input string. This example intentionally exceeds the time limit to demonstrate the Time Limit Exceeded warning.",
        "test_cases": [
            {"input": "hello", "expected_output": "olleh"},
            {"input": "world", "expected_output": "dlrow"},
            {"input": "OpenAI", "expected_output": "IAnepO"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        import time
        time.sleep(11) # Intentionally exceed 10s limit
        input_str = args[0] if len(args) > 0 else ""
        return input_str[::-1]
''',
            "javascript": '''"use strict";
const fs = require('fs');
function solve() {
    const start = Date.now();
    while (Date.now() - start < 11000) {} // Intentionally exceed 10s limit
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    console.log(lines[0].split('').reverse().join(''));
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    public static void main(String[] args) {
        try {
            Thread.sleep(11000); // Intentionally exceed 10s limit
        } catch (InterruptedException e) {}
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            System.out.println(new StringBuilder(s).reverse().toString());
        }
    }
}
''',
            "cpp": '''#include <iostream>
#include <string>
#include <algorithm>
#include <thread>
#include <chrono>
using namespace std;
int main() {
    this_thread::sleep_for(chrono::seconds(11)); // Intentionally exceed 10s limit
    string s;
    if (getline(cin, s)) {
        reverse(s.begin(), s.end());
        cout << s << endl;
    }
    return 0;
}
''',
            "c": '''#include <stdio.h>
#include <string.h>
#include <unistd.h>
int main() {
    sleep(11); // Intentionally exceed 10s limit
    char s[1000];
    if (fgets(s, sizeof(s), stdin)) {
        s[strcspn(s, "\\n")] = 0;
        int len = strlen(s);
        for(int i = 0; i < len / 2; i++) {
            char t = s[i];
            s[i] = s[len - 1 - i];
            s[len - 1 - i] = t;
        }
        printf("%s\\n", s);
    }
    return 0;
}
'''
        }
    },
    {
        "id": "reverse-string-mle",
        "title": "Reverse a String (MLE)",
        "description": "Write a function that reverses an input string. This example intentionally exceeds the memory limit to demonstrate the Memory Limit Exceeded warning.",
        "test_cases": [
            {"input": "hello", "expected_output": "olleh"},
            {"input": "world", "expected_output": "dlrow"},
            {"input": "OpenAI", "expected_output": "IAnepO"},
        ],
        "solutions": {
            "python": '''class Solution:
    def solve(self, *args):
        a = bytearray(300 * 1024 * 1024) # Intentionally allocate ~300MB
        for i in range(100): a[i] = 1 # Touch memory
        input_str = args[0] if len(args) > 0 else ""
        return input_str[::-1]
''',
            "javascript": '''"use strict";
const fs = require('fs');
function solve() {
    const a = Buffer.alloc(300 * 1024 * 1024, 1); // Intentionally allocate ~300MB
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(l => l.trim());
    if (lines.length === 0) return;
    console.log(lines[0].split('').reverse().join(''));
}
solve();
''',
            "java": '''import java.util.*;
public class Solution {
    public static void main(String[] args) {
        byte[] a = new byte[300 * 1024 * 1024]; // Intentionally allocate ~300MB
        for (int i = 0; i < 100; i++) a[i] = 1;
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            System.out.println(new StringBuilder(s).reverse().toString());
        }
    }
}
''',
            "cpp": '''#include <iostream>
#include <string>
#include <algorithm>
#include <cstring>
using namespace std;
int main() {
    char* a = new char[300 * 1024 * 1024]; // Intentionally allocate ~300MB
    memset(a, 1, 300 * 1024 * 1024);
    string s;
    if (getline(cin, s)) {
        reverse(s.begin(), s.end());
        cout << s << endl;
    }
    delete[] a;
    return 0;
}
''',
            "c": '''#include <stdio.h>
#include <string.h>
#include <stdlib.h>
int main() {
    char* a = (char*)malloc(300 * 1024 * 1024); // Intentionally allocate ~300MB
    memset(a, 1, 300 * 1024 * 1024);
    char s[1000];
    if (fgets(s, sizeof(s), stdin)) {
        s[strcspn(s, "\\n")] = 0;
        int len = strlen(s);
        for(int i = 0; i < len / 2; i++) {
            char t = s[i];
            s[i] = s[len - 1 - i];
            s[len - 1 - i] = t;
        }
        printf("%s\\n", s);
    }
    free(a);
    return 0;
}
'''
        }
    }
]

# ─────────────────────────────────────────────────────────────
# Workspace & Terminal APIs
# ─────────────────────────────────────────────────────────────

WORKSPACES_ROOT = Path(os.environ.get("WORKSPACES_ROOT", "/workspaces"))

workspace_router = APIRouter(prefix="/workspace", tags=["workspace"])


def _workspace_dir(user_id: str, lab_id: str, sprint_id: str, evaluation_id: Optional[str] = None) -> Path:
    """Return the per-student workspace directory."""
    if evaluation_id:
        if lab_id == "knowledge":
            return WORKSPACES_ROOT / "evaluation" / evaluation_id / "users" / user_id / "labs" / lab_id / sprint_id
        return WORKSPACES_ROOT / "evaluation" / evaluation_id / "users" / user_id / "labs" / lab_id
    if lab_id == "knowledge":
        return WORKSPACES_ROOT / "labs" / lab_id / "users" / user_id / sprint_id
    return WORKSPACES_ROOT / "labs" / lab_id / "users" / user_id

def _safe_path(workspace: Path, relative: str) -> Path:
    """Resolve a relative path inside the workspace, raising 400 on path traversal."""
    # Strip leading slashes to prevent pathlib from treating it as absolute
    relative_path = relative.lstrip("/")
    resolved = (workspace / relative_path).resolve()
    if not str(resolved).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=400, detail="Path traversal not allowed")
    return resolved


def _build_tree(base: Path, rel: Path | None = None) -> dict:
    """Recursively build a JSON file-tree structure."""
    current = base if rel is None else base / rel
    name = current.name if rel else "/"
    if current.is_file():
        return {"name": name, "path": str(rel or Path(name)), "type": "file"}
    children = []
    try:
        for child in sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name)):
            if (
                child.name in [
                    ".bash_history",
                    ".git",
                    "problem.md",
                    "solution.md",
                    "yuvro_scoring_rules",
                    "scoring_rules",
                    "__pycache__",
                    "node_modules",
                ]
                or child.name.endswith(".pyc")
            ):
                continue
            child_rel = child.relative_to(base)
            children.append(_build_tree(base, child_rel))
    except PermissionError:
        pass
    return {"name": name, "path": str(rel or ""), "type": "directory", "children": children}


def _find_starter_repo(lab_id: str, evaluation_id: Optional[str] = None) -> Optional[Path]:
    candidate_dirs = []
    if evaluation_id:
        candidate_dirs.append(WORKSPACES_ROOT / "evaluation" / str(evaluation_id) / "labs" / str(lab_id))
    candidate_dirs.append(WORKSPACES_ROOT / "labs" / str(lab_id))

    for candidate in candidate_dirs:
        if not candidate.exists():
            continue
        if (candidate / ".git").exists() or any(f.is_file() for f in candidate.iterdir() if f.name not in (".git", "users")):
            return candidate
        for child in sorted(candidate.iterdir()):
            if child.is_dir() and child.name not in (".git", "users") and any(child.iterdir()):
                return child
    return None


def _is_workspace_incomplete(ws: Path, lab_id: str, evaluation_id: Optional[str] = None) -> bool:
    """Check if the workspace was partially seeded (e.g. single fallback file) while a full starter repo is available."""
    try:
        starter_src = _find_starter_repo(lab_id, evaluation_id)
        if not starter_src or not starter_src.exists():
            return False

        ignored_names = {'.git', 'yuvro_scoring_rules', 'problem.md', 'solution.md', 'users'}
        expected_items = [item.name for item in starter_src.iterdir() if item.name not in ignored_names]
        if not expected_items:
            return False

        missing = [name for name in expected_items if not (ws / name).exists()]
        return len(missing) > 0
    except Exception:
        return False


def _seed_from_starter_repo(ws: Path, lab_id: str, evaluation_id: Optional[str] = None) -> bool:
    """If starter repo is available, copy starter files to ws."""
    try:
        starter_src = _find_starter_repo(lab_id, evaluation_id)
        if starter_src and starter_src.exists():
            ignore = shutil.ignore_patterns('.git', 'yuvro_scoring_rules', 'problem.md', 'solution.md')
            for item in starter_src.iterdir():
                if item.name in ('.git', 'yuvro_scoring_rules', 'problem.md', 'solution.md'):
                    continue
                dst = ws / item.name
                if item.is_dir():
                    shutil.copytree(str(item), str(dst), ignore=ignore, dirs_exist_ok=True)
                else:
                    shutil.copy2(str(item), str(dst))
            try:
                if not (ws / ".git").exists():
                    subprocess.run(["git", "init"], cwd=str(ws), check=True, capture_output=True)
                subprocess.run(["git", "-c", "safe.directory=*", "add", "."], cwd=str(ws), check=True, capture_output=True)
                subprocess.run(["git", "-c", "safe.directory=*", "config", "user.email", "bot@yuvro.ai"], cwd=str(ws), check=True)
                subprocess.run(["git", "-c", "safe.directory=*", "config", "user.name", "Yuvro Bot"], cwd=str(ws), check=True)
                subprocess.run(["git", "-c", "safe.directory=*", "commit", "--allow-empty", "-m", "Initial commit for lab workspace"], cwd=str(ws), check=True, capture_output=True)
            except Exception:
                pass
            return True
    except Exception as e:
        print(f"Failed to auto-seed starter files into {ws}: {e}")
    return False


# Starter files seeded for each sprint on first access
DEFAULT_STARTERS: Dict[str, str] = {
    "script.sh": "#!/usr/bin/env bash\n\n# Write your solution here\n",
    "README.md": "# Lab Workspace\n\nThis is your personal workspace. Files persist across sessions.\n",
}


@workspace_router.get("/filetree")
async def get_file_tree(
    user_id: str = Query(...),
    lab_id: str = Query(...),
    sprint_id: Optional[str] = Query("", description="Sprint ID if applicable"),
    lab_type: Optional[str] = Query(None, description="Type of the lab (e.g. sqlite)"),
    starters: Optional[str] = Query(None, description="JSON map of filename->content to seed on first access"),
    evaluation_id: Optional[str] = Query(None, description="ID of the evaluation if this is an evaluation lab"),
):
    """
    Return the file tree for a student's workspace.
    Creates the workspace and seeds starter files if it doesn't exist yet.

    Seeding priority (for real labs that pass starters={}):
      1. Copy from the starter repo clone at labs/<lab_id>/<repo_name>/ (canonical new layout)
      2. Fall back to inline starters JSON if provided
      3. Leave empty if nothing available (Git Lab — students work in terminal)
    """
    ws = _workspace_dir(user_id, lab_id, sprint_id or "", evaluation_id)
    seeded = False
    if not ws.exists():
        ws.mkdir(parents=True, exist_ok=True)

        # Try seeding from starter repo first (canonical starter repo for evaluation / real labs)
        seeded = _seed_from_starter_repo(ws, lab_id, evaluation_id)
        if not seeded:
            # Fall back to inline starters provided by frontend if any
            seed_files: dict = {}
            if starters is not None:
                try:
                    seed_files = json.loads(starters)
                except Exception:
                    seed_files = {}

            if seed_files:
                for fname, content in seed_files.items():
                    fpath = ws / fname
                    fpath.parent.mkdir(parents=True, exist_ok=True)
                    fpath.write_text(content)
                seeded = True
    else:
        # Workspace already exists — check if it is empty (only .bash_history or .git)
        user_files = [
            f for f in ws.iterdir()
            if f.name not in (".bash_history", ".git") and (f.is_file() or (f.is_dir() and any(f.rglob("*"))))
        ]
        if not user_files or _is_workspace_incomplete(ws, lab_id, evaluation_id):
            seeded = _seed_from_starter_repo(ws, lab_id, evaluation_id)
            if not seeded and not user_files:
                seed_files = {}
                if starters is not None:
                    try:
                        seed_files = json.loads(starters)
                    except Exception:
                        seed_files = {}
                if seed_files:
                    for fname, content in seed_files.items():
                        fpath = ws / fname
                        fpath.parent.mkdir(parents=True, exist_ok=True)
                        fpath.write_text(content)
                    seeded = True

    tree = _build_tree(ws)
    return {"tree": tree, "seeded": seeded, "workspace": str(ws)}


@workspace_router.get("/file")
async def get_file(
    user_id: str = Query(...),
    lab_id: str = Query(...),
    path: str = Query(..., description="Relative file path inside workspace"),
    sprint_id: Optional[str] = Query("", description="Sprint ID if applicable"),
    evaluation_id: Optional[str] = Query(None, description="ID of the evaluation if this is an evaluation lab"),
):
    """Return the text content of a file in the student's workspace."""
    ws = _workspace_dir(user_id, lab_id, sprint_id or "", evaluation_id)
    fpath = _safe_path(ws, path)
    if not fpath.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    if not fpath.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {path}")
    try:
        content = fpath.read_text(errors="replace")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"path": path, "content": content}


class WriteFileRequest(BaseModel):
    user_id: str
    lab_id: str
    path: str
    content: str
    sprint_id: Optional[str] = ""
    evaluation_id: Optional[str] = None


@workspace_router.post("/file")
async def write_file(body: WriteFileRequest):
    """Create or overwrite a file in the student's workspace."""
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id or "", body.evaluation_id)
    ws.mkdir(parents=True, exist_ok=True)
    fpath = _safe_path(ws, body.path)
    fpath.parent.mkdir(parents=True, exist_ok=True)
    fpath.write_text(body.content)
    return {"ok": True, "path": body.path}


class DeleteFileRequest(BaseModel):
    user_id: str
    lab_id: str
    path: str
    sprint_id: Optional[str] = ""
    evaluation_id: Optional[str] = None


@workspace_router.delete("/file")
async def delete_file(body: DeleteFileRequest):
    """Delete a file or directory from the student's workspace."""
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id or "", body.evaluation_id)
    fpath = _safe_path(ws, body.path)
    if not fpath.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {body.path}")
    if fpath.is_dir():
        shutil.rmtree(fpath)
    else:
        fpath.unlink()
    return {"ok": True, "path": body.path}


class EvaluateRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: Optional[str] = ""
    required_command: str = ""
    task_slug: Optional[str] = None
    scoring_rules: dict = {} 
    evaluation_id: Optional[str] = None

@workspace_router.post("/evaluate")
def evaluate_task(body: EvaluateRequest):
    """
    Generic regex-based evaluation engine.
    Reads scoring_rules from the request body (originally stored in 
    LabSprintTicket.tasks[x].scoring_rules in the sprint JSON fixtures).
    
    scoring_rules schema:
    {
        "checks": [
            {
                "label": "Human readable description",
                "pattern": "<Python regex>",      # matched against each history line
                "count_mode": False,              # optional: count matching lines
                "min_count": 1                    # optional: minimum matches required
            }
        ],
        "file_checks": [
            {
                "label": "Human readable description",
                "file": "relative/path",          # workspace-relative path
                "exists": True,                   # optional: just check existence
                "contains": "substring"           # optional: check file content
            }
        ],
        "pass_message": "Success message",
        "fail_hint": "What to run if this fails"
    }
    """
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id, body.evaluation_id)
    history_file = ws / ".bash_history"
    rules = body.scoring_rules or {}
    has_history_checks = bool(rules.get("checks")) or (not rules and bool(body.required_command))
    
    if has_history_checks and not history_file.exists():
        return {"passed": False, "reason": "No command history found. Run commands in the in-browser terminal first."}
        
    try:
        lines = []
        if history_file.exists():
            content = history_file.read_text(errors="replace")
            lines = [line.strip() for line in content.splitlines() if line.strip()]
        
        # -- If no scoring_rules provided fall back to simple substring check --
        if not rules:
            passed = any(body.required_command in line for line in lines)
            return {"passed": passed, "reason": "Command found" if passed else "Command not found in history"}
            
        failed_labels: list[str] = []
        
        # -- History-based checks ---------------------------------------
        for check in rules.get("checks", []):
            pattern = check.get("pattern", "")
            label   = check.get("label", pattern)
            count_mode = check.get("count_mode", False)
            min_count = check.get("min_count", 1)
            
            try:
                compiled = _re.compile(pattern, _re.IGNORECASE)
            except _re.error as e:
                return {"passed": False, "reason": f"Invalid regex pattern '{pattern}': {e}"}
                
            if count_mode:
                # Count how many history lines match (e.g. for conventional commits)
                matches = sum(1 for line in lines if compiled.search(line))
                if matches < min_count:
                    failed_labels.append(f"{label} (need {min_count}, found {matches})")
            else:
                if not any(compiled.search(line) for line in lines):
                    failed_labels.append(label)
                    
        # -- File-based checks ------------------------------------------
        for fc in rules.get("file_checks", []):
            label = fc.get("label", "file check")
            rel_path = fc.get("file", "")
            check_exists = fc.get("exists", False)
            check_contains = fc.get("contains", None)
            check_not_contains = fc.get("does_not_contain", None)
            check_pattern = fc.get("pattern", None)
            
            target = ws / rel_path
            
            if check_exists or check_contains is not None or check_not_contains is not None or check_pattern is not None:
                if not target.exists():
                    failed_labels.append(f"{label} (file not found: {rel_path})")
                    continue
                
                try:
                    file_content = target.read_text(errors="replace")
                    
                    # Check contains
                    if check_contains is not None:
                        if isinstance(check_contains, list):
                            for needle in check_contains:
                                if needle not in file_content:
                                    failed_labels.append(f"{label} (missing '{needle}')")
                        elif check_contains not in file_content:
                            failed_labels.append(f"{label} (missing '{check_contains}')")
                            
                    # Check does_not_contain
                    if check_not_contains is not None:
                        if isinstance(check_not_contains, list):
                            for needle in check_not_contains:
                                if needle in file_content:
                                    failed_labels.append(f"{label} (should not contain '{needle}')")
                        elif check_not_contains in file_content:
                            failed_labels.append(f"{label} (should not contain '{check_not_contains}')")
                            
                    # Check regex pattern
                    if check_pattern is not None:
                        if not _re.search(check_pattern, file_content):
                            failed_labels.append(f"{label} (pattern match failed)")
                except Exception as e:
                    failed_labels.append(f"{label} (read error: {e})")
                        
        if failed_labels:
            hint = rules.get("fail_hint", "Missing requirements.")
            return {
                "passed": False,
                "reason": f"{hint}\nFailed checks:\n- " + "\n- ".join(failed_labels)
            }
            
        return {
            "passed": True,
            "reason": rules.get("pass_message", "All checks passed!")
        }
            
    except Exception as e:
        return {"passed": False, "reason": f"Error during task evaluation: {e}"}

class RunCommandRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: str
    command: str
    evaluation_id: Optional[str] = None

@workspace_router.post("/run_command")
async def run_command_endpoint(body: RunCommandRequest):
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id, body.evaluation_id)
    ws.mkdir(parents=True, exist_ok=True)
    
    try:
        proc = await asyncio.create_subprocess_shell(
            body.command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(ws)
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        return {
            "stdout": stdout.decode(errors="replace"),
            "stderr": stderr.decode(errors="replace"),
            "exit_code": proc.returncode
        }
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except:
            pass
        return {"stdout": "", "stderr": "Command timed out", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}

class RunTestCommandRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: Optional[str] = None
    command: str
    evaluation_id: Optional[str] = None

@workspace_router.post("/run_test_command")
async def run_test_command_endpoint(body: RunTestCommandRequest):
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id or "0", body.evaluation_id)
    ws.mkdir(parents=True, exist_ok=True)

    user_files = [
        f for f in ws.iterdir()
        if f.name not in (".bash_history", ".git") and (f.is_file() or (f.is_dir() and any(f.rglob("*"))))
    ]
    if not user_files or _is_workspace_incomplete(ws, body.lab_id, body.evaluation_id):
        _seed_from_starter_repo(ws, body.lab_id, body.evaluation_id)

    starter_scoring_rules = None
    if body.evaluation_id:
        lab_starter_dir = WORKSPACES_ROOT / "evaluation" / body.evaluation_id / "labs" / body.lab_id
    else:
        lab_starter_dir = WORKSPACES_ROOT / "labs" / body.lab_id

    if lab_starter_dir.exists():
        if (lab_starter_dir / "yuvro_scoring_rules").exists():
            starter_scoring_rules = lab_starter_dir / "yuvro_scoring_rules"
        else:
            for item in lab_starter_dir.iterdir():
                if item.is_dir() and (item / "yuvro_scoring_rules").exists():
                    starter_scoring_rules = item / "yuvro_scoring_rules"
                    break

    target_scoring_rules = ws / "yuvro_scoring_rules"
    mounted_rules = False

    try:
        if starter_scoring_rules and not target_scoring_rules.exists():
            shutil.copytree(starter_scoring_rules, target_scoring_rules)
            mounted_rules = True

        proc = await asyncio.create_subprocess_shell(
            body.command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(ws)
        )
        stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=30.0)
        stdout = stdout_bytes.decode(errors="replace")
        stderr = stderr_bytes.decode(errors="replace")
        exit_code = proc.returncode

        parsed_data = None
        try:
            parsed_data = json.loads(stdout.strip())
        except Exception:
            json_match = _re.search(r'(\{[\s\S]*"tasks"[\s\S]*\})', stdout)
            if json_match:
                try:
                    parsed_data = json.loads(json_match.group(1))
                except Exception:
                    pass

        total_score = 0
        max_possible_score = 100
        percentage = 0
        if isinstance(parsed_data, dict):
            total_score = parsed_data.get("total_score", 0)
            max_possible_score = parsed_data.get("max_possible_score", 100) or 100
            if max_possible_score > 0:
                percentage = int(round((total_score / max_possible_score) * 100))

        return {
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": exit_code,
            "data": parsed_data,
            "total_score": total_score,
            "max_possible_score": max_possible_score,
            "percentage": percentage
        }
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return {
            "stdout": "",
            "stderr": "Test command execution timed out (30s limit exceeded)",
            "exit_code": -1,
            "data": None,
            "total_score": 0,
            "max_possible_score": 100,
            "percentage": 0
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": -1,
            "data": None,
            "total_score": 0,
            "max_possible_score": 100,
            "percentage": 0
        }
    finally:
        if mounted_rules and target_scoring_rules.exists():
            shutil.rmtree(target_scoring_rules, ignore_errors=True)

@workspace_router.post("/database_run")
async def database_run_endpoint(body: DatabaseRunRequest):
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id, getattr(body, "evaluation_id", None))
    ws.mkdir(parents=True, exist_ok=True)
    
    try:
        evaluator = DatabaseEvaluatorFactory.get_evaluator(body.database_engine)
        result = await evaluator.execute(body, ws)
        return result
    except ValueError as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}

class DatabaseSubmitTask(BaseModel):
    task_id: str
    task_file: str
    expected_query: Optional[str] = None
    expected_output: Optional[str] = None
    scoring_rules: Optional[Dict[str, Any]] = None
    system_query: Optional[str] = None
    expected_result: Optional[str] = None

class DatabaseSubmitRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: str
    database_engine: str = "sqlite"
    db_file: str = "lab.db"
    evaluation_id: Optional[str] = None
    connection_url: Optional[str] = None
    tasks: List[DatabaseSubmitTask]

@workspace_router.post("/database_submit")
async def database_submit_endpoint(body: DatabaseSubmitRequest):
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id, getattr(body, "evaluation_id", None))
    ws.mkdir(parents=True, exist_ok=True)
    
    try:
        evaluator = DatabaseEvaluatorFactory.get_evaluator(body.database_engine)
        results = []
        total_earned = 0.0
        
        for task in body.tasks:
            task_body = DatabaseRunRequest(
                user_id=body.user_id,
                lab_id=body.lab_id,
                sprint_id=body.sprint_id,
                database_engine=body.database_engine,
                db_file=body.db_file,
                evaluation_id=body.evaluation_id,
                connection_url=body.connection_url,
                task_file=task.task_file,
                task_id=task.task_id,
                expected_query=task.expected_query,
                expected_output=task.expected_output,
                scoring_rules=task.scoring_rules,
                system_query=task.system_query,
                expected_result=task.expected_result
            )
            result = await evaluator.execute(task_body, ws)
            
            eval_data = result.get("evaluation", {})
            score = eval_data.get("final_score_pct", 0.0)
            is_passed = eval_data.get("passed", score >= 1.0)
            
            task_result = {
                "task_id": task.task_id,
                "task_file": task.task_file,
                "score": score,
                "passed": is_passed,
                "query_matches": eval_data.get("query_matches", False),
                "system_matches": eval_data.get("system_matches", False),
                "output_matches": eval_data.get("output_matches", False),
                "stdout": result.get("stdout", ""),
                "stderr": result.get("stderr", "")
            }
            results.append(task_result)
            total_earned += score
            
        max_score = float(len(body.tasks))
        final_percentage = (total_earned / max_score * 100) if max_score > 0 else 0
        
        return {
            "lab_score": total_earned,
            "max_score": max_score,
            "percentage": final_percentage,
            "tasks": results
        }
    except Exception as e:
        return {"error": str(e)}

class DatabaseEvaluateRequest(BaseModel):
    database_engine: str = "sqlite"
    user_id: Optional[str] = None
    lab_id: Optional[str] = None
    sprint_id: Optional[str] = None
    db_file: Optional[str] = None
    connection_url: Optional[str] = None
    user_query: str
    expected_query: str
    user_output: str
    expected_output: str
    scoring_rules: dict
    system_query: Optional[str] = None
    expected_result: Optional[str] = None
    evaluation_id: Optional[str] = None

@workspace_router.post("/database_evaluate")
async def database_evaluate_endpoint(body: DatabaseEvaluateRequest):
    try:
        evaluator = DatabaseEvaluatorFactory.get_evaluator(body.database_engine)
        
        actual_result = body.user_output
        if body.system_query and body.user_id and body.lab_id and body.sprint_id:
            ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id, body.evaluation_id)
            if ws.exists():
                actual_result = await evaluator.get_system_query_result(body, str(ws))

        eval_res = evaluator.evaluate(
            body=body,
            execution_result={
                "out_str": body.user_output,
                "actual_result": actual_result
            }
        )
        return eval_res
    except Exception as e:
        return {"error": str(e)}

class DatabaseCleanupRequest(BaseModel):
    database_engine: str = "mysql"
    connection_url: str
    evaluation_id: str
    user_id: str
    lab_id: str

@workspace_router.post("/database_cleanup")
async def database_cleanup_endpoint(body: DatabaseCleanupRequest):
    try:
        evaluator = DatabaseEvaluatorFactory.get_evaluator(body.database_engine)
        if hasattr(evaluator, "cleanup_evaluation_tables"):
            res = await asyncio.to_thread(
                evaluator.cleanup_evaluation_tables,
                body.connection_url,
                body.evaluation_id,
                body.user_id,
                body.lab_id
            )
            return res
        return {"status": "skipped", "message": f"{body.database_engine} does not require cleanup"}
    except Exception as e:
        return {"status": "error", "error": str(e)}



class UiValidateRequest(BaseModel):
    ticket_slug: str           # e.g. "ticket-01"
    user_html: str             # student's index.html content
    user_css: str = ""         # student's styles.css content
    user_js: str = ""         
    scoring_rules: dict = {}   
    lab_name: str = "frontend-portfolio"  # legacy fallback sub-folder under /workspaces/labs/
    lab_id: str = ""           # preferred: lab UUID → resolves labs/<lab_id>/<starter_repo>/tickets/<ticket_slug>/
    evaluation_id: Optional[str] = None


def _render_html_screenshot(html_content: str, css_content: str, width: int = 1280, height: int = 800) -> bytes:
    css_tag = f"<style>{css_content}</style>"
    if "<head>" in html_content:
        rendered_html = html_content.replace("</head>", f"{css_tag}</head>", 1)
    elif "<HEAD>" in html_content:
        rendered_html = html_content.replace("</HEAD>", f"{css_tag}</HEAD>", 1)
    else:
        rendered_html = f"{css_tag}{html_content}"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(rendered_html, wait_until="domcontentloaded")
        page.wait_for_timeout(600)  # let fonts / CSS transitions settle
        screenshot = page.screenshot(full_page=True)
        browser.close()

    return screenshot


def _structural_score(base_html: str, user_html: str) -> dict:
    """Check that the user's HTML contains the same tags and CSS classes as the base."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return {"score": 100.0, "checks": [{"name": "bs4 not installed", "passed": True, "reason": "skipped"}]}

    skip_tags = {"html", "head", "meta", "title", "body", "link", "style", "script"}
    base_soup = BeautifulSoup(base_html, "html.parser")
    user_soup = BeautifulSoup(user_html, "html.parser")

    checks = []
    passed = total = 0

    # Tag checks
    base_tags = {t.name for t in base_soup.find_all(True) if t.name not in skip_tags}
    user_tags  = {t.name for t in user_soup.find_all(True)}
    for tag in base_tags:
        total += 1
        ok = tag in user_tags
        if ok:
            passed += 1
        checks.append({"name": f"<{tag}> element", "passed": ok, "reason": "Found" if ok else "Missing"})

    # Class checks
    base_cls = {c for t in base_soup.find_all(True) for c in (t.get("class") or [])}
    user_cls  = {c for t in user_soup.find_all(True) for c in (t.get("class") or [])}
    for cls in base_cls:
        total += 1
        ok = cls in user_cls
        if ok:
            passed += 1
        checks.append({"name": f"class '{cls}'", "passed": ok, "reason": "Found" if ok else "Missing"})

    score = (passed / total * 100) if total > 0 else 100.0
    return {"score": score, "checks": checks}


def _evaluate_js(html_content: str, css_content: str, js_content: str, ticket_slug: str, js_checks: list = None) -> dict:


    if not js_content.strip():
        return {"score": 0.0, "checks": [{"name": "JavaScript file", "passed": False, "reason": "script.js is empty — nothing to evaluate"}]}

    # ── Resolve which checks to run ──────────────────────────────────────────
    _checks_by_ticket = {
        "ticket-01": ["year", "menu_toggle"],
        "ticket-02": ["year", "menu_toggle", "typed_effect"],
        "ticket-03": ["year", "menu_toggle", "typed_effect", "project_filter"],
        "ticket-04": ["year", "menu_toggle", "typed_effect", "project_filter", "contact_form"],
        "ticket-05": ["year", "menu_toggle", "typed_effect", "project_filter", "contact_form", "intersection_observer", "scroll_to_top"],
    }
    checks_to_run = js_checks if js_checks else _checks_by_ticket.get(ticket_slug, [])

    if not checks_to_run:
        return {"score": 100.0, "checks": [{"name": "No JS checks defined", "passed": True, "reason": "Ticket has no JS evaluation rules"}]}

    # ── Build rendered HTML ─────────────────────────────────────────────────
    css_tag = f"<style>{css_content}</style>"
    js_tag  = f"<script>{js_content}</script>"
    if "</head>" in html_content:
        rendered = html_content.replace("</head>", f"{css_tag}</head>", 1)
    elif "</HEAD>" in html_content:
        rendered = html_content.replace("</HEAD>", f"{css_tag}</HEAD>", 1)
    else:
        rendered = f"{css_tag}{html_content}"
    if "</body>" in rendered:
        rendered = rendered.replace("</body>", f"{js_tag}</body>", 1)
    elif "</BODY>" in rendered:
        rendered = rendered.replace("</BODY>", f"{js_tag}</BODY>", 1)
    else:
        rendered = f"{rendered}{js_tag}"

    checks = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # Capture any JS runtime errors
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))

        page.set_content(rendered, wait_until="domcontentloaded")
        page.wait_for_timeout(500)  # settle animations

        # ── Individual check functions ─────────────────────────────────────

        def check_year():
            try:
                curr = str(_dt.datetime.now().year)
                el_count = page.locator("#year").count()
                if el_count == 0:
                    return {"name": "Dynamic year (#year)", "passed": False, "reason": "No element with id='year' found in HTML"}
                text = page.locator("#year").first.text_content(timeout=1500) or ""
                ok = curr in text
                return {"name": "Dynamic year (#year)", "passed": ok,
                        "reason": f"Contains '{curr}'" if ok else f"#year shows '{text.strip()}' — expected current year {curr}"}
            except Exception as exc:
                return {"name": "Dynamic year (#year)", "passed": False, "reason": f"Error: {exc}"}

        def check_menu_toggle():
            try:
                btn_count = page.locator("#menuBtn").count()
                nav_count = page.locator(".nav-links").count()
                if btn_count == 0:
                    return {"name": "Mobile menu toggle (#menuBtn)", "passed": False, "reason": "No element with id='menuBtn' found"}
                if nav_count == 0:
                    return {"name": "Mobile menu toggle (#menuBtn)", "passed": False, "reason": "No element with class='nav-links' found"}
                page.locator("#menuBtn").first.evaluate("el => el.click()")
                page.wait_for_timeout(100)
                has_open = page.locator(".nav-links").first.evaluate("el => el.classList.contains('open')")
                if not has_open:
                    return {"name": "Mobile menu toggle (#menuBtn)", "passed": False, "reason": "Clicking #menuBtn did not add 'open' class to .nav-links"}
                # Toggle back
                page.locator("#menuBtn").first.evaluate("el => el.click()")
                page.wait_for_timeout(100)
                has_open2 = page.locator(".nav-links").first.evaluate("el => el.classList.contains('open')")
                ok = not has_open2  # should be removed after second click
                return {"name": "Mobile menu toggle (#menuBtn)", "passed": ok,
                        "reason": "Toggles 'open' class correctly" if ok else "Second click did not remove 'open' class"}
            except Exception as exc:
                return {"name": "Mobile menu toggle (#menuBtn)", "passed": False, "reason": f"Error: {exc}"}

        def check_typed_effect():
            try:
                el_count = page.locator(".typed").count()
                if el_count == 0:
                    return {"name": "Typed animation (.typed)", "passed": False, "reason": "No element with class='typed' found"}
                text_before = page.locator(".typed").first.text_content(timeout=1500) or ""
                page.wait_for_timeout(700)
                text_after = page.locator(".typed").first.text_content(timeout=1500) or ""
                ok = text_before != text_after
                return {"name": "Typed animation (.typed)", "passed": ok,
                        "reason": "Text changes over time ✓" if ok else f"Text did not change — still '{text_after}'. Ensure typing loop is running."}
            except Exception as exc:
                return {"name": "Typed animation (.typed)", "passed": False, "reason": f"Error: {exc}"}

        def check_project_filter():
            try:
                filter_count = page.locator(".filter").count()
                project_count = page.locator(".project").count()
                if filter_count == 0:
                    return {"name": "Project filters (.filter)", "passed": False, "reason": "No elements with class='filter' found"}
                if project_count == 0:
                    return {"name": "Project filters (.filter)", "passed": False, "reason": "No elements with class='project' found — needed to test filtering"}
                # Click a non-'all' filter
                non_all = page.locator(".filter:not([data-filter='all'])").first
                if non_all.count() == 0:
                    return {"name": "Project filters (.filter)", "passed": False, "reason": "No filter button with a category (non-'all') found"}
                non_all.click(timeout=1500)
                page.wait_for_timeout(150)
                hidden = page.locator(".project.hidden").count()
                is_active = non_all.evaluate("el => el.classList.contains('active')")
                ok = hidden > 0 and is_active
                return {"name": "Project filters (.filter)", "passed": ok,
                        "reason": f"Filter works: {hidden} projects hidden, button marked active ✓" if ok
                        else f"Filter failed — hidden={hidden}, button active={is_active}. Toggle .hidden on .project by data-cat."}
            except Exception as exc:
                return {"name": "Project filters (.filter)", "passed": False, "reason": f"Error: {exc}"}

        def check_contact_form():
            try:
                form_count = page.locator("#contactForm").count()
                note_count = page.locator("#formNote").count()
                if form_count == 0:
                    return {"name": "Contact form (#contactForm)", "passed": False, "reason": "No element with id='contactForm' found"}
                if note_count == 0:
                    return {"name": "Contact form (#contactForm)", "passed": False, "reason": "No element with id='formNote' found — needed for success message"}
                # Dispatch a real submit event (cancelable so preventDefault is meaningful)
                page.locator("#contactForm").first.evaluate(
                    "form => form.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}))"
                )
                page.wait_for_timeout(200)
                note_text = (page.locator("#formNote").first.text_content(timeout=1500) or "").strip()
                ok = len(note_text) > 5
                return {"name": "Contact form (#contactForm)", "passed": ok,
                        "reason": f"Shows success message: '{note_text}' ✓" if ok
                        else "No success message appeared in #formNote after submit. Call event.preventDefault() and set formNote.textContent."}
            except Exception as exc:
                return {"name": "Contact form (#contactForm)", "passed": False, "reason": f"Error: {exc}"}

        def check_intersection_observer():
            """
            After scrolling, .section/.stats elements should get the .visible class
            (IntersectionObserver reveal pattern).
            Elements must also have had .reveal added by JS first.
            """
            try:
                # Force intersection by scrolling and checking
                page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                page.wait_for_timeout(400)
                visible_count = page.locator(".section.visible, .stats.visible, .hero-visual.visible").count()
                reveal_count  = page.locator(".reveal").count()
                if reveal_count == 0:
                    return {"name": "Scroll reveal (IntersectionObserver)", "passed": False,
                            "reason": "No elements have .reveal class. Add it to .section, .stats, .hero-visual in JS before observing."}
                ok = visible_count > 0
                return {"name": "Scroll reveal (IntersectionObserver)", "passed": ok,
                        "reason": f"{visible_count} elements visible after scroll ✓" if ok
                        else "No .visible class added. Ensure IntersectionObserver callback adds .visible to intersecting entries."}
            except Exception as exc:
                return {"name": "Scroll reveal (IntersectionObserver)", "passed": False, "reason": f"Error: {exc}"}

        def check_scroll_to_top():
            """
            After scrolling > 500px, #toTop should have class 'show'.
            Clicking it should scroll back to top.
            """
            try:
                totop_count = page.locator("#toTop").count()
                if totop_count == 0:
                    return {"name": "Back-to-top (#toTop)", "passed": False, "reason": "No element with id='toTop' found"}
                # Scroll down 600px
                page.evaluate("window.scrollTo(0, 600)")
                page.wait_for_timeout(300)
                has_show = page.locator("#toTop").first.evaluate("el => el.classList.contains('show')")
                if not has_show:
                    return {"name": "Back-to-top (#toTop)", "passed": False,
                            "reason": "After scrolling 600px, #toTop does not have class 'show'. Listen to window 'scroll' and toggle .show when scrollY > 500."}
                return {"name": "Back-to-top (#toTop)", "passed": True, "reason": "Gets .show class when scrolled > 500px ✓"}
            except Exception as exc:
                return {"name": "Back-to-top (#toTop)", "passed": False, "reason": f"Error: {exc}"}

        # ── Dispatch checks in order ─────────────────────────────────────────
        _dispatch = {
            "year":                 check_year,
            "menu_toggle":          check_menu_toggle,
            "typed_effect":         check_typed_effect,
            "project_filter":       check_project_filter,
            "contact_form":         check_contact_form,
            "intersection_observer":check_intersection_observer,
            "scroll_to_top":        check_scroll_to_top,
        }
        for check_id in checks_to_run:
            fn = _dispatch.get(check_id)
            if fn:
                result = fn()
                checks.append(result)
                # Print each check result for easy debugging in container logs
                status = "✓ PASS" if result["passed"] else "✗ FAIL"
                print(f"  [js-check] {status} | {result['name']} — {result.get('reason','')}", flush=True)
            else:
                checks.append({"name": check_id, "passed": False, "reason": f"Unknown check '{check_id}'"})

        # Report any uncaught JS errors
        if js_errors:
            checks.append({
                "name": "JS runtime errors",
                "passed": False,
                "reason": "JS threw errors: " + "; ".join(js_errors[:3])
            })

        browser.close()

    total  = len(checks)
    passed = sum(1 for c in checks if c["passed"])
    score  = (passed / total * 100) if total > 0 else 0.0
    return {"score": score, "checks": checks}


@workspace_router.post("/ui-validate")
def ui_validate(body: UiValidateRequest):
    base_html_path: Optional[Path] = None

    # New canonical: labs/<lab_uuid>/<starter_repo_name>/tickets/<ticket_slug>/index.html
    if body.evaluation_id and body.lab_id:
        lab_dir = WORKSPACES_ROOT / "evaluation" / body.evaluation_id / "labs" / body.lab_id
    elif body.lab_id:
        lab_dir = WORKSPACES_ROOT / "labs" / body.lab_id
    else:
        lab_dir = None

    if lab_dir and lab_dir.exists():
        for child in lab_dir.iterdir():
            if child.is_dir() and child.name != "users":
                candidate = child / "tickets" / body.ticket_slug / "index.html"
                if candidate.exists():
                    base_html_path = candidate
                    break

    # Legacy fallback: labs/<lab_name>/tickets/<ticket_slug>/index.html
    if base_html_path is None:
        legacy = WORKSPACES_ROOT / "labs" / body.lab_name / "tickets" / body.ticket_slug / "index.html"
        if legacy.exists():
            base_html_path = legacy

    if base_html_path is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Base HTML not found for ticket '{body.ticket_slug}'. "
                f"Checked labs/{body.lab_id or ''}/<starter>/ and labs/{body.lab_name}/tickets/. "
                "Ensure the starter repo is cloned and contains a tickets/<ticket_slug>/index.html file."
            )
        )

    base_dir = base_html_path.parent
    base_html = base_html_path.read_text(errors="replace")
    # Try both CSS filename conventions used across tickets (styles.css vs style.css)
    base_css = ""
    base_css_used = ""
    for _css_name in ("styles.css", "style.css"):
        _p = base_dir / _css_name
        if _p.exists():
            base_css = _p.read_text(errors="replace")
            base_css_used = str(_p)
            break
            
    print(f"[ui-validate] Base HTML: {base_html_path}", flush=True)
    print(f"[ui-validate] Base CSS:  {base_css_used}", flush=True)

    # ── 2. Render screenshots (sync Playwright) ─────────────
    try:
        base_img_bytes = _render_html_screenshot(base_html, base_css)
        user_img_bytes = _render_html_screenshot(body.user_html, body.user_css)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playwright screenshot failed: {e}")

    # ── 3. ui-diff comparison ─────────────────────────────────────────────────
    ui_score = 0.0
    diff_b64 = ""
    try:
        import sys
        ui_diff_path = str(Path(__file__).parent / "ui-diff")
        if ui_diff_path not in sys.path:
            sys.path.insert(0, ui_diff_path)
        from ui_diff import compare
        from PIL import Image

        base_pil = Image.open(io.BytesIO(base_img_bytes)).convert("RGB")
        user_pil = Image.open(io.BytesIO(user_img_bytes)).convert("RGB")

        with tempfile.TemporaryDirectory() as tmpdir:
            diff_path = Path(tmpdir) / "diff.png"
            result = compare(expected=base_pil, actual=user_pil, diff_image_path=str(diff_path))
            ui_score = result.confidence_score
            if diff_path.exists():
                diff_b64 = base64.b64encode(diff_path.read_bytes()).decode()
    except Exception as e:
        print(f"[ui-validate] ui-diff error (using 0.0): {e}")

    # ── 4. Structural checks ──────────────────────────────────────────────────
    structural = _structural_score(base_html, body.user_html)
    _js_tickets = {"ticket-01", "ticket-02", "ticket-03", "ticket-04", "ticket-05"}
    js_score = 0.0
    if body.user_js and body.ticket_slug in _js_tickets:
        explicit_checks = (body.scoring_rules or {}).get("js_checks", None) if hasattr(body, "scoring_rules") else None
        js_result = _evaluate_js(
            body.user_html,
            body.user_css,
            body.user_js,
            body.ticket_slug,
            js_checks=explicit_checks,
        )
        js_score = js_result["score"]
        structural["checks"].extend(js_result["checks"])
        # Weight: structural HTML/CSS 30%, JS behavioral 70%
        structural["score"] = (structural["score"] * 0.3) + (js_result["score"] * 0.7)
        # NOTE: ui_score is ALWAYS the real Playwright pixel-diff result — NOT the JS score.
        # js_score is kept as a completely separate independent field.

    # ── 5. Return ─────────────────────────────────────────────────────────────
    
    print(f"ui-score: {ui_score}, js-score: {js_score}", flush=True)

    return {
        "ui_score":          ui_score,
        "js_score":          js_score,
        "structural_score":  structural["score"],
        "checks":            structural["checks"],
        "base_img_b64":      base64.b64encode(base_img_bytes).decode(),
        "user_img_b64":      base64.b64encode(user_img_bytes).decode(),
        "diff_img_b64":      diff_b64,
    }


async def _setup_github_remote(ws_dir: Path, user_id: str) -> None:
    """
    Fetch the student's GitHub integration from ylabs-backend-api and configure
    the workspace git remote so that `git push` goes to their GitHub repo.
    Silently skips if not configured or on any error.
    """
    backend_url = os.environ.get("YLABS_BACKEND_URL", "http://localhost:8002")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{backend_url}/api/lab/github-integration/",
                headers={"X-Internal-User-Id": user_id},
            )
            if resp.status_code != 200:
                return
            data = resp.json()
            if not data.get("connected"):
                return
            username = data.get("github_username", "")
            repo = data.get("github_repo", "")
            pat = data.get("pat", "")  # returned only in internal calls
            if not (username and repo and pat):
                return

            remote_url = f"https://{pat}@github.com/{username}/{repo}.git"

            # Ensure git is initialised in the workspace
            await asyncio.create_subprocess_exec(
                "git", "init",
                cwd=str(ws_dir),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )

            # Set or update the origin remote
            await asyncio.create_subprocess_exec(
                "git", "remote", "set-url", "origin", remote_url,
                cwd=str(ws_dir),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            
            # Configure git author
            await asyncio.create_subprocess_exec(
                "git", "config", "user.name", username,
                cwd=str(ws_dir),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.create_subprocess_exec(
                "git", "config", "user.email", f"{username}@users.noreply.github.com",
                cwd=str(ws_dir),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
    except Exception:
        pass  # Always fail silently — terminal should still open


# ─── WebSocket PTY Terminal ────────────────────────────────────────────────────

@workspace_router.websocket("/terminal")
async def terminal_ws(
    websocket: WebSocket,
    user_id: str = Query(...),
    lab_id: str = Query(...),
    sprint_id: str = Query(...),
    lab_type: Optional[str] = Query(None),
    evaluation_id: Optional[str] = Query(None, description="ID of the evaluation if this is an evaluation lab"),
):
    """
    WebSocket PTY terminal.
    Opens a real /bin/bash session inside the student's workspace directory.
    Messages from client → sent as stdin to bash.
    stdout/stderr from bash → sent back as text frames to client.
    """
    await websocket.accept()

    ws_dir = _workspace_dir(user_id, lab_id, sprint_id, evaluation_id)
    ws_dir.mkdir(parents=True, exist_ok=True)

    # --- Auto-configure git remote from GitHub integration (if any) ---
    await _setup_github_remote(ws_dir, user_id)

    # Try to use ptyprocess for full PTY (arrow keys, tab completion, etc.)
    # Fall back to simple subprocess pipes if unavailable.
    try:
        import ptyprocess
        USE_PTY = True
    except ImportError:
        USE_PTY = False

    if lab_type == "sqlite":
        bashrc_path = ws_dir / ".bashrc"
        wrapper_cmd = '''
sqlite3() {
    if [ $# -eq 0 ]; then
        command sqlite3
    else
        last_arg="${@: -1}"
        if [[ ! "$last_arg" == -* ]]; then
            touch -- "$last_arg" 2>/dev/null || true
        fi
        command sqlite3 "$@"
    fi
}
'''
        bash_profile_path = ws_dir / ".bash_profile"
        if not bash_profile_path.exists():
            bash_profile_path.write_text("if [ -f ~/.bashrc ]; then . ~/.bashrc; fi\n")

        if not bashrc_path.exists():
            bashrc_path.write_text(wrapper_cmd)
        else:
            current_bashrc = bashrc_path.read_text()
            if "alias sqlite3=" in current_bashrc:
                new_bashrc = "\n".join(line for line in current_bashrc.splitlines() if not line.startswith("alias sqlite3="))
                bashrc_path.write_text(new_bashrc)
            if "sqlite3()" not in bashrc_path.read_text():
                with bashrc_path.open("a") as f:
                    f.write("\n" + wrapper_cmd)

    env = {
        **os.environ, 
        "TERM": "xterm-256color", 
        "HOME": str(ws_dir),
        "PROMPT_COMMAND": "history -a"
    }

    if USE_PTY:
        import ptyprocess
        proc = ptyprocess.PtyProcessUnicode.spawn(
            ["/bin/bash", "--login"],
            cwd=str(ws_dir),
            env=env,
        )

        async def read_output():
            loop = asyncio.get_event_loop()
            while True:
                try:
                    data = await loop.run_in_executor(None, proc.read, 4096)
                    if data:
                        await websocket.send_text(data)
                except Exception:
                    break

        read_task = asyncio.create_task(read_output())
        try:
            while proc.isalive():
                try:
                    msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                    proc.write(msg)
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    break
        finally:
            read_task.cancel()
            try:
                proc.terminate(force=True)
            except Exception:
                pass
    else:
        # Fallback: simple subprocess with piped stdio (no PTY)
        proc = await asyncio.create_subprocess_exec(
            "/bin/bash", "--login",
            cwd=str(ws_dir),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        )

        async def read_stdout():
            while True:
                try:
                    chunk = await proc.stdout.read(4096)
                    if not chunk:
                        break
                    await websocket.send_text(chunk.decode(errors="replace"))
                except Exception:
                    break

        read_task = asyncio.create_task(read_stdout())
        try:
            while proc.returncode is None:
                try:
                    msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.05)
                    if proc.stdin:
                        proc.stdin.write(msg.encode())
                        await proc.stdin.drain()
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    break
        finally:
            read_task.cancel()
            try:
                proc.terminate()
            except Exception:
                pass

    await websocket.close()


# ─── Browser Preview Proxy ────────────────────────────────────────────────────
# Forwards the browser's preview request to a process running on the host
# (e.g. Django runserver bound to 0.0.0.0:8010 inside the workspace terminal).
# On dev/prod the workspace bash session runs inside this container, but the
# process binds on the HOST network namespace (port-mapped via docker-compose),
# so we reach it via host.docker.internal (requires extra_hosts in compose).
import urllib.request as _urllib_req
import urllib.error as _urllib_err
import socket as _socket

def _preview_hosts() -> list:
    """Return candidates to reach workspace processes."""
    hosts = ["127.0.0.1", "localhost"]
    try:
        host_ip = _socket.gethostbyname("host.docker.internal")
        if host_ip not in hosts:
            hosts.append(host_ip)
    except _socket.gaierror:
        pass
    return hosts

_recent_preview_ports: dict = {}

def _get_client_ip(request: Request) -> str:
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    fwd_for = request.headers.get("x-forwarded-for")
    if fwd_for:
        return fwd_for.split(",")[0].strip()
    return request.client.host if request.client else ""

@workspace_router.get("/preview")
@workspace_router.get("/preview/{subpath:path}")
async def workspace_preview_proxy(
    request: Request,
    port: int = Query(8000),
    subpath: str = "",
):
    target_path = "/" + subpath if subpath else "/"
    last_err = None
    client_ip = _get_client_ip(request)
    if client_ip:
        _recent_preview_ports[client_ip] = port

    is_secure = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )

    for host in _preview_hosts():
        target_url = f"http://{host}:{port}{target_path}"
        try:
            with _urllib_req.urlopen(_urllib_req.Request(target_url), timeout=5) as resp:
                content = resp.read()
                ctype = resp.headers.get("Content-Type", "text/html")
                from fastapi.responses import Response
                response = Response(content=content, media_type=ctype)
                response.set_cookie(
                    key="preview_port",
                    value=str(port),
                    path="/",
                    samesite="none" if is_secure else "lax",
                    secure=is_secure,
                    max_age=3600,
                )
                return response
        except Exception as e:
            last_err = e
            continue

    raise HTTPException(
        status_code=503,
        detail=f"Preview unavailable — no process listening on port {port} (last error: {last_err})"
    )


@app.middleware("http")
async def preview_cookie_proxy_middleware(request: Request, call_next):
    """Proxy sub-requests from preview iframes (e.g. /swagger/schema/, /static/*, /api/*) using preview_port, referer, or client session."""
    path = request.url.path
    if (
        path == "/health"
        or path == "/"
        or path.startswith("/workspace")
        or path.startswith("/execute")
        or path.startswith("/api/v1/proctoring")
        or path.startswith("/plagiarism")
        or path.startswith("/supported-languages")
        or path.startswith("/docs")
        or path.startswith("/openapi.json")
    ):
        return await call_next(request)

    port_str = request.cookies.get("preview_port") or request.query_params.get("port")

    # Fallback 1: Extract port from Referer header (e.g. when cookies are blocked in cross-site iframe)
    if not port_str:
        referer = request.headers.get("referer") or request.headers.get("referrer")
        if referer:
            try:
                from urllib.parse import urlparse, parse_qs
                parsed_query = parse_qs(urlparse(referer).query)
                if "port" in parsed_query and parsed_query["port"]:
                    port_str = parsed_query["port"][0]
            except Exception:
                pass

    # Fallback 2: Retrieve last accessed preview port for this client IP
    client_ip = _get_client_ip(request)
    if not port_str and client_ip and client_ip in _recent_preview_ports:
        port_str = str(_recent_preview_ports[client_ip])

    if port_str and str(port_str).isdigit():
        port = int(port_str)
        if client_ip:
            _recent_preview_ports[client_ip] = port

        query_string = str(request.url.query)
        subpath = path + (f"?{query_string}" if query_string else "")
        body = await request.body()
        req_headers = dict(request.headers)

        is_secure = (
            request.url.scheme == "https"
            or request.headers.get("x-forwarded-proto") == "https"
        )

        for host in _preview_hosts():
            target_url = f"http://{host}:{port}{subpath}"
            try:
                forward_headers = {
                    k: v for k, v in req_headers.items()
                    if k.lower() not in ["content-length", "host"]
                }
                forward_headers["host"] = f"localhost:{port}"
                req = _urllib_req.Request(
                    target_url,
                    data=body if body else None,
                    headers=forward_headers,
                    method=request.method,
                )
                with _urllib_req.urlopen(req, timeout=10) as resp:
                    resp_body = resp.read()
                    ctype = resp.headers.get("Content-Type", "application/json")
                    from fastapi.responses import Response
                    res = Response(
                        content=resp_body,
                        status_code=resp.status,
                        media_type=ctype,
                    )
                    res.set_cookie(
                        key="preview_port",
                        value=str(port),
                        path="/",
                        samesite="none" if is_secure else "lax",
                        secure=is_secure,
                        max_age=3600,
                    )
                    return res
            except _urllib_err.HTTPError as he:
                err_body = he.read()
                from fastapi.responses import Response
                err_res = Response(
                    content=err_body,
                    status_code=he.code,
                    media_type=he.headers.get("Content-Type", "application/json"),
                )
                err_res.set_cookie(
                    key="preview_port",
                    value=str(port),
                    path="/",
                    samesite="none" if is_secure else "lax",
                    secure=is_secure,
                    max_age=3600,
                )
                return err_res
            except Exception:
                continue

    return await call_next(request)


app.include_router(workspace_router)

# --- Face Verification Integration ---
from faceverification.face_verification import verify_candidate_face, enroll_face, analyze_face

proctoring_router = APIRouter()

@proctoring_router.post("/api/v1/proctoring/enroll")
async def enroll_single_face(
    image: UploadFile = File(..., description="Selfie to enroll")
):
    image_bytes = await image.read()
    result = await enroll_face(image_bytes)
    return result

@proctoring_router.post("/api/v1/proctoring/verify")
async def verify_single_face(
    probe_image: UploadFile = File(..., description="Live webcam frame"),
    reference_image: UploadFile = File(..., description="Enrolled reference selfie")
):
    probe_bytes = await probe_image.read()
    ref_bytes = await reference_image.read()
    result = await verify_candidate_face(ref_bytes, probe_bytes)
    return result

@proctoring_router.post("/api/v1/proctoring/analyze")
async def analyze_single_face(
    image: UploadFile = File(..., description="Live webcam frame")
):
    image_bytes = await image.read()
    result = await analyze_face(image_bytes)
    return result

@proctoring_router.post("/api/v1/proctoring/verify-batch")
async def verify_batch_faces(
    probe_images: List[UploadFile] = File(..., description="Array of photos taken during the exam"),
    reference_image: Optional[UploadFile] = File(None, description="Initial ID/Selfie taken before the exam")
):
    # Read the initial reference image if provided
    ref_bytes = await reference_image.read() if reference_image else b""
    
    # Read all exam probe images concurrently
    probe_bytes_list = [await img.read() for img in probe_images]
    
    # Process all images concurrently using the existing async function
    tasks = [
        verify_candidate_face(ref_bytes, p_bytes) 
        for p_bytes in probe_bytes_list
    ]
    
    # Wait for all comparisons to finish
    results = await asyncio.gather(*tasks)
    anomalies = []
    
    # Analyze the DeepFace results for proctoring violations
    for index, result in enumerate(results):
        flags = result.get("risk_flags", [])
        
        if "multiple_faces_detected" in flags:
            anomalies.append(f"Frame {index}: Multiple people detected in the frame.")
        elif "face_mismatch" in flags:
            anomalies.append(f"Frame {index}: A different person was detected (possible impersonation).")
        elif "no_face_detected" in flags:
            anomalies.append(f"Frame {index}: No person detected (candidate left the camera view).")
            
    if anomalies:
        return {
            "status": "failed",
            "message": "Proctoring violations detected during the exam.",
            "total_analyzed": len(probe_images),
            "anomalies": anomalies,
            "raw_results": results
        }
        
    return {
        "status": "passed",
        "message": "All exam frames matched the reference successfully. No violations found.",
        "total_analyzed": len(probe_images)
    }

app.include_router(proctoring_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
