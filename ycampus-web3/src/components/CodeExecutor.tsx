import React from 'react';
import { CodeExecutionPanel } from './code-editor';
import { ExecutionResult } from '../services/codeEditorService';

interface CodeExecutorProps {
  codingProblem?: {
    id: string;
    title: string;
    description: string;
    test_cases_basic: any[];
  };
  initialCode?: string;
  onSubmissionComplete?: (result: ExecutionResult) => void;
}

const CodeExecutor: React.FC<CodeExecutorProps> = ({
  codingProblem,
  initialCode,
  onSubmissionComplete
}) => {
  return (
    <CodeExecutionPanel
      problem={codingProblem}
      initialCode={initialCode}
      onSubmissionComplete={onSubmissionComplete}
      mode="practice"
    />
  );
};

export default CodeExecutor;