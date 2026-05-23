import { useQuery, keepPreviousData } from '@tanstack/react-query';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

export interface KPIItem {
  label: string;
  value: string;
  trend: number;
  icon: string;
  spark: number[];
}

export interface ReadinessDistItem {
  name: string;
  value: number;
  color: string;
}

export interface ProgressTrendItem {
  month: string;
  PRI: number;
  Assessment: number;
  Skill: number;
  Mock: number;
}

export interface FunnelItem {
  stage: string;
  value: number;
  color: string;
}

export interface SkillItem {
  skill: string;
  score: number;
  trend: number;
}

export interface RadarItem {
  skill: string;
  score: number;
  fullMark: number;
}

export interface AssessmentCompareItem {
  area: string;
  diagnostic: number;
  current: number;
}

export interface MockMetricItem {
  label: string;
  value: number;
}

export interface AIInsightItem {
  title: string;
  value: string;
  sub: string;
  tone: 'green' | 'red' | 'orange';
  icon?: any; // Will map to icons on the frontend
}

export interface RecommendationItem {
  title: string;
  desc: string;
  category?: string;  // e.g. 'Overall', 'Assessment', 'Mock Interview', 'Skill Test', 'Code Practice', 'Learning'
  icon?: any; // Will map to icons on the frontend
}

export interface AIFeedback {
  strengths: string[];
  weaknesses: string[];
}

export interface StudentItem {
  id: number;
  user_id: number;
  name: string;
  assess_score: number;
  skill_score: number;
  mock_score: number;
  practice_score: number;
  learning_score: number;
  final_score: number;
  status: string;
  subject_scores: Record<string, number>;
}

export interface PlacementKPIData {
  kpis: KPIItem[];
  readinessDist: ReadinessDistItem[];
  progressTrend: ProgressTrendItem[];
  funnel: FunnelItem[];
  skills: SkillItem[];
  radarData: RadarItem[];
  assessmentCompare: AssessmentCompareItem[];
  mockMetrics: MockMetricItem[];
  aiInsights: AIInsightItem[];
  recommendations: RecommendationItem[];
  aiFeedback: AIFeedback;
  students: StudentItem[];
}

export function usePlacementKPIs(
  batch: string,
  assessmentType: string,
  skillCategory: string,
  readinessStatus: string
) {
  return useQuery<PlacementKPIData>({
    queryKey: ['placement-kpis', batch, assessmentType, skillCategory, readinessStatus],
    queryFn: async () => {
      const response = await restApiAuthUtil.get<PlacementKPIData>(
        '/assessment/placement-dashboard/kpis/',
        {
          params: {
            batch: batch || 'all',
            assessment_type: assessmentType || 'all',
            skill_category: skillCategory || 'all',
            readiness_status: readinessStatus || 'all',
          },
        }
      );
      return response;
    },
    placeholderData: keepPreviousData,
  });
}
