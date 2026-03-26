import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { SquareFunction, Atom, Code2, Zap, PenTool } from 'lucide-react';

const StudentTest = () => {
  const navigate = useNavigate();

  const subjects = [
    {
      id: 'matrices-calculus',
      name: 'Matrices and Calculus',
      icon: SquareFunction,
    },
    {
      id: 'physics',
      name: 'Advanced Engineering Physics',
      icon: Atom,
    },
    {
      id: 'programming',
      name: 'Programming for Problem Solving',
      icon: Code2,
    },
    {
      id: 'electrical',
      name: 'Basic Electrical Engineering',
      icon: Zap,
    },
    {
      id: 'drawing',
      name: 'Engineering Drawing & CAD',
      icon: PenTool,
    },
  ];

  const handleCardClick = (subjectId: string) => {
    navigate(`/student/test/${subjectId}`);
  };

  return (
    <StudentLayout>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Practice Test</h2>
          <p className="text-muted-foreground">Select a subject to start your practice tests.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-md border-0 group"
              style={{ backgroundColor: 'hsl(var(--notes-card-bg))' }}
              onClick={() => handleCardClick(subject.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <subject.icon 
                    className="h-6 w-6 text-foreground"
                  />
                  <h3 
                    className="text-lg font-semibold transition-colors"
                    style={{ color: 'hsl(var(--notes-card-fg))' }}
                  >
                    {subject.name}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentTest;