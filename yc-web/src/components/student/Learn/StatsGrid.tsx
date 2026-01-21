import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, History, Table } from "lucide-react";
import type { Stats } from "../Learn/types";

const StatsGrid: React.FC<{ stats: Stats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-green-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 text-green-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats.lessons_completed}</p>
              <p className="text-sm font-medium text-slate-500 group-hover:text-green-600 transition-colors">Lessons Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-purple-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats.time_spent}</p>
              <p className="text-sm font-medium text-slate-500 group-hover:text-purple-600 transition-colors">Time Invested</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-amber-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats.avg_progress}%</p>
              <p className="text-sm font-medium text-slate-500 group-hover:text-amber-600 transition-colors">Avg. Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsGrid;
