import React, { useState, useEffect } from 'react';
import MonacoCodeEditor from './MonacoCodeEditor';
import ExecutionResults from './ExecutionResults';
import TestCaseViewer from './TestCaseViewer';
import CustomTestCaseManager from './CustomTestCaseManager';
import ExampleCodeGallery from './ExampleCodeGallery';
import codeEditorService, {
  CodeExecutionRequest,
  ExecutionResult
} from '../../services/codeEditorService';

export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  test_cases_basic?: any[];
}

export interface CodeExecutionPanelProps {
  problem?: CodingProblem;
  initialCode?: string;
  onSubmissionComplete?: (result: ExecutionResult) => void;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
  showSubmitButton?: boolean;
  showRunButton?: boolean;
  showTestCases?: boolean;
  allowCustomTestCases?: boolean;
  mode?: 'practice' | 'exam' | 'learn' | 'editor';
  className?: string;
  editorHeight?: string;
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' }
];

const SAMPLE_CODE = {
  python: `def solution():
    # Write your solution here
    pass

# Test your solution
result = solution()
print(result)`,
  javascript: `function solution() {
    // Write your solution here
    return null;
}

// Test your solution
const result = solution();
console.log(result);`,
  java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Solution sol = new Solution();
        
        // Read input and solve
        // Example: int n = sc.nextInt();
        // System.out.println(sol.solve(n));
        
        sc.close();
    }
    
    public int solve(int n) {
        // Write your solution here
        return 0;
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    
    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    // Write your solution here
    
    return 0;
}`
};

const CodeExecutionPanel: React.FC<CodeExecutionPanelProps> = ({
  problem,
  initialCode,
  onSubmissionComplete,
  onCodeChange,
  onLanguageChange,
  showSubmitButton = true,
  showRunButton = true,
  showTestCases = true,
  allowCustomTestCases = false,
  mode = 'practice',
  className = '',
  editorHeight = '500px'
}) => {
  const [code, setCode] = useState(initialCode || '');
  const [language, setLanguage] = useState('python');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'output' | 'tests' | 'custom-tests'>('editor');
  const [customTestCases, setCustomTestCases] = useState<any[]>([]);
  const [showExamples, setShowExamples] = useState(false);

  // Get test cases from the problem and combine with custom test cases
  const problemTestCases = problem?.test_cases_basic || [];
  const allTestCases = [...problemTestCases, ...customTestCases];

  useEffect(() => {
    if (!initialCode && !code) {
      const defaultCode = SAMPLE_CODE[language as keyof typeof SAMPLE_CODE] || '';
      setCode(defaultCode);
      onCodeChange?.(defaultCode);
    }
  }, [language, initialCode]);

  // Sync internal state with external changes if needed (optional, but good practice)
  useEffect(() => {
    if (initialCode !== undefined && initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };

  const handleExecute = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    if (!problem) {
      alert('Problem not loaded yet. Please wait...');
      return;
    }

    setIsExecuting(true);
    setActiveTab('output');

    try {
      // Run code directly with FastAPI (no saving to database)
      const executionResult = await codeEditorService.runCode({
        code,
        language,
        test_cases: allTestCases,
        problem_title: problem?.title || 'Unknown Problem'
      });
      console.log('Run Code Result:', executionResult);
      setResult(executionResult);
    } catch (error: any) {
      console.error('Code execution failed:', error);
      setResult({
        id: 0,
        coding_problem: '',
        problem_title: 'Error',
        problem_description: '',
        code,
        language,
        status: 'error',
        output: '',
        error_message: error.message || 'Execution failed',
        execution_time: 0,
        memory_usage: 0,
        test_cases_passed: 0,
        total_test_cases: 0,
        plagiarism_score: 0,
        plagiarism_details: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        test_results: { passed: 0, total: 0, success: false },
        plagiarism_flagged: false
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    if (!problem) {
      alert('Problem not loaded yet. Please wait...');
      return;
    }

    setIsExecuting(true);
    setActiveTab('output');

    try {
      const request: CodeExecutionRequest & { test_cases: any[] } = {
        code,
        language,
        coding_problem_id: problem?.id || '',
        test_cases: allTestCases
      };

      console.log('Submitting request:', request);

      // Submit solution via Django API (saves to database)
      const executionResult = await codeEditorService.submitSolution(request);
      console.log('Submit Solution Result:', executionResult);
      setResult(executionResult);
      onSubmissionComplete?.(executionResult);
    } catch (error: any) {
      console.error('Code submission failed:', error);
      console.error('Error details:', error.response?.data || error.message);

      // Set an error result so something shows up
      const errorResult = {
        id: 0,
        coding_problem: '',
        problem_title: 'Error',
        problem_description: '',
        code,
        language,
        status: 'error' as const,
        output: '',
        error_message: error.message || 'Submission failed',
        execution_time: 0,
        memory_usage: 0,
        test_cases_passed: 0,
        total_test_cases: 0,
        plagiarism_score: 0,
        plagiarism_details: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        test_results: {
          passed: 0,
          total: 0,
          success: false,
          summary: 'Submission failed due to error'
        },
        plagiarism_flagged: false
      };

      setResult(errorResult);
    } finally {
      setIsExecuting(false);
    }
  };

  const getModeInfo = () => {
    switch (mode) {
      case 'exam':
        return {
          title: 'Skill Assessment',
          description: 'Complete this coding challenge within the time limit.',
          showHint: false
        };
      case 'learn':
        return {
          title: 'Learning Exercise',
          description: 'Practice and learn with detailed feedback.',
          showHint: true
        };
      default:
        return {
          title: 'Code Practice',
          description: 'Test and submit your solution.',
          showHint: true
        };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Only show header info if not in exam mode or if specifically desired. 
            In standard exam mode contexts, the parent usually handles the title. 
            Keeping it for now but checking sizing. */}

      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-4">

          {/* Left: Language Selector - cleaner look */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-600">Language:</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {LANGUAGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            {showRunButton && (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={`
                  px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-2
                  ${isExecuting
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }
                `}
                title="Test your code with visible test cases for debugging"
              >
                <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
                {!isExecuting && <span className="text-lg leading-none">▶</span>}
              </button>
            )}

            {showSubmitButton && (
              <button
                onClick={handleSubmit}
                disabled={isExecuting}
                className={`
                  px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${isExecuting
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                  }
                `}
                title="Submit your final solution for evaluation"
              >
                {isExecuting ? 'Submitting...' : 'Submit Solution'}
              </button>
            )}
          </div>
        </div>

        {/* Mode-specific info - Optional, good for context */}
        {modeInfo.showHint && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-3">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600 mt-0.5">💡</div>
              <div className="text-blue-800">
                <strong>Run Code:</strong> Test with visible test cases for debugging.
                {showSubmitButton && (
                  <>
                    <strong className="ml-2">Submit Solution:</strong> Final evaluation with hidden test cases.
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation - cleaner */}
      <div className="bg-slate-50 border-b px-4">
        <nav className="flex space-x-6">
          {['editor', 'output', ...(showTestCases ? ['tests'] : []), ...(allowCustomTestCases ? ['custom-tests'] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`
                py-2.5 px-1 border-b-2 font-medium text-sm capitalize transition-all
                ${activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {tab === 'custom-tests' ? 'Custom Tests' : tab}
              {tab === 'tests' && problemTestCases && problemTestCases.length > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  {problemTestCases.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        {activeTab === 'editor' && (
          <MonacoCodeEditor
            value={code}
            onChange={handleCodeChange}
            language={language}
            height={editorHeight}
            onShowExamples={() => setShowExamples(true)}
          />
        )}

        {activeTab === 'output' && (
          <div style={{ height: editorHeight, overflow: 'auto' }}>
            <ExecutionResults result={result} isExecuting={isExecuting} />
          </div>
        )}

        {activeTab === 'tests' && showTestCases && (
          <div style={{ height: editorHeight, overflow: 'auto' }}>
            <TestCaseViewer testCases={problemTestCases} result={result} />
          </div>
        )}

        {activeTab === 'custom-tests' && allowCustomTestCases && (
          <div style={{ height: editorHeight, overflow: 'auto' }}>
            <CustomTestCaseManager
              customTestCases={customTestCases}
              onTestCasesChange={setCustomTestCases}
            />
          </div>
        )}
      </div>

      {showExamples && (
        <ExampleCodeGallery
          currentLanguage={language}
          onClose={() => setShowExamples(false)}
          onApplyCode={(exampleCode) => {
            handleCodeChange(exampleCode);
            setShowExamples(false);
          }}
        />
      )}
    </div>
  );
};

export default CodeExecutionPanel;