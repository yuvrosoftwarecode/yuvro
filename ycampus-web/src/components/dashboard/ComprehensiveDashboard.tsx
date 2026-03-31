import React from 'react';
import { NotesProgress } from './NotesProgress';
import { TestPerformance } from './TestPerformance';
import { TasksSummary } from './TasksSummary';
import { AssessmentsOverview } from './AssessmentsOverview';
import { ContestPerformance } from './ContestPerformance';
import { AttendanceOverview } from './AttendanceOverview';
import { AnnouncementsWidget } from './AnnouncementsWidget';
import { StreaksAndBadges } from './StreaksAndBadges';
import { PerformanceMetrics } from './PerformanceMetrics';

export function ComprehensiveDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your academic progress and performance metrics
        </p>
      </div>

      {/* Top Row: Notes, Tests, Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NotesProgress />
        <TestPerformance />
        <TasksSummary />
      </div>

      {/* Middle Row: Assessments and Contest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssessmentsOverview />
        <ContestPerformance />
      </div>

      {/* Third Row: Attendance and Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceOverview />
        <AnnouncementsWidget />
      </div>

      {/* Bottom Row: Streaks and Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StreaksAndBadges />
        <PerformanceMetrics />
      </div>
    </div>
  );
}