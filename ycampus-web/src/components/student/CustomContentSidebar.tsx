import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getSubjectStyle } from '@/utils/subjectIcon';

export interface ContentItem {
  id: string;
  title: string;
  children?: ContentItem[];
}

interface CustomContentSidebarProps {
  subjectName: string;
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
  subjectName,
  onTopicSelect,
  selectedTopic,
  forceCollapseSignal = null,
  contentData = [],
  progressMap = {},
  readMap = {},
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  const [collapsedFlyoutUnitId, setCollapsedFlyoutUnitId] = useState<string | null>(null);
  const [collapsedFlyoutTop, setCollapsedFlyoutTop] = useState(80);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const collapsedListRef = useRef<HTMLDivElement>(null);
  const collapsedFlyoutRef = useRef<HTMLDivElement>(null);

  const selectedUnitId = useMemo(
    () => contentData.find((unit) => unit.children?.some((child) => child.id === selectedTopic))?.id || null,
    [contentData, selectedTopic],
  );

  useEffect(() => {
    if (!selectedUnitId) return;
    setExpandedUnits((prev) => ({ ...prev, [selectedUnitId]: true }));
  }, [selectedUnitId]);

  useEffect(() => {
    if (!collapsed) {
      setCollapsedFlyoutUnitId(null);
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
      if (!collapsed || !collapsedFlyoutUnitId) return;
      const target = event.target as Node;
      const inFlyout = collapsedFlyoutRef.current?.contains(target);
      const inUnitList = collapsedListRef.current?.contains(target);
      if (!inFlyout && !inUnitList) {
        setCollapsedFlyoutUnitId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [collapsed, collapsedFlyoutUnitId]);

  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return contentData;

    const query = searchQuery.toLowerCase();

    return contentData
      .map((unit) => {
        const unitMatch = unit.title.toLowerCase().includes(query);
        const matchingChildren = unit.children?.filter((subUnit) => subUnit.title.toLowerCase().includes(query)) || [];

        if (unitMatch) return unit;
        if (matchingChildren.length > 0) return { ...unit, children: matchingChildren };
        return null;
      })
      .filter(Boolean) as ContentItem[];
  }, [contentData, searchQuery]);

  const collapsedActiveUnit = collapsedFlyoutUnitId
    ? contentData.find((unit) => unit.id === collapsedFlyoutUnitId) || null
    : null;

  const collapsedActiveSubunits = collapsedActiveUnit?.children || [];

  const toggleExpandUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const getUnitProgress = (unit: ContentItem): number => {
    const subUnits = unit.children || [];
    if (subUnits.length === 0) return 0;
    const total = subUnits.reduce((sum, subUnit) => sum + (progressMap[subUnit.id] || 0), 0);
    return Math.round(total / subUnits.length);
  };

  return (
    <>
      <div
        ref={sidebarRef}
        className={cn(
          'flex-shrink-0 min-h-0 h-full bg-background border-r border-border transition-all duration-300 ease-in-out flex flex-col relative z-20',
          collapsed ? 'w-20 min-w-20' : 'w-[280px] min-w-[280px]',
        )}
        style={{ overflow: 'hidden' }}
      >
        <div className="border-b border-border flex-shrink-0">
          {!collapsed ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 px-1 m-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 text-white ${getSubjectStyle(subjectName || '', 0).bg}`}>
                    {(() => {
                      const Icon = getSubjectStyle(subjectName || '', 0).icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </div>
                  <TruncatedText text={subjectName} className="font-semibold text-sm truncate text-foreground" />
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
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
                className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Expand"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className={`w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 text-white ${getSubjectStyle(subjectName || '', 0).bg}`} title={subjectName}>
                {(() => {
                  const Icon = getSubjectStyle(subjectName || '', 0).icon;
                  return <Icon className="w-4 h-4" />;
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
          {collapsed ? (
            <div ref={collapsedListRef} className="p-2 space-y-2">
              {contentData.map((unit) => {
                const progress = getUnitProgress(unit);
                const isFlyoutOpen = collapsedFlyoutUnitId === unit.id;
                const isUnitSelected = selectedUnitId === unit.id;
                const abbreviation = unit.title.substring(0, 2).toUpperCase();

                return (
                  <button
                    key={unit.id}
                    onClick={(event) => {
                      const containerRect = sidebarRef.current?.getBoundingClientRect();
                      const buttonRect = event.currentTarget.getBoundingClientRect();
                      if (containerRect) {
                        setCollapsedFlyoutTop(Math.max(16, buttonRect.top - containerRect.top));
                      }

                      if (isFlyoutOpen) {
                        setCollapsedFlyoutUnitId(null);
                        return;
                      }

                      setCollapsedFlyoutUnitId(unit.id);
                    }}
                    className={cn(
                      'w-full px-2 py-2 rounded-lg font-semibold text-xs transition-all text-center cursor-pointer',
                      isFlyoutOpen || isUnitSelected ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground',
                    )}
                    title={`${unit.title} (${progress}%)`}
                  >
                    {abbreviation}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {filteredUnits.map((unit) => {
                const expanded = !!expandedUnits[unit.id];
                const subUnits = unit.children || [];
                const progress = getUnitProgress(unit);
                const isCompletedTopic = progress === 100;
                const hasSelectedSubunit = selectedUnitId === unit.id;

                return (
                  <div key={unit.id} className="space-y-1">
                    <button
                      onClick={() => toggleExpandUnit(unit.id)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg transition-all duration-200 group w-full cursor-pointer',
                        hasSelectedSubunit ? 'bg-slate-100 text-accent-foreground' : 'hover:bg-slate-100 hover:text-accent-foreground',
                      )}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md flex-shrink-0">
                          {unit.title.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <TruncatedText text={unit.title} className="text-sm font-medium truncate min-w-0" />
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
                        {subUnits.map((subUnit) => {
                          const isSelected = selectedTopic === subUnit.id;
                          const isRead = !!readMap[subUnit.id];

                          return (
                            <button
                              key={subUnit.id}
                              onClick={() => onTopicSelect(subUnit.id, subUnit.title)}
                              className={cn(
                                'w-full min-w-0 p-2 rounded-lg hover:bg-slate-100 hover:text-accent-foreground transition-all duration-200 text-left cursor-pointer flex items-center justify-between gap-2',
                                isSelected ? 'bg-gray-100 text-primary' : 'text-foreground',
                              )}
                              title={subUnit.title}
                            >
                              <TruncatedText text={subUnit.title} className="text-sm truncate min-w-0" />
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

      {collapsed && collapsedActiveUnit && (
        <div
          ref={collapsedFlyoutRef}
          className="absolute z-30 w-64 bg-background border border-border rounded-lg shadow-sm flex flex-col"
          style={{ left: 84, top: collapsedFlyoutTop, maxHeight: '70vh' }}
        >
          <div
            className="px-3 py-2 rounded-md border-b border-border flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100"
            onClick={() => setCollapsedFlyoutUnitId(null)}
          >
            <span className="text-sm font-medium truncate" title={collapsedActiveUnit.title}>
              {collapsedActiveUnit.title}
            </span>
            <button className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground" title="Close">
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-auto custom-scrollbar p-2 space-y-1">
            {collapsedActiveSubunits.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">No sub-units available</div>
            ) : (
              collapsedActiveSubunits.map((subUnit) => {
                const isSelected = selectedTopic === subUnit.id;
                return (
                  <button
                    key={subUnit.id}
                    onClick={() => {
                      onTopicSelect(subUnit.id, subUnit.title);
                      setCollapsedFlyoutUnitId(null);
                    }}
                    className={cn(
                      'w-full text-left p-2 rounded-lg transition-colors cursor-pointer flex items-center',
                      isSelected ? 'bg-slate-100 text-accent-foreground' : 'hover:bg-slate-100 hover:text-accent-foreground',
                    )}
                    title={subUnit.title}
                  >
                    <TruncatedText text={subUnit.title} className="text-sm truncate min-w-0" />
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
