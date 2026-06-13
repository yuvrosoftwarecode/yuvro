import { ChevronLeft, ChevronRight, Check, BookOpen } from 'lucide-react';
import ProgressBar from '@/components/ui/ProgressBar';
import React from 'react';

export interface SidebarTopic {
  id: string;
  name: string;
  progress?: number;
  completed?: boolean;
  problemCount?: number;
}

export interface SidebarCourse {
  id: string;
  name: string;
  icon?: React.ReactNode;
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

const renderIcon = (icon: any) => {
  if (!icon) return <BookOpen className="w-5 h-5" />;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    const IconComponent = icon as React.ComponentType<any>;
    return <IconComponent className="w-5 h-5" />;
  }
  return icon;
};

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
      className="bg-white shadow-sm transition-all duration-300 ease-in-out flex flex-col relative z-20 border-r border-gray-200"
      style={{
        width: isOpen ? '300px' : '50px',
        minWidth: isOpen ? '300px' : '50px',
        overflow: 'hidden',
      }}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
        {!isOpen ? (
          /* ── Collapsed state — matches CourseDetail exactly ── */
          <div className="flex flex-col items-center h-full py-3 gap-6 animate-fade-in">
            <button
              onClick={onToggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl shrink-0 text-gray-600" title={course.name}>
              {renderIcon(course.icon)}
            </div>
            <div className="flex flex-col items-center gap-3 w-full px-2">
              {course.topics.map((topic) => {
                const progress = topic.progress || 0;
                const isCompleted = showProgress && progress === 100;
                const isSelected = selectedTopic?.id === topic.id;
                return (
                  <div
                    key={topic.id}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold cursor-pointer border-2 shadow-sm transition-all
                      ${isCompleted
                        ? 'bg-green-500 text-white border-gray-600 hover:bg-green-600'
                        : isSelected
                          ? 'bg-blue-600 text-white border-transparent'
                          : 'bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    title={topic.name}
                    onClick={() => { onToggle(); onTopicSelect(topic); }}
                  >
                    {topic.name.charAt(0)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Expanded state — matches CourseDetail exactly ── */
          <div className="p-5 animate-fade-in opacity-100 transition-opacity duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100/80 text-gray-600 rounded-lg shrink-0">
                  {renderIcon(course.icon)}
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">{course.name}</h2>
              </div>
              <button
                onClick={onToggle}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all shrink-0"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-5 ml-1">
              {showProgress ? 'Track your progress' : 'Browse topics'}
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
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => onTopicSelect(topic)}
                  >
                    <div className={`flex items-center justify-between w-full p-3 transition-colors ${isSelected ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-1 rounded-full ${isSelected ? 'bg-blue-100' : 'bg-transparent'}`}>
                          <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <span className={`font-semibold truncate text-sm ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {topic.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {topic.problemCount !== undefined && (
                          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                            {topic.problemCount}
                          </span>
                        )}
                        {showProgress && completed && (
                          <span className="flex items-center justify-center rounded-full bg-green-500 text-white w-5 h-5 shadow-sm">
                            <Check className="w-3 h-3" strokeWidth={4} />
                          </span>
                        )}
                      </div>
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
                          barClassName={isSelected ? 'bg-blue-500 rounded-full' : 'bg-green-500 rounded-full'}
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
    </div>
  );
};

export default TopicSidebar;
