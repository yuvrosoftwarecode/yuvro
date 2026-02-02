import React from 'react';
import { ExecutionResult } from '../../services/codeEditorService';
import PerformanceMetrics from './PerformanceMetrics';

interface ExecutionResultsProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
}

const ExecutionResults: React.FC<ExecutionResultsProps> = ({ result, isExecuting }) => {
  const getPlagiarismColor = (score: number) => {
    if (score > 0.7) return 'text-red-600';
    if (score > 0.3) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isExecuting) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Executing code...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center text-gray-500 py-8">
        Run your code to see the output here
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Summary */}
      {result.total_test_cases > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Submission Summary</h4>
              <p className="text-blue-700 text-sm">
                {result.test_cases_passed === result.total_test_cases
                  ? `Perfect! All ${result.total_test_cases} test cases passed.`
                  : `${result.test_cases_passed} out of ${result.total_test_cases} test cases passed.`
                }
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {Math.round(((result.test_cases_passed || 0) / result.total_test_cases) * 100)}%
              </div>
              <div className="text-blue-700 text-sm">Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Execution Status */}
      <div className={`p-4 rounded-lg border-l-4 ${result.status === 'completed' && result.test_cases_passed === result.total_test_cases
        ? 'bg-green-50 border-green-400'
        : result.status === 'completed'
          ? 'bg-yellow-50 border-yellow-400'
          : result.status === 'error'
            ? 'bg-red-50 border-red-400'
            : 'bg-gray-50 border-gray-400'
        }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Execution Status:</span>
            {result.status === 'completed' && result.test_cases_passed === result.total_test_cases && (
              <span className="text-green-600">🎉</span>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.status === 'completed' && result.test_cases_passed === result.total_test_cases
            ? 'bg-green-100 text-green-800'
            : result.status === 'completed'
              ? 'bg-yellow-100 text-yellow-800'
              : result.status === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
            {result.status === 'completed' && result.test_cases_passed === result.total_test_cases
              ? '✅ SUCCESS'
              : result.status === 'completed'
                ? '⚠️ PARTIAL'
                : result.status === 'error'
                  ? '❌ ERROR'
                  : result.status.toUpperCase()
            }
          </span>
        </div>

        {/* Performance Metrics */}
        <PerformanceMetrics result={result} />

        {result.status === 'completed' && result.test_cases_passed === result.total_test_cases && (
          <div className="mt-3 p-2 bg-green-100 rounded-lg">
            <p className="text-green-800 text-sm font-medium">
              🎉 Congratulations! Your solution passed all test cases successfully!
            </p>
          </div>
        )}
      </div>

      {/* Test Results */}
      {result.test_results && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Test Results</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.test_cases_passed === result.total_test_cases
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                {result.test_cases_passed || 0} / {result.total_test_cases || 0} Passed
              </span>
              {result.test_cases_passed === result.total_test_cases && (
                <span className="text-green-600">✅ All Tests Passed!</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(((result.test_cases_passed || 0) / (result.total_test_cases || 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${result.test_cases_passed === result.total_test_cases
                  ? 'bg-green-500'
                  : 'bg-blue-500'
                  }`}
                style={{
                  width: `${Math.round(((result.test_cases_passed || 0) / (result.total_test_cases || 1)) * 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* For submissions, show summary without test case details */}
          {result.test_results.summary && !result.test_results.results && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  result.test_cases_passed === result.total_test_cases 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {result.test_cases_passed === result.total_test_cases ? '✓' : '!'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {result.test_results.summary}
                  </p>
                  <p className="text-sm text-gray-600">
                    {result.test_cases_passed === result.total_test_cases 
                      ? 'Excellent work! Your solution handles all test scenarios correctly.'
                      : 'Your solution works for some cases but may need refinement for edge cases.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* For run-only, show detailed test results with individual cases */}
          {result.test_results.results && Array.isArray(result.test_results.results) && result.test_results.results.length > 0 && (
            <div className="space-y-3">
              <h5 className="font-medium text-sm text-gray-700">Individual Test Cases:</h5>
              {result.test_results.results.map((testResult: any, index: number) => (
                <div key={index} className={`border rounded-lg p-3 ${testResult.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Test Case {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${testResult.passed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {testResult.passed ? '✓ PASS' : '✗ FAIL'}
                      </span>
                      {testResult.execution_time && (
                        <span className="text-xs text-gray-500">
                          {testResult.execution_time.toFixed(3)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {!testResult.passed && (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Expected:</label>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {testResult.expected || 'N/A'}
                          </pre>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Your Output:</label>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {testResult.actual || 'N/A'}
                          </pre>
                        </div>
                      </div>
                      {testResult.error && (
                        <div>
                          <label className="block text-xs font-medium text-red-600 mb-1">Error:</label>
                          <pre className="bg-red-50 text-red-700 p-2 rounded border border-red-200 text-xs overflow-x-auto">
                            {testResult.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plagiarism Check */}
      {result.plagiarism_score !== undefined && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Plagiarism Check</h4>
          <div className="flex items-center justify-between mb-2">
            <span>Similarity Score:</span>
            <span className={`font-semibold ${getPlagiarismColor(result.plagiarism_score)}`}>
              {(result.plagiarism_score * 100).toFixed(1)}%
            </span>
          </div>
          {result.plagiarism_flagged && (
            <div className="text-red-600 text-sm mt-2">
              ⚠️ High similarity detected. Please ensure your code is original.
            </div>
          )}
        </div>
      )}

      {/* Output */}
      {result.output && (
        <div>
          <h4 className="font-medium mb-2">Output:</h4>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            {result.output}
          </pre>
        </div>
      )}

      {/* Error */}
      {result.error_message && (
        <div>
          <h4 className="font-medium mb-2 text-red-600">Error:</h4>
          <pre className="bg-red-50 text-red-800 p-4 rounded-lg overflow-x-auto text-sm border border-red-200">
            {result.error_message}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ExecutionResults;