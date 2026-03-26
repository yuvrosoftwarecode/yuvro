import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { SquareFunction, Atom, Code2, Zap, PenTool } from 'lucide-react';

const Notes = () => {
  const navigate = useNavigate();

  const subjects = [
    {
      id: 'matrices-calculus',
      name: 'Matrices and Calculus',
      icon: SquareFunction,
      accentColor: 'hsl(var(--subject-math))',
    },
    {
      id: 'physics',
      name: 'Advanced Engineering Physics',
      icon: Atom,
      accentColor: 'hsl(var(--subject-physics))',
    },
    {
      id: 'chemistry',
      name: 'Engineering Chemistry',
      icon: Atom,
      accentColor: 'hsl(var(--subject-chemistry))',
    },
    {
      id: 'english',
      name: 'English Communication',
      icon: PenTool,
      accentColor: 'hsl(var(--subject-english))',
    },
    {
      id: 'programming',
      name: 'Programming for Problem Solving',
      icon: Code2,
      accentColor: 'hsl(var(--subject-programming))',
    },
    {
      id: 'engineering-drawing',
      name: 'Engineering Drawing & CAD',
      icon: PenTool,
      accentColor: 'hsl(var(--subject-drawing))',
    },
  ];

  const handleCardClick = (subjectId: string) => {
    navigate(`/student/notes/${subjectId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Study Notes</h2>
        <p className="text-muted-foreground">Select a subject to access your notes and study materials.</p>
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
  );
};

export default Notes;