import React from 'react';
import { ExecutionResult } from '../../services/codeEditorService';

interface PerformanceMetricsProps {
  result: ExecutionResult;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ result }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      {/* Score - always show if we have test cases info */}
      {(result.total_test_cases !== undefined && result.total_test_cases !== null) && (
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-2xl font-bold text-blue-600">
            {result.total_test_cases > 0 
              ? Math.round(((result.test_cases_passed || 0) / result.total_test_cases) * 100)
              : 0}%
          </div>
          <div className="text-gray-600 text-xs">Score</div>
        </div>
      )}
      
      {/* Runtime - show if we have execution time from either source */}
      {(result.execution_time !== undefined || result.test_results?.execution_time !== undefined) && (
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-lg font-bold text-green-600">
            {(result.execution_time || result.test_results?.execution_time || 0).toFixed(3)}s
          </div>
          <div className="text-gray-600 text-xs">Runtime</div>
        </div>
      )}
      
      {/* Memory - show if we have memory usage from either source */}
      {(result.memory_usage !== undefined || result.test_results?.memory_usage !== undefined) && (
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-lg font-bold text-purple-600">
            {(result.memory_usage || result.test_results?.memory_usage || 0).toFixed(1)} MB
          </div>
          <div className="text-gray-600 text-xs">Memory</div>
        </div>
      )}
      
      {/* Test Cases - always show if we have test cases info */}
      {(result.total_test_cases !== undefined && result.total_test_cases !== null) && (
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-lg font-bold text-orange-600">
            {result.test_cases_passed || 0}/{result.total_test_cases || 0}
          </div>
          <div className="text-gray-600 text-xs">Test Cases</div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetrics;