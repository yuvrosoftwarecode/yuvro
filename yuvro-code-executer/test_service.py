#!/usr/bin/env python3
"""
Simple test script for the Code Executor FastAPI service
"""
import requests
import json

BASE_URL = "http://localhost:8002"

def test_health():
    """Test health endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health check: {response.status_code} - {response.json()}")

def test_supported_languages():
    """Test supported languages endpoint"""
    response = requests.get(f"{BASE_URL}/supported-languages")
    print(f"Supported languages: {response.json()}")

def test_python_execution():
    """Test Python code execution"""
    code = """
def hello():
    return "Hello, World!"

print(hello())
"""
    
    payload = {
        "code": code,
        "language": "python",
        "input": "",
        "timeout": 10
    }
    
    response = requests.post(f"{BASE_URL}/execute", json=payload)
    print(f"Python execution: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_java_execution():
    """Test Java code execution"""
    code = """
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
"""
    
    payload = {
        "code": code,
        "language": "java",
        "input": "",
        "timeout": 15
    }
    
    response = requests.post(f"{BASE_URL}/execute", json=payload)
    print(f"Java execution: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_with_test_cases():
    """Test code execution with test cases"""
    code = """
def add_numbers(a, b):
    return a + b

# Read input
line = input().strip()
a, b = map(int, line.split())
print(add_numbers(a, b))
"""
    
    payload = {
        "code": code,
        "language": "python",
        "test_cases": [
            {
                "input": "2 3",
                "expected_output": "5",
                "weight": 1
            },
            {
                "input": "10 20",
                "expected_output": "30",
                "weight": 1
            },
            {
                "input": "-5 5",
                "expected_output": "0",
                "weight": 1
            }
        ],
        "timeout": 10
    }
    
    response = requests.post(f"{BASE_URL}/execute-with-tests", json=payload)
    print(f"Test cases execution: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_plagiarism_check():
    """Test plagiarism detection"""
    code1 = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
"""
    
    code2 = """
def fib(num):
    if num <= 1:
        return num
    return fib(num-1) + fib(num-2)

print(fib(10))
"""
    
    payload = {
        "code1": code1,
        "code2": code2,
        "language": "python"
    }
    
    response = requests.post(f"{BASE_URL}/plagiarism-check", json=payload)
    print(f"Plagiarism check: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Testing Code Executor FastAPI Service")
    print("=" * 50)
    
    try:
        test_health()
        print()
        
        test_supported_languages()
        print()
        
        test_python_execution()
        print()
        
        test_java_execution()
        print()
        
        test_with_test_cases()
        print()
        
        test_plagiarism_check()
        print()
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the service. Make sure it's running on port 8002")
    except Exception as e:
        print(f"Error: {e}")