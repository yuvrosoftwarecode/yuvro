import { useNavigate } from 'react-router-dom';
import RoleSidebar from '@/components/common/RoleSidebar';
import TestResults from '@/components/student/skill-test/TestResults';

// Fully self-contained mock report — no API calls, no real submission needed.
// Uses the mock-* ID detection in TestResults to inject realistic data.
const MOCK_TEST = {
  id: 'mock-python-fundamentals',
  title: 'Python Fundamentals',
  subjectName: 'Python Programming',
  duration: 30,
  totalQuestions: 10,
  marks: 32,
  maxAttempts: 3,
  currentAttempts: 1,
  testType: 'practice' as const,
};

const MockSkillTestReport = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 overflow-y-auto">
        <TestResults
          test={MOCK_TEST}
          submissionId="mock-sub-demo-001"
          onBackToList={() => navigate('/student/practice-tests')}
          onTryAgain={() => navigate('/student/practice-tests')}
        />
      </div>
    </div>
  );
};

export default MockSkillTestReport;
