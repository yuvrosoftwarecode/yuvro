import { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import PlannerOverview from '@/components/student/planner/PlannerOverview';
import PlanCreationWizard from '@/components/student/planner/PlanCreationWizard';
import PlanDashboard from '@/components/student/planner/PlanDashboard';
import { StudentPlan } from '@/services/plannerService';

type PlannerView = 'OVERVIEW' | 'CREATION' | 'DETAIL';

export default function AIInterviewPlanner() {
  const [view, setView] = useState<PlannerView>('OVERVIEW');
  const [selectedPlan, setSelectedPlan] = useState<StudentPlan | null>(null);

  const handleCreateNew = () => {
    setView('CREATION');
  };

  const handlePlanSelected = (plan: StudentPlan) => {
    setSelectedPlan(plan);
    setView('DETAIL');
  };

  const handlePlanCreated = (plan: StudentPlan) => {
    setSelectedPlan(plan);
    setView('DETAIL');
  };

  const handleBackToOverview = () => {
    setSelectedPlan(null);
    setView('OVERVIEW');
  };

  return (
    <StudentLayout>
      <div className="px-4 py-8">
        {view === 'OVERVIEW' && (
          <PlannerOverview 
            onCreateNew={handleCreateNew} 
            onSelectPlan={handlePlanSelected} 
          />
        )}

        {view === 'CREATION' && (
          <PlanCreationWizard 
            onPlanCreated={handlePlanCreated} 
          />
        )}

        {view === 'DETAIL' && selectedPlan && (
          <PlanDashboard 
            plan={selectedPlan} 
            onReset={handleBackToOverview} 
          />
        )}
      </div>
    </StudentLayout>
  );
}
