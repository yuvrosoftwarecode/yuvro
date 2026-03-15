import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/common/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/common/StatsCard';
import { 
  ArrowLeft, Trophy, Calendar, Target, BarChart3, 
  TrendingUp, Award, Clock, CheckCircle2
} from 'lucide-react';
import { contestService } from '@/services/contestService';

const ContestAnalyticsList = () => {
  const navigate = useNavigate();
  const [attendedContests, setAttendedContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendedContests();
  }, []);

  const loadAttendedContests = async () => {
    try {
      setLoading(true);
      // Get all contests and filter for ones the user has registered for
      const allContests = await contestService.getAllContests();
      const attended = allContests.filter((contest: any) => contest.is_registered);
      setAttendedContests(attended);
    } catch (error) {
      console.error('Failed to load attended contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'past': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'upcoming': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your contests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="container mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/student/contests')}
            variant="ghost"
            className="mb-4 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C]">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Contest Analytics & Feedback</h1>
              <p className="text-slate-600 mt-1">View your performance reports and insights</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Total Contests"
            value={attendedContests.length}
            icon={Trophy}
            colorScheme="blue"
            size="md"
          />
          <StatsCard
            label="Completed"
            value={attendedContests.filter(c => c.status === 'past').length}
            icon={CheckCircle2}
            colorScheme="green"
            size="md"
          />
          <StatsCard
            label="Ongoing"
            value={attendedContests.filter(c => c.status === 'ongoing').length}
            icon={Clock}
            colorScheme="purple"
            size="md"
          />
          <StatsCard
            label="Upcoming"
            value={attendedContests.filter(c => c.status === 'upcoming').length}
            icon={Award}
            colorScheme="orange"
            size="md"
          />
        </div>

        {/* Contest List */}
        {attendedContests.length === 0 ? (
          <Card className="border border-slate-200">
            <CardContent className="py-16 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Contests Yet</h3>
              <p className="text-slate-600 mb-6">You haven't participated in any contests yet.</p>
              <Button onClick={() => navigate('/student/contests')} className="bg-[#F97316] hover:bg-[#EA580C]">
                Browse Contests
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {attendedContests.map((contest) => (
              <Card 
                key={contest.id} 
                className="border border-slate-200 hover:border-[#F97316] hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/student/contests/${contest.id}/analytics`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-[#F97316]/10 to-[#EA580C]/10">
                          <Trophy className="h-5 w-5 text-[#F97316]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{contest.title}</h3>
                          <p className="text-sm text-slate-600">{contest.organizer}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={`${getDifficultyColor(contest.difficulty)} border`}>
                          {contest.difficulty}
                        </Badge>
                        <Badge className={`${getStatusColor(contest.status)} border`}>
                          {contest.status}
                        </Badge>
                        <Badge variant="outline" className="text-slate-600 border-slate-200">
                          {contest.type}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(contest.start_datetime || contest.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{contest.duration ? `${Math.round(contest.duration / 60)} min` : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target className="h-4 w-4" />
                          <span>{contest.total_marks || 'N/A'} marks</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {contest.status === 'past' && (
                        <Button 
                          className="bg-[#F97316] hover:bg-[#EA580C] text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student/contests/${contest.id}/analytics`);
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      )}
                      {contest.status === 'ongoing' && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
                          In Progress
                        </Badge>
                      )}
                      {contest.status === 'upcoming' && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
                          Not Started
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestAnalyticsList;
