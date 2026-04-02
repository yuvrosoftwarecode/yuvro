import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCourseIconConfig } from '@/utils/CourseIcons';

export interface ContentItem {
  id: string;
  title: string;
  children?: ContentItem[];
}

interface CustomContentSidebarProps {
  courseName: string;
  courseIcon: React.ElementType;
  courseBg: string;
  onTopicSelect: (topicId: string, title: string) => void;
  selectedTopic: string | null;
  forceCollapseSignal?: number | null;
  contentData?: ContentItem[];
  progressMap?: Record<string, number>;
  readMap?: Record<string, boolean>;
}

const TruncatedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!ref.current) return;
      setOverflow(ref.current.scrollWidth > ref.current.clientWidth);
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text]);

  return (
    <span ref={ref} className={className} title={overflow ? text : undefined}>
      {text}
    </span>
  );
};

const CustomContentSidebar: React.FC<CustomContentSidebarProps> = ({
  courseName,
  courseIcon: Icon,
  courseBg,
  onTopicSelect,
  selectedTopic,
  forceCollapseSignal = null,
  contentData = [],
  progressMap = {},
  readMap = {},
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const [collapsedFlyoutTopicId, setCollapsedFlyoutTopicId] = useState<string | null>(null);
  const [collapsedFlyoutTop, setCollapsedFlyoutTop] = useState(80);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const collapsedListRef = useRef<HTMLDivElement>(null);
  const collapsedFlyoutRef = useRef<HTMLDivElement>(null);

  const selectedTopicId = useMemo(
    () => contentData.find((topic) => topic.children?.some((child) => child.id === selectedTopic))?.id || null,
    [contentData, selectedTopic],
  );

  useEffect(() => {
    if (!selectedTopicId) return;
    setExpandedTopics((prev) => ({ ...prev, [selectedTopicId]: true }));
  }, [selectedTopicId]);

  useEffect(() => {
    if (!collapsed) {
      setCollapsedFlyoutTopicId(null);
    }
  }, [collapsed]);

  useEffect(() => {
    if (forceCollapseSignal === null) {
      return;
    }

    if (!collapsed) {
      setCollapsed(true);
    }
  }, [forceCollapseSignal]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!collapsed || !collapsedFlyoutTopicId) return;
      const target = event.target as Node;
      const inFlyout = collapsedFlyoutRef.current?.contains(target);
      const inTopicList = collapsedListRef.current?.contains(target);
      if (!inFlyout && !inTopicList) {
        setCollapsedFlyoutTopicId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [collapsed, collapsedFlyoutTopicId]);

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return contentData;

    const query = searchQuery.toLowerCase();

    return contentData
      .map((topic) => {
        const topicMatch = topic.title.toLowerCase().includes(query);
        const matchingChildren = topic.children?.filter((subtopic) => subtopic.title.toLowerCase().includes(query)) || [];

        if (topicMatch) return topic;
        if (matchingChildren.length > 0) return { ...topic, children: matchingChildren };
        return null;
      })
      .filter(Boolean) as ContentItem[];
  }, [contentData, searchQuery]);

  const collapsedActiveTopic = collapsedFlyoutTopicId
    ? contentData.find((topic) => topic.id === collapsedFlyoutTopicId) || null
    : null;

  const collapsedActiveSubtopics = collapsedActiveTopic?.children || [];

  const toggleExpandTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const getTopicProgress = (topic: ContentItem): number => {
    const subtopics = topic.children || [];
    if (subtopics.length === 0) return 0;
    const total = subtopics.reduce((sum, subtopic) => sum + (progressMap[subtopic.id] || 0), 0);
    return Math.round(total / subtopics.length);
  };

  return (
    <>
      <div
        ref={sidebarRef}
        className={cn(
          'flex-shrink-0 min-h-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col relative z-20',
          collapsed ? 'w-20 min-w-20' : 'w-[280px] min-w-[280px]',
        )}
        style={{ overflow: 'hidden' }}
      >
        <div className="border-b border-gray-200 flex-shrink-0">
          {!collapsed ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 text-white", courseBg)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <TruncatedText text={courseName} className="font-semibold text-sm truncate text-foreground" />
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0"
                  aria-label="Collapse sidebar"
                  title="Collapse"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 flex flex-col items-center gap-4 py-4">
              <button
                onClick={() => setCollapsed(false)}
                className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Expand"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className={cn("w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 text-white", courseBg)} title={courseName}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar text-gray-900">
          {collapsed ? (
            <div ref={collapsedListRef} className="p-2 space-y-2">
              {contentData.map((topic) => {
                const progress = getTopicProgress(topic);
                const isFlyoutOpen = collapsedFlyoutTopicId === topic.id;
                const isTopicSelected = selectedTopicId === topic.id;
                const abbreviation = topic.title.substring(0, 2).toUpperCase();

                return (
                  <button
                    key={topic.id}
                    onClick={(event) => {
                      const containerRect = sidebarRef.current?.getBoundingClientRect();
                      const buttonRect = event.currentTarget.getBoundingClientRect();
                      if (containerRect) {
                        setCollapsedFlyoutTop(Math.max(16, buttonRect.top - containerRect.top));
                      }

                      if (isFlyoutOpen) {
                        setCollapsedFlyoutTopicId(null);
                        return;
                      }

                      setCollapsedFlyoutTopicId(topic.id);
                    }}
                    className={cn(
                      'w-full px-2 py-2 rounded-lg font-semibold text-xs transition-all text-center cursor-pointer',
                      isFlyoutOpen || isTopicSelected ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 hover:text-slate-900',
                    )}
                    title={`${topic.title} (${progress}%)`}
                  >
                    {abbreviation}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {filteredTopics.map((topic) => {
                const expanded = !!expandedTopics[topic.id];
                const subtopics = topic.children || [];
                const progress = getTopicProgress(topic);
                const isCompletedTopic = progress === 100;
                const hasSelectedSubtopic = selectedTopicId === topic.id;

                return (
                  <div key={topic.id} className="space-y-1 text-gray-900">
                    <button
                      onClick={() => toggleExpandTopic(topic.id)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg transition-all duration-200 group w-full cursor-pointer',
                        hasSelectedSubtopic ? 'bg-slate-100 text-accent-foreground' : 'hover:bg-slate-100 hover:text-accent-foreground',
                      )}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md flex-shrink-0">
                          {topic.title.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <TruncatedText text={topic.title} className="text-sm font-medium truncate min-w-0" />
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                              {isCompletedTopic && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={cn('flex-shrink-0 ml-2 transition-transform duration-300', expanded && 'rotate-90')}>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>

                    {expanded && (
                      <div className="pl-9 space-y-1 transition-all duration-300 ease-in-out overflow-hidden animate-accordion-down">
                        {subtopics.map((subtopic) => {
                          const isSelected = selectedTopic === subtopic.id;
                          const isRead = !!readMap[subtopic.id];

                          return (
                            <button
                              key={subtopic.id}
                              onClick={() => onTopicSelect(subtopic.id, subtopic.title)}
                              className={cn(
                                'w-full min-w-0 p-2 rounded-lg hover:bg-slate-100 hover:text-accent-foreground transition-all duration-200 text-left cursor-pointer flex items-center justify-between gap-2',
                                isSelected ? 'bg-gray-100 text-primary' : 'text-foreground',
                              )}
                              title={subtopic.title}
                            >
                              <TruncatedText text={subtopic.title} className="text-sm truncate min-w-0" />
                              {isRead && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {collapsed && collapsedActiveTopic && (
        <div
          ref={collapsedFlyoutRef}
          className="absolute z-30 w-64 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col"
          style={{ left: 84, top: collapsedFlyoutTop, maxHeight: '70vh' }}
        >
          <div
            className="px-3 py-2 rounded-md border-b border-border flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100"
            onClick={() => setCollapsedFlyoutTopicId(null)}
          >
            <span className="text-sm font-medium truncate" title={collapsedActiveTopic.title}>
              {collapsedActiveTopic.title}
            </span>
            <button className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-900" title="Close">
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-auto custom-scrollbar p-2 space-y-1">
            {collapsedActiveSubtopics.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">No sub-topics available</div>
            ) : (
              collapsedActiveSubtopics.map((subtopic) => {
                const isSelected = selectedTopic === subtopic.id;
                return (
                  <button
                    key={subtopic.id}
                    onClick={() => {
                      onTopicSelect(subtopic.id, subtopic.title);
                      setCollapsedFlyoutTopicId(null);
                    }}
                    className={cn(
                      'w-full text-left p-2 rounded-lg transition-colors cursor-pointer flex items-center',
                      isSelected ? 'bg-slate-100 text-accent-foreground' : 'hover:bg-slate-100 hover:text-accent-foreground',
                    )}
                    title={subtopic.title}
                  >
                    <TruncatedText text={subtopic.title} className="text-sm truncate min-w-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CustomContentSidebar;
