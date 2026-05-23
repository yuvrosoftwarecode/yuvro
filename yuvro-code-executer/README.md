# Code Executor FastAPI Service

A high-performance, lightweight FastAPI service for executing code in multiple programming languages with built-in test case validation and plagiarism detection.

## Features

### 🚀 Multi-Language Support
- **Python** - Direct interpretation with Python 3.x
- **JavaScript** - Node.js runtime execution
- **Java** - Compile and run with OpenJDK
- **C++** - GCC compilation and execution
- **C** - GCC compilation and execution

### ⚡ Performance Optimized
- Asynchronous code execution
- Configurable timeouts and resource limits
- Memory usage monitoring
- Fast compilation and execution

### 🧪 Test Case Management
- Run multiple test cases against code
- Compare expected vs actual output
- Detailed test results with timing
- Weighted test case support

### 🔍 Plagiarism Detection
- Code similarity analysis
- Normalized code comparison
- Configurable similarity thresholds
- Automatic flagging of suspicious submissions

### 🔒 Security Features
- Isolated execution environment
- Resource limits (CPU, memory, time)
- Input sanitization
- Secure temporary file handling

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Supported Languages
```
GET /supported-languages
```
Returns list of supported programming languages and their configurations.

### Execute Code
```
POST /execute
```
Execute code and return basic results.

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "input": "",
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello World",
  "error": "",
  "execution_time": 0.123,
  "memory_usage": 12.5,
  "status": "completed"
}
```

### Execute with Test Cases
```
POST /execute-with-tests
```
Execute code against multiple test cases.

**Request Body:**
```json
{
  "code": "n = int(input())\nprint(n * 2)",
  "language": "python",
  "test_cases": [
    {
      "input": "5",
      "expected_output": "10",
      "weight": 1
    }
  ],
  "timeout": 10
}
```

**Response:**
```json
{
  "execution_result": {
    "success": true,
    "output": "10",
    "error": "",
    "execution_time": 0.045,
    "memory_usage": 8.2,
    "status": "completed"
  },
  "test_results": [
    {
      "passed": true,
      "input": "5",
      "expected_output": "10",
      "actual_output": "10",
      "error": "",
      "execution_time": 0.045
    }
  ],
  "total_passed": 1,
  "total_tests": 1,
  "plagiarism_score": 0.0
}
```

### Plagiarism Check
```
POST /plagiarism-check
```
Check similarity between two code snippets.

**Request Body:**
```json
{
  "code1": "def hello(): return 'Hello'",
  "code2": "def greet(): return 'Hello'",
  "language": "python"
}
```

**Response:**
```json
{
  "similarity_score": 0.85,
  "flagged": true
}
```

## Installation & Setup

### Local Development

1. **Install Dependencies**
```bash
cd yuvro-code-executer
pip install -r requirements.txt
```

2. **Install Language Runtimes**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3 nodejs npm default-jdk gcc g++

# macOS
brew install python3 node openjdk gcc
```

3. **Run the Service**
```bash
python run_server.py
```

The service will be available at `http://localhost:8009`

### Docker Deployment

1. **Build the Image**
```bash
docker build -t yuvro-code-executer .
```

2. **Run the Container**
```bash
docker run -p 8009:8009 yuvro-code-executer
```

### Docker Compose

The service is included in the main docker-compose.yml:

```bash
docker-compose up code-executor
```

## Testing

Run the test script to verify all functionality:

```bash
python test_service.py
```

This will test:
- Health check endpoint
- Language support
- Python code execution
- Java code execution
- Test case validation
- Plagiarism detection

## Configuration

### Environment Variables

- `SERVICE_PORT` - Port to run the service (default: 8009)
- `DEBUG` - Enable debug mode (default: false)
- `DEFAULT_TIMEOUT` - Default execution timeout in seconds (default: 10)
- `MAX_TIMEOUT` - Maximum allowed timeout (default: 30)
- `MAX_MEMORY_MB` - Maximum memory usage in MB (default: 256)

### Language Timeouts

- Python/JavaScript: 10 seconds
- Java/C++/C: 15 seconds (includes compilation time)

## Integration

### Frontend Integration

The service integrates seamlessly with the React frontend:

```typescript
const response = await fetch('http://localhost:8009/execute-with-tests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: userCode,
    language: selectedLanguage,
    test_cases: testCases,
    input: "",
    timeout: 15
  })
});
```

### Backend Integration

Can be used alongside the Django backend for:
- Storing submission results
- User management
- Course integration
- Historical data

## Performance

### Benchmarks
- Python execution: ~50ms average
- JavaScript execution: ~60ms average  
- Java compilation + execution: ~800ms average
- C++ compilation + execution: ~400ms average
- C compilation + execution: ~300ms average

### Scalability
- Handles concurrent executions
- Automatic resource cleanup
- Memory-efficient temporary file handling
- Asynchronous processing

## Security Considerations

1. **Isolation**: Each code execution runs in a separate process
2. **Timeouts**: Prevents infinite loops and long-running processes
3. **Resource Limits**: Memory and CPU usage monitoring
4. **Input Validation**: All inputs are validated and sanitized
5. **Temporary Files**: Secure creation and cleanup of temporary files

## Troubleshooting

### Common Issues

1. **Language Runtime Not Found**
   - Ensure all required runtimes are installed
   - Check PATH environment variable

2. **Permission Denied**
   - Verify write permissions for temporary directories
   - Check executable permissions for compiled binaries

3. **Timeout Errors**
   - Increase timeout values for complex code
   - Optimize code for better performance

4. **Memory Issues**
   - Monitor system memory usage
   - Adjust MAX_MEMORY_MB setting

### Logs

Enable debug mode to see detailed execution logs:
```bash
DEBUG=true python run_server.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

This project is part of the YC Learning Management System.