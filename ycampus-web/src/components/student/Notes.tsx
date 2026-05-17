import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BookMarked } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubjectsByCollege, Subject } from '@/services/subjectService';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { getSubjectIconComponent } from '@/utils/subjectIcon';

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
        let data = await fetchSubjectsByCollege(user.college_id);
        if (user.college_product_type) {
            data = data.filter(s => s.product_type === user.college_product_type);
        }
        // Sort subjects alphabetically
        data.sort((a, b) => a.subject_name.localeCompare(b.subject_name));
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
    <div className="space-y-6">
      <PageHeader 
        title="Learn" 
        subtitle="Select a subject to access your notes and study materials." 
      />

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
            const Icon = getSubjectIconComponent(subject.subject_name);
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
