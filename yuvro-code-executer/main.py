from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter, WebSocket, WebSocketDisconnect, Query
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
        "http://code-dev.yuvro.ai",
        "http://campus-dev.yuvro.ai",
        "http://backend-code-dev.yuvro.ai",
        "http://backend-campus-dev.yuvro.ai",
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
    query: str
    database_engine: str = "sqlite"
    db_file: str = "lab.db"
    expected_query: Optional[str] = None
    expected_output: Optional[str] = None
    scoring_rules: Optional[Dict[str, Any]] = None
    system_query: Optional[str] = None
    expected_result: Optional[str] = None

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


def _workspace_dir(user_id: str, lab_id: str, sprint_id: str) -> Path:
    """Return the per-student workspace directory."""
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
            if child.name in [".bash_history", ".git"]:
                continue
            child_rel = child.relative_to(base)
            children.append(_build_tree(base, child_rel))
    except PermissionError:
        pass
    return {"name": name, "path": str(rel or ""), "type": "directory", "children": children}


# Starter files seeded for each sprint on first access
DEFAULT_STARTERS: Dict[str, str] = {
    "script.sh": "#!/usr/bin/env bash\n\n# Write your solution here\n",
    "README.md": "# Lab Workspace\n\nThis is your personal workspace. Files persist across sessions.\n",
}


@workspace_router.get("/filetree")
async def get_file_tree(
    user_id: str = Query(...),
    lab_id: str = Query(...),
    sprint_id: str = Query(...),
    lab_type: Optional[str] = Query(None, description="Type of the lab (e.g. sqlite)"),
    starters: Optional[str] = Query(None, description="JSON map of filename->content to seed on first access"),
):
    """
    Return the file tree for a student's workspace.
    Creates the workspace and seeds starter files if it doesn't exist yet.
    """
    ws = _workspace_dir(user_id, lab_id, sprint_id)
    seeded = False

    if not ws.exists():
        ws.mkdir(parents=True, exist_ok=True)
        if starters is not None:
            try:
                seed_files = json.loads(starters)
            except Exception:
                seed_files = DEFAULT_STARTERS.copy()
        else:
            seed_files = DEFAULT_STARTERS.copy()
            
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
    sprint_id: str = Query(...),
    path: str = Query(..., description="Relative file path inside workspace"),
):
    """Return the text content of a file in the student's workspace."""
    ws = _workspace_dir(user_id, lab_id, sprint_id)
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
    sprint_id: str
    path: str
    content: str


@workspace_router.post("/file")
async def write_file(body: WriteFileRequest):
    """Create or overwrite a file in the student's workspace."""
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id)
    ws.mkdir(parents=True, exist_ok=True)
    fpath = _safe_path(ws, body.path)
    fpath.parent.mkdir(parents=True, exist_ok=True)
    fpath.write_text(body.content)
    return {"ok": True, "path": body.path}


class DeleteFileRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: str
    path: str


@workspace_router.delete("/file")
async def delete_file(body: DeleteFileRequest):
    """Delete a file or directory from the student's workspace."""
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id)
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
    sprint_id: str
    required_command: str = ""
    task_slug: Optional[str] = None
    scoring_rules: dict = {}  # populated from the task's scoring_rules JSON field

@workspace_router.post("/evaluate")
async def evaluate_task(body: EvaluateRequest):
    """
    Check if a specific command string exists in the workspace's .bash_history
    """
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id)
    history_file = ws / ".bash_history"
    
    if not history_file.exists():
        return {"passed": False, "reason": "No bash history found"}
        
    try:
        content = history_file.read_text(errors="replace")
        lines = [line.strip() for line in content.splitlines()]
        
        # Simple substring match on each line
        passed = any(body.required_command in line for line in lines)
        return {"passed": passed, "reason": "Command found" if passed else "Command not found in history"}
    except Exception as e:
        return {"passed": False, "reason": f"Error reading history: {e}"}

class RunCommandRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: str
    command: str

@workspace_router.post("/run_command")
async def run_command_endpoint(body: RunCommandRequest):
    """
    Execute a raw command inside the sprint's workspace.
    """
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id)
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

@workspace_router.post("/database_run")
async def database_run_endpoint(body: DatabaseRunRequest):
    """
    Execute a raw database query inside the sprint's workspace and evaluate if scoring rules provided.
    """
    ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id)
    ws.mkdir(parents=True, exist_ok=True)
    
    try:
        evaluator = DatabaseEvaluatorFactory.get_evaluator(body.database_engine)
        result = await evaluator.execute(body, ws)
        return result
    except ValueError as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}

class SqliteEvaluateRequest(BaseModel):
    user_id: Optional[str] = None
    lab_id: Optional[str] = None
    sprint_id: Optional[str] = None
    db_file: Optional[str] = None
    user_query: str
    expected_query: str
    user_output: str
    expected_output: str
    scoring_rules: dict
    system_query: Optional[str] = None
    expected_result: Optional[str] = None

@workspace_router.post("/evaluate_sql")
async def evaluate_sql_endpoint(body: SqliteEvaluateRequest):
    """
    Evaluate a raw SQLite query against expected outputs.
    """
    try:
        actual_result = body.user_output
        if body.system_query and body.user_id and body.lab_id and body.sprint_id:
            ws = _workspace_dir(body.user_id, body.lab_id, body.sprint_id)
            if ws.exists():
                db_file = body.db_file
                if not db_file:
                    db_files = list(ws.glob("*.db"))
                    if db_files:
                        db_file = db_files[0].name
                    else:
                        db_file = "lab.db"
                        
                import tempfile
                import asyncio
                import os
                with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
                    f.write(body.system_query)
                    temp_path = f.name
                
                proc = await asyncio.create_subprocess_shell(
                    f'sqlite3 "{db_file}" < "{temp_path}"',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=str(ws)
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
                
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
                if proc.returncode == 0:
                    actual_result = stdout.decode().strip()
                else:
                    actual_result = stderr.decode().strip()

        eval_res = evaluate_sql_submission(
            user_query=body.user_query,
            expected_query=body.expected_query,
            user_output=body.user_output,
            expected_output=body.expected_output,
            scoring_rules=body.scoring_rules,
            system_query=body.system_query,
            expected_result=body.expected_result,
            actual_result=actual_result
        )
        return eval_res
    except Exception as e:
        return {"error": str(e)}

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
):
    """
    WebSocket PTY terminal.
    Opens a real /bin/bash session inside the student's workspace directory.
    Messages from client → sent as stdin to bash.
    stdout/stderr from bash → sent back as text frames to client.
    """
    await websocket.accept()

    ws_dir = _workspace_dir(user_id, lab_id, sprint_id)
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