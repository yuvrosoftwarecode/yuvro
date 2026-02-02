import React from 'react';
import { ExecutionResult } from '../../services/codeEditorService';

interface TestCaseViewerProps {
  testCases: any[];
  result?: ExecutionResult | null;
}

const TestCaseViewer: React.FC<TestCaseViewerProps> = ({ testCases, result }) => {
  if (!testCases || testCases.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium">No test cases available</p>
        <p className="text-sm">Test cases for this problem haven't been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Available Test Cases</h4>
        <p className="text-blue-700 text-sm">
          This problem has {testCases.length} test case{testCases.length !== 1 ? 's' : ''}.
          Run your code to see how it performs against each test case.
        </p>
      </div>

      {testCases.map((testCase, index) => {
        // Find corresponding result if available
        const testResult = result?.test_results?.results?.[index];

        return (
          <div key={testCase.id || index} className={`rounded-lg p-4 border ${testResult
            ? testResult.passed
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
            : 'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Test Case {index + 1}</h4>
              <div className="flex items-center space-x-2">
                {testCase.weight > 1 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Weight: {testCase.weight}
                  </span>
                )}
                {testCase.is_hidden && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    🔒 Hidden
                  </span>
                )}
                {testResult && (
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${testResult.passed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {testResult.passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input:
                </label>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {testCase.input || 'No input required'}
                </pre>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Output:
                </label>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {testCase.expected_output}
                </pre>
              </div>
            </div>

            {testResult && !testResult.passed && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Your Output:
                </label>
                <pre className="bg-red-50 text-red-800 p-3 rounded border border-red-200 text-sm overflow-x-auto">
                  {testResult.actual_output || 'No output'}
                </pre>
                {testResult.error && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-red-700 mb-1">
                      Error:
                    </label>
                    <pre className="bg-red-100 text-red-800 p-3 rounded border border-red-300 text-sm overflow-x-auto">
                      {testResult.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TestCaseViewer;