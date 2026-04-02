import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Trophy, Calendar, Target,
  TrendingUp, Award, Clock, CheckCircle2
} from 'lucide-react';
import { contestService } from '@/services/contestService';

const ContestAnalyticsList = () => {
  const navigate = useNavigate();
  const [attendedContests, setAttendedContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await contestService.getAllContests();
        const attended = (all as any[]).filter((c: any) => c.my_submission_status != null);
        attended.sort((a: any, b: any) => {
          const order: Record<string, number> = { past: 0, ongoing: 1, upcoming: 2 };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        setAttendedContests(attended);
      } catch (e) {
        console.error('Failed to load attended contests:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const difficultyColor = (d: string) => {
    switch (d?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-white text-gray-700 border-gray-200';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'ongoing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'past': return 'bg-white text-gray-700 border-gray-200';
      case 'upcoming': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-white text-gray-700 border-gray-200';
    }
  };

  const stats = [
    { label: 'Total', value: attendedContests.length, icon: Trophy, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: attendedContests.filter(c => c.status === 'past').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Ongoing', value: attendedContests.filter(c => c.status === 'ongoing').length, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Upcoming', value: attendedContests.filter(c => c.status === 'upcoming').length, icon: Award, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader
          title="Contest Analytics"
          subtitle="View your performance reports and insights"
          actions={
            <Button variant="outline" onClick={() => navigate('/student/contests')} className="rounded-xl border-gray-200">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contests
            </Button>
          }
        />
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contest list */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
          ) : attendedContests.length === 0 ? (
            <Card className="border border-gray-100">
              <CardContent className="py-16 text-center">
                <Trophy className="h-14 w-14 mx-auto mb-4 text-gray-300" />
                <h3 className="text-base font-semibold text-gray-700 mb-2">No Contests Yet</h3>
                <p className="text-sm text-gray-400 mb-6">You haven't participated in any contests yet.</p>
                <Button onClick={() => navigate('/student/contests')} className="bg-slate-900 hover:bg-black">
                  Browse Contests
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {attendedContests.map((contest) => (
                <div
                  key={contest.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer p-5"
                  onClick={() => navigate(`/student/contests/${contest.id}/analytics`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <Trophy className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{contest.title}</h3>
                          <p className="text-xs text-gray-500">{contest.organizer}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={`${difficultyColor(contest.difficulty)} border text-xs`}>{contest.difficulty}</Badge>
                        <Badge className={`${statusColor(contest.status)} border text-xs`}>{contest.status}</Badge>
                        <Badge variant="outline" className="text-xs text-gray-500 border-gray-200 capitalize">{contest.type}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(contest.start_datetime || contest.start_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {contest.duration ? `${Math.round(contest.duration / 60)} min` : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" />
                          {contest.total_marks || 'N/A'} marks
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {contest.status === 'past' && (
                        <Button
                          size="sm"
                          className="bg-slate-900 hover:bg-black text-white rounded-xl"
                          onClick={(e) => { e.stopPropagation(); navigate(`/student/contests/${contest.id}/analytics`); }}
                        >
                          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                          Analytics
                        </Button>
                      )}
                      {contest.status === 'ongoing' && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">In Progress</Badge>
                      )}
                      {contest.status === 'upcoming' && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">Not Started</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestAnalyticsList;
