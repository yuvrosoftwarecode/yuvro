export interface Subject {
  id: string;
  name: string;
  icon: string;
  progress: number;
  totalProblems: number;
  solvedProblems: number;
  iconColor?: string;
  category: string;
  totalScore?: number;
  aiHelpUsed?: number;
}

export interface Unit {
  id: string;
  name: string;
  problemCount: number;
  order_index: number;
  progress: number;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  score: number;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  hints?: string[];
  solutions?: any[];
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  test_cases_basic: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
  test_cases_advanced: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
}
