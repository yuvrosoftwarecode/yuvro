import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import AssessmentContent from '@/components/student/AssessmentContent';

const StudentAssessment = () => {
  const [searchParams] = useSearchParams();
  
  // Hide layout when in assessment interface, instructions, or results view
  const view = searchParams.get('view');
  const hideLayout = view === 'instructions' || view === 'assessment' || view === 'results';

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  if (hideLayout) {
    return (
      <div className="min-h-screen bg-background">
        <AssessmentContent />
      </div>
    );
  }

  return (
    <StudentLayout>
      <AssessmentContent />
    </StudentLayout>
  );
};

export default StudentAssessment;
