import { NotesProgress } from './NotesProgress';
import { TestPerformance } from './TestPerformance';
import { TasksSummary } from './TasksSummary';
import { AssessmentsOverview } from './AssessmentsOverview';
import { AssessmentsPerformance } from './AssessmentsPerformance';
import { AttendanceOverview } from './AttendanceOverview';
import { AnnouncementsWidget } from './AnnouncementsWidget';
import { PerformanceMetrics } from './PerformanceMetrics';
import PageHeader from '@/components/common/PageHeader';

export function ComprehensiveDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard Overview" 
        subtitle="Monitor your academic progress and performance metrics" 
      />

      {/* Top Row: Notes, Tests, Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NotesProgress />
        <TestPerformance />
        <TasksSummary />
      </div>

      {/* Middle Row: Assessments and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssessmentsOverview />
        <AssessmentsPerformance />
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