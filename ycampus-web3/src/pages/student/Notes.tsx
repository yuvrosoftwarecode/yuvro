import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import Notes from '@/components/student/Notes';

const StudentNotes = () => {
  return (
    <StudentLayout>
      <Notes />
    </StudentLayout>
  );
};

export default StudentNotes;
