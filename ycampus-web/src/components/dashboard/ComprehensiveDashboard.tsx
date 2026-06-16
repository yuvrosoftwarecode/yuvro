import { NotesProgress } from './NotesProgress';
import { TestPerformance } from './TestPerformance';
import { TasksSummary } from './TasksSummary';
import { InternalTestsOverview } from './InternalTestsOverview';
import { CommunityRecentPostsWidget } from './CommunityRecentPostsWidget';
import { AttendanceOverview } from './AttendanceOverview';
import { AnnouncementsWidget } from './AnnouncementsWidget';
import { PerformanceMetrics } from './PerformanceMetrics';
import PageHeader from '@/components/common/PageHeader';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';

export function ComprehensiveDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleUpgradeClick = () => {
    const isAssessmentsPath = location.pathname.includes('/student/assessments');
    const targetPath = isAssessmentsPath ? '/student/assessments/upgrade' : '/student/campus/upgrade';
    navigate(targetPath);
  };

  const creditsAction = (
    <Button 
      onClick={handleUpgradeClick}
      variant="outline"
      className="gap-2 font-semibold text-xs border-[hsl(174,64%,33%)]/20 hover:border-[hsl(174,64%,33%)] hover:bg-[hsl(174,64%,33%)]/5 transition-all text-[hsl(174,64%,33%)] rounded-xl h-9 px-3.5 shadow-sm"
    >
      <Coins className="h-4 w-4 text-amber-500 animate-pulse" />
      <span>Credits: 55</span>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard Overview" 
        subtitle="Monitor your academic progress and performance metrics" 
        actions={creditsAction}
      />

      {/* Top Row: Notes, Tests, Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NotesProgress />
        <TestPerformance />
        <TasksSummary />
      </div>

      {/* Middle Row: Assessments and Community */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InternalTestsOverview />
        <CommunityRecentPostsWidget />
      </div>

      {/* Third Row: Attendance and Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceOverview />
        <AnnouncementsWidget />
      </div>

      {/* Bottom Row: Performance Metrics */}
      <div className="grid grid-cols-1 gap-6">
        <PerformanceMetrics />
      </div>
    </div>
  );
}