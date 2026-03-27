import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import InterviewRoleCard from '@/components/common/InterviewRoleCard';
import { mockInterviewService, MockInterview as ApiMockInterview } from '@/services/mockInterviewService';
import { Role } from '@/types/mockInterview';
import { getRoleIconConfig } from '@/utils/mockInterviewUtils';
import { useNavigate } from "react-router-dom";

interface MockInterviewLibraryProps {
  onStartPractice: (role: Role) => void;
}

const MockInterviewLibrary: React.FC<MockInterviewLibraryProps> = ({ onStartPractice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mockRoles, setMockRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // ✅ INSIDE component


  useEffect(() => {
    const fetchMockInterviews = async () => {
      try {
        const data = await mockInterviewService.getAllMockInterviews();
        const mappedRoles = data.map((item: ApiMockInterview) => {
          const getDesignConfig = (title: string) => {
            const t = title.toLowerCase();
            if (t.includes('dsa') || t.includes('data structure')) return { gradient: 'from-orange-500 to-rose-500', category: 'Product Based', questions: 15 };
            if (t.includes('python')) return { gradient: 'from-blue-500 to-indigo-600', category: 'Product Based', questions: 12 };
            if (t.includes('java')) return { gradient: 'from-red-500 to-pink-500', category: 'Product Based', questions: 18 };
            if (t.includes('system design')) return { gradient: 'from-purple-500 to-indigo-500', category: 'Product Based', questions: 10 };
            if (t.includes('aptitude')) return { gradient: 'from-emerald-500 to-teal-500', category: 'Startup', questions: 20 };
            if (t.includes('logical')) return { gradient: 'from-amber-400 to-orange-500', category: 'Startup', questions: 15 };
            if (t.includes('communication') || t.includes('hr') || t.includes('behavioral')) return { gradient: 'from-sky-400 to-blue-500', category: 'Service Based', questions: 10 };
            if (t.includes('dbms')) return { gradient: 'from-cyan-400 to-blue-600', category: 'Startup', questions: 12 };
            return { gradient: 'from-slate-500 to-slate-700', category: 'Service Based', questions: 10 };
          };

          const design = getDesignConfig(item.title);
          const { icon, iconBg, iconColor } = getRoleIconConfig(item.title);

          return {
            id: item.id,
            title: item.title.replace('Mock Interview — ', '').replace('Mock Interview - ', ''),
            description: item.description,
            category: design.category,
            level: 'Intermediate' as const,
            max_duration: item.max_duration,
            interviewer_name: item.interviewer_name || 'Junnu',
            interviewer_voice_id: item.interviewer_voice_id || '',
            voice_speed: item.voice_speed || 1.0,
            icon,
            iconBg,
            iconColor,
            buttonGradient: design.gradient,
            questionCount: design.questions,
          };
        });
        setMockRoles(mappedRoles);
      } catch (error) {
        console.error('Failed to fetch mock interviews', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMockInterviews();
  }, []);

  const filteredRoles = mockRoles.filter(role => {
    const matchesSearch =
      role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || role.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header — matches Task page exactly */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Mock Interviews</h1>
        <p className="text-muted-foreground">Choose a domain and start your AI-powered mock interview.</p>
      </div>

      {/* Filters — matches Task page filter card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Search
              </label>
              {/* <div className="relative">   */}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by topic or keyword..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-white hover:bg-slate-50 transition-colors"
                />
              {/* </div> */}
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-white hover:bg-slate-50 transition-colors">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Product Based">Product Based</SelectItem>
                  <SelectItem value="Service Based">Service Based</SelectItem>
                  <SelectItem value="Startup">Startup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />
          ))}
        </div>
      )}

      {/* Cards Grid — 3 columns */}
{!loading && filteredRoles.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    
    {/* Dynamic Cards */}
    {filteredRoles.map(role => (
      <InterviewRoleCard
        key={role.id}
        title={role.title}
        description={role.description}
        icon={role.icon}
        gradient={role.buttonGradient || 'from-slate-500 to-slate-700'}
        duration={role.max_duration}
        questionCount={(role as any).questionCount || 10}
        category={role.category}
        onStart={() => onStartPractice(role)}
      />
    ))}

    {/* Machine Learning Dummy Card */}
    <InterviewRoleCard
  title="Machine Learning"
  description="Covers supervised and unsupervised learning, ML algorithms, model evaluation, feature engineering, and real-world AI problem solving."
  icon={getRoleIconConfig("Machine Learning").icon}
  gradient="from-indigo-500 to-purple-600"
  duration={45}
  questionCount={14}
  category="Product Based"
  buttonType="report"
  onStart={() => navigate("/student/mock-interview/report/ml")}
/>

  </div>
)}

      {/* Empty state */}
      {!loading && filteredRoles.length === 0 && (
        <Card className="border-dashed border-2 py-20 bg-slate-50/50">
          <CardContent>
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-slate-200" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No interviews found</p>
              <p className="text-slate-400 text-xs mt-1 font-medium">Try adjusting your search or category filter</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MockInterviewLibrary;