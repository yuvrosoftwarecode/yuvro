from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import subprocess
import tempfile
import os
import time
import psutil
import difflib
import asyncio
import json
from observability import setup_telemetry, instrument_fastapi_app, get_tracer, record_code_execution

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
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        # Dev environment (AWS) - all subdomains
        "https://code-dev.yuvro.ai",
        "https://campus-dev.yuvro.ai",
        "https://backend-code-dev.yuvro.ai",
        "https://backend-campus-dev.yuvro.ai",
        "https://code-executer-dev.yuvro.ai",
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
    }
]

# --- Face Verification Integration ---
from faceverification.face_verification import verify_candidate_face

proctoring_router = APIRouter()

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