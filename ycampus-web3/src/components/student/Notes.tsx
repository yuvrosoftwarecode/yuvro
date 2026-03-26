import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { 
  SquareFunction, Atom, Code2, Zap, PenTool, 
  BookOpen, Code, Database, Globe, Cpu, Layers, 
  FlaskConical, BookMarked, PenLine, Sigma, 
  Pencil, Binary, BrainCircuit 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubjectsByCollege, Subject } from '@/services/subjectService';
import { toast } from 'sonner';

function getSubjectIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('calculus') || n.includes('matrices') || n.includes('math')) return Sigma;
  if (n.includes('python') || n.includes('java') || n.includes('programming') || n.includes('problem solving')) return Code;
  if (n.includes('data') || n.includes('sql') || n.includes('database')) return Database;
  if (n.includes('physics')) return Atom;
  if (n.includes('chemistry')) return FlaskConical;
  if (n.includes('network') || n.includes('web') || n.includes('internet')) return Globe;
  if (n.includes('os') || n.includes('operating') || n.includes('computer')) return Cpu;
  if (n.includes('structure') || n.includes('algorithm') || n.includes('dsa')) return Layers;
  if (n.includes('english') || n.includes('communication')) return PenLine;
  if (n.includes('drawing') || n.includes('cad') || n.includes('design')) return Pencil;
  if (n.includes('digital') || n.includes('logic') || n.includes('circuit')) return Binary;
  if (n.includes('ai') || n.includes('machine') || n.includes('deep')) return BrainCircuit;
  if (n.includes('algebra') || n.includes('linear') || n.includes('discrete')) return SquareFunction;
  return BookOpen;
}

const Notes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!user?.college_id) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchSubjectsByCollege(user.college_id);
        setSubjects(data);
      } catch (error) {
        console.error("Failed to load subjects:", error);
        toast.error("Failed to load subjects");
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, [user]);

  const handleCardClick = (subjectId: string | number) => {
    navigate(`/student/notes/${subjectId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Study Notes</h2>
        <p className="text-muted-foreground">Select a subject to access your notes and study materials.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No subjects assigned to your college yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const Icon = getSubjectIcon(subject.subject_name);
            return (
              <Card
                key={subject.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-md border-0 group"
                style={{ backgroundColor: 'hsl(var(--notes-card-bg))' }}
                onClick={() => handleCardClick(subject.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Icon 
                      className="h-6 w-6 text-foreground"
                    />
                    <h3 
                      className="text-lg font-semibold transition-colors"
                      style={{ color: 'hsl(var(--notes-card-fg))' }}
                    >
                      {subject.subject_name}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notes;
