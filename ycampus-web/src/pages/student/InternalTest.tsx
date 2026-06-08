import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import InternalTestContent from '@/components/student/InternalTestContent';

const StudentInternalTest = () => {
  const [searchParams] = useSearchParams();
  
  // Hide layout when in assessment interface, instructions, results, or thankyou view
  const view = searchParams.get('view');
  const hideLayout = view === 'instructions' || view === 'assessment' || view === 'results' || view === 'thankyou';

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  if (hideLayout) {
    return (
      <div className="min-h-screen bg-background">
        <InternalTestContent />
      </div>
    );
  }

  return (
    <StudentLayout>
      <InternalTestContent />
    </StudentLayout>
  );
};

export default StudentInternalTest;
