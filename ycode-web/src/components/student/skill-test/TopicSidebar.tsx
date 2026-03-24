// src/components/student/skill-test/TopicSidebar.tsx
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProgressBar from '@/components/ui/ProgressBar';

export interface SidebarTopic {
  id: string;
  name: string;
  progress?: number;
  completed?: boolean;
  problemCount?: number; // Added for CodePractice compatibility
}

export interface SidebarCourse {
  id: string;
  name: string;
  icon?: string;
  topics: SidebarTopic[];
}

interface TopicSidebarProps {
  course: SidebarCourse;
  selectedTopic: SidebarTopic | null;
  onTopicSelect: (topic: SidebarTopic) => void;
  isOpen: boolean;
  onToggle: () => void;
  showProgress?: boolean;
  overallProgress?: number;
}

const TopicSidebar = ({
  course,
  selectedTopic,
  onTopicSelect,
  isOpen,
  onToggle,
  showProgress = true,
  overallProgress,
}: TopicSidebarProps) => {
  return (
    <div
      className={cn(
        'bg-white shadow-sm transition-all duration-300 ease-in-out flex flex-col relative z-20 border-r border-gray-200'
      )}
      style={{
        width: isOpen ? "355px" : "70px",
        minWidth: isOpen ? "355px" : "70px",
      }}
    >
      {/* Scrollable content container */}
      <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* CONTENT AREA */}
        {!isOpen ? (
          <div className="flex flex-col items-center h-full py-6 gap-6 animate-fade-in">
            <div className="w-10 h-10 flex items-center justify-center text-2xl font-bold mb-2 bg-gray-50 rounded-xl" title={course.name}>
              {course.icon || '🗂️'}
            </div>
            <div className="flex flex-col items-center gap-3 w-full px-2">
              {course.topics.map((topic) => {
                const progress = topic.progress || 0;
                const isCompleted = showProgress ? (progress === 100) : false;

                return (
                  <div
                    key={topic.id}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold cursor-pointer border-2 shadow-sm transition-all
                      ${isCompleted
                        ? "bg-green-500 text-white border-gray-600 hover:bg-green-600"
                        : selectedTopic?.id === topic.id
                          ? "bg-blue-600 text-white border-transparent"
                          : "bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    title={topic.name}
                    onClick={() => {
                      onToggle();
                      onTopicSelect(topic);
                    }}
                  >
                    {topic.name.charAt(0)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-5 animate-fade-in opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-100 rounded-lg">
                {course.icon || '🗂️'}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">{course.name}</h2>
            </div>

            <p className="text-sm text-gray-500 mb-3 ml-1">
              {showProgress ? "Track your progress" : "Browse topics"}
            </p>

            {showProgress && overallProgress !== undefined && (
              <div className="mb-5 px-1">
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>{overallProgress}% Completed</span>
                </div>
                <ProgressBar
                  value={overallProgress}
                  height={8}
                  trackClassName="bg-gray-100 rounded-full"
                  barClassName="bg-blue-600 rounded-full"
                />
              </div>
            )}

            <div className="h-px bg-gray-100 w-full mb-5" />

            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 ml-1">Course Topics</h3>

            <div className="space-y-3 pb-4">
              {course.topics.map((topic) => {
                const isSelected = selectedTopic?.id === topic.id;
                const progress = topic.progress || 0;
                const completed = topic.completed || (showProgress && progress === 100);

                return (
                  <div
                    key={topic.id}
                    className={`border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                    onClick={() => onTopicSelect(topic)}
                  >
                    {/* Topic header */}
                    <div
                      className="flex items-center justify-between w-full p-3 bg-transparent transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Removed the expanding chevron since there are no subtopics */}
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        <span className={`font-semibold truncate text-sm ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{topic.name}</span>
                      </div>

                      {/* Show Checkmark if completed (and progress enabled), OR show problem count if strictly not showing progress */}
                      {showProgress && completed && (
                        <span className="flex items-center justify-center rounded-full bg-green-500 text-white w-5 h-5 shadow-sm">
                          <Check className="w-3 h-3" strokeWidth={4} />
                        </span>
                      )}

                      {topic.problemCount !== undefined && (
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                          {topic.problemCount}
                        </span>
                      )}
                    </div>

                    {showProgress && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 mt-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <ProgressBar
                          value={progress}
                          height={6}
                          trackClassName="bg-gray-100 rounded-full"
                          barClassName={isSelected ? "bg-blue-500 rounded-full" : "bg-green-500 rounded-full"}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Divider chevron button */}
      <button
        onClick={onToggle}
        className="absolute top-13 z-30 w-6 h-6 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-all duration-300 ease-in-out"
        style={{
          left: isOpen ? "343px" : "58px",
        }}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
    </div>
  );
};


export default TopicSidebar;
