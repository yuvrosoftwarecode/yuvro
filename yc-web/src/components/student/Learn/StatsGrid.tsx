import React from "react";
import { FileText, History, Table } from "lucide-react";
import type { Stats } from "../Learn/types";

const StatsGrid: React.FC<{ stats: Stats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Lessons Completed */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-default h-full relative z-40">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Lessons Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.lessons_completed}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Time Invested */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-default h-full relative z-40">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Time Invested</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.time_spent}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <History className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Avg. Progress */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-default h-full relative z-40">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avg_progress}%</p>
            </div>
            <div className="bg-amber-500 p-3 rounded-lg">
              <Table className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsGrid;
