from fastapi import FastAPI, HTTPException
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
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],  # Configure this properly in production
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
    @staticmethod
    async def execute_code(code: str, language: str, input_data: str = "", timeout: int = 10) -> Dict[str, Any]:
        """Execute code and return results"""
        if language in ['cpp', 'c', 'java']:
            try:
                processed_lines = []
                for line in input_data.split('\n'):
                    line = line.strip()
                    if not line: continue
                    try:
                        data = json.loads(line)
                        if isinstance(data, list):
                            processed_lines.append(str(len(data)))
                            processed_lines.append(" ".join(map(str, data)))
                        else:
                            processed_lines.append(str(data))
                    except:
                        # Fallback for Malformed or string-quoted arrays like "[1, 2, 3]"
                        if line.startswith('[') and line.endswith(']'):
                            # remove brackets and commas
                            content = line[1:-1].replace(',', ' ')
                            parts = content.split()
                            if parts:
                                processed_lines.append(str(len(parts)))
                                processed_lines.append(" ".join(parts))
                            else:
                                processed_lines.append(line)
                        else:
                            processed_lines.append(line)
                if processed_lines:
                    input_data = "\n".join(processed_lines)
            except:
                pass

        if language not in LANGUAGE_CONFIGS:
            return {
                'success': False,
                'error': f'Unsupported language: {language}',
                'output': '',
                'execution_time': 0,
                'memory_usage': 0,
                'status': 'error'
            }

        config = LANGUAGE_CONFIGS[language]

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
                        
                        compile_stdout, compile_stderr = await asyncio.wait_for(
                            compile_process.communicate(), timeout=timeout
                        )
                        
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
                        
                        compile_stdout, compile_stderr = await asyncio.wait_for(
                            compile_process.communicate(), timeout=timeout
                        )
                        
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
                                process.kill()
                            except:
                                pass
                        res = {
                            'success': False,
                            'error': f'Execution timed out after {timeout} seconds',
                            'output': '',
                            'execution_time': timeout,
                            'memory_usage': 0,
                            'status': 'timeout'
                        }
                        record_code_execution(language, 'timeout', timeout)
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

@app.post("/execute", response_model=ExecutionResult)
async def execute_code(request: CodeExecutionRequest):
    """Execute code and return results"""
    try:
        result = await CodeExecutorService.execute_code(
            request.code,
            request.language,
            request.input,
            request.timeout
        )
        return ExecutionResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute-with-tests", response_model=CodeExecutionResponse)
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

        config = LANGUAGE_CONFIGS[language]
        
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
                stdout, stderr = await asyncio.wait_for(compile_process.communicate(), timeout=request.timeout)
                
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

            for test_case in all_test_cases:
                # Pre-process input for this test case
                input_data = test_case.input
                if language in ['cpp', 'c', 'java']:
                    try:
                        processed_lines = []
                        for line in input_data.split('\n'):
                            line = line.strip()
                            if not line: continue
                            try:
                                data = json.loads(line)
                                if isinstance(data, list):
                                    processed_lines.append(str(len(data)))
                                    processed_lines.append(" ".join(map(str, data)))
                                else:
                                    processed_lines.append(str(data))
                            except:
                                if line.startswith('[') and line.endswith(']'):
                                    content = line[1:-1].replace(',', ' ')
                                    parts = content.split()
                                    if parts:
                                        processed_lines.append(str(len(parts)))
                                        processed_lines.append(" ".join(parts))
                                    else:
                                        processed_lines.append(line)
                                else:
                                    processed_lines.append(line)
                        if processed_lines:
                            input_data = "\n".join(processed_lines)
                    except:
                        pass

                # Run process
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
                    # Ensure input ends with newline
                    if input_data and not input_data.endswith('\n'):
                        input_data = input_data + '\n'
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(input=input_data.encode()),
                        timeout=request.timeout
                    )
                    execution_time = time.time() - start_time


                    actual_output = stdout.decode().strip()
                    console_output = stderr.decode().strip()  # Console output from print statements
                    expected_output = test_case.expected_output.strip()
                    
                    passed = actual_output == expected_output
                    if passed: passed_count += 1
                    
                    test_results.append(TestResult(
                        passed=passed,
                        input=test_case.input,
                        expected_output=expected_output,
                        actual_output=actual_output,
                        error=stderr.decode() if not passed and not console_output else "",
                        execution_time=execution_time,
                        console_output=console_output
                    ))
                except asyncio.TimeoutError:
                    try: process.kill()
                    except: pass
                    test_results.append(TestResult(
                        passed=False,
                        input=test_case.input,
                        expected_output=test_case.expected_output,
                        actual_output='',
                        error='Timeout',
                        execution_time=request.timeout,
                        console_output=''
                    ))

            # Determine basic_result (first test or summary)
            basic_result = ExecutionResult(
                success=passed_count == len(all_test_cases),
                output=test_results[0].actual_output if test_results else "",
                error="",
                execution_time=sum(t.execution_time for t in test_results),
                memory_usage=0,
                status='completed'
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)