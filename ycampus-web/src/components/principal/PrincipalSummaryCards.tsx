import {
  Users,
  UserCheck,
  Building2,
  TrendingUp,
  ClipboardCheck,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SAFFRON = "#F59E0B";
const GREEN = "#10B981";

export default function PrincipalSummaryCards() {
  const summary = {
    totalStudents: 2450,
    totalFaculty: 128,
    totalDepartments: 6,
    avgPI: 74,
    overallAttendance: 82,
    avgPRI: 62,
    totalSections: 48,
    avgAssessmentScore: 71,
    taskCompletion: 68,
    notesCompletion: 61,
    activeStudents: 89,
    interviewReady: 34,
  };

  return (
    <div>
      {/* Section Title */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Institution Summary
      </h2>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Students",
            value: summary.totalStudents.toLocaleString(),
            icon: Users,
            accent: false,
          },
          {
            label: "Faculty",
            value: summary.totalFaculty.toString(),
            icon: UserCheck,
            accent: false,
          },
          {
            label: "Departments",
            value: summary.totalDepartments.toString(),
            icon: Building2,
            accent: false,
          },
          {
            label: "Avg PI",
            value: `${summary.avgPI}%`,
            icon: TrendingUp,
            accent: true,
            color: summary.avgPI >= 70 ? GREEN : SAFFRON,
          },
          {
            label: "Attendance",
            value: `${summary.overallAttendance}%`,
            icon: ClipboardCheck,
            accent: true,
            color: summary.overallAttendance >= 80 ? GREEN : SAFFRON,
          },
          {
            label: "Avg PRI",
            value: `${summary.avgPRI}%`,
            icon: Target,
            accent: true,
            color: summary.avgPRI >= 60 ? GREEN : SAFFRON,
          },
        ].map((kpi, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              {/* Icon */}
              <kpi.icon className="h-4 w-4 text-muted-foreground" />

              {/* Value */}
              <span
                className="text-xl font-bold text-foreground"
                style={kpi.accent ? { color: kpi.color } : {}}
              >
                {kpi.value}
              </span>

              {/* Label */}
              <span className="text-[11px] text-muted-foreground">
                {kpi.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
        {[
          { label: "Sections", value: summary.totalSections.toString() },
          { label: "Assessment Avg", value: `${summary.avgAssessmentScore}%` },
          { label: "Task Completion", value: `${summary.taskCompletion}%` },
          { label: "Notes Completion", value: `${summary.notesCompletion}%` },
          { label: "Active Students", value: `${summary.activeStudents}%` },
          { label: "Interview Ready", value: `${summary.interviewReady}%` },
        ].map((kpi, i) => (
          <Card key={i} className="border">
            <CardContent className="p-3 text-center">
              {/* Value */}
              <span className="text-lg font-semibold text-foreground">
                {kpi.value}
              </span>

              {/* Label */}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {kpi.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
