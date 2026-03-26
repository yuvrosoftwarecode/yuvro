import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText, ArrowLeft, Search, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useSubtopicProgress } from '@/hooks/useSubtopicProgress';

export interface ContentItem {
  id: string;
  title: string;
  children?: ContentItem[];
}

interface CustomContentSidebarProps {
  subjectName: string;
  subjectId: string;
  onTopicSelect: (topicId: string, title: string) => void;
  selectedTopic: string | null;
  onBackToNotes: () => void;
  contentData?: ContentItem[];
}

// Function to generate abbreviation from title
const generateAbbreviation = (title: string): string => {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  const firstLetter = words[0].charAt(0).toUpperCase();
  const lastLetter = words[words.length - 1].charAt(0).toUpperCase();
  return firstLetter + lastLetter;
};

// Function to truncate text for expanded mode
const truncateText = (text: string, maxLength: number = 18): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Function to truncate text for collapsed mode
const truncateTextCollapsed = (text: string, maxLength: number = 12): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

interface ContentMenuItemProps {
  item: ContentItem;
  level: number;
  isCollapsed: boolean;
  onTopicSelect: (topicId: string, title: string) => void;
  selectedTopic: string | null;
  topicId?: string;
  isCompleted?: (topicId: string, subtopicId: string) => boolean;
  toggleCompletion?: (params: { topicId: string; subtopicId: string }) => void;
  getTopicProgress?: (topicId: string, subtopicCount: number) => number;
  isLastSubtopic?: boolean;
}

const ContentMenuItem: React.FC<ContentMenuItemProps> = ({ 
  item, 
  level, 
  isCollapsed, 
  onTopicSelect, 
  selectedTopic,
  topicId,
  isCompleted,
  toggleCompletion,
  getTopicProgress,
  isLastSubtopic
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const abbreviation = generateAbbreviation(item.title);
  const truncatedTitle = truncateText(item.title);
  const shouldShowTooltip = item.title.length > 18;

  if (hasChildren) {
    const subtopicCount = item.children?.length || 0;
    const progress = getTopicProgress ? getTopicProgress(item.id, subtopicCount) : 0;
    const isTopicComplete = progress === 100;

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 group",
            !isCollapsed && "w-full",
            level > 0 && !isCollapsed && "ml-4",
            isCollapsed && "p-2"
          )}
          title={isCollapsed ? item.title : (shouldShowTooltip ? item.title : undefined)}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {isCollapsed ? (
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md flex-shrink-0" title={item.title}>
                {abbreviation}
              </span>
            ) : (
              <>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md flex-shrink-0">
                  {abbreviation}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between">
                    <span className="text-sm font-medium truncate">{truncatedTitle}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                      {isTopicComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-shrink-0 ml-2">
              {isOpen ? (
                <ChevronDown className="h-3 w-3 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-3 w-3 transition-transform duration-200" />
              )}
            </div>
          )}
        </button>
        
        {(isOpen || isCollapsed) && (
          <div className={cn("space-y-0", isCollapsed ? "pl-1" : "pl-4 animate-accordion-down")}>
            {item.children?.map((child, index) => (
              <ContentMenuItem
                key={child.id}
                item={child}
                level={level + 1}
                isCollapsed={isCollapsed}
                onTopicSelect={onTopicSelect}
                selectedTopic={selectedTopic}
                topicId={item.id}
                isCompleted={isCompleted}
                toggleCompletion={toggleCompletion}
                isLastSubtopic={index === item.children!.length - 1}
              />
            ))}
            
            {/* Take Test Button when all subtopics are complete */}
            {!isCollapsed && isTopicComplete && (
              <div className="mt-3 mb-2 pl-6">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    // TODO: Navigate to test for this topic
                    console.log('Take test for topic:', item.id);
                  }}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Take Test
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const completed = isCompleted && topicId ? isCompleted(topicId, item.id) : false;

  return (
    <div className="relative mb-3">
      <div className="flex items-start gap-2">
        {/* Completion Circle with Line */}
        <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (toggleCompletion && topicId) {
                toggleCompletion({ topicId, subtopicId: item.id });
              }
            }}
            className="relative z-10 bg-background transition-transform hover:scale-110"
            title={completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-500" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground bg-background hover:border-primary transition-colors" />
            )}
          </button>
          
          {/* Vertical line connecting to next subtopic */}
          {!isLastSubtopic && (
            <div className={cn(
              "w-[1.5px] h-full min-h-[32px] mt-1 transition-all duration-300",
              completed ? "bg-green-500" : "bg-border"
            )} />
          )}
        </div>

        {/* Content */}
        <button
          onClick={() => onTopicSelect(item.id, item.title)}
          className={cn(
            "flex-1 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-left",
            selectedTopic === item.id && "bg-primary/10 text-primary"
          )}
          title={shouldShowTooltip ? item.title : undefined}
        >
          {!isCollapsed && (
            <span className="text-sm truncate block">{truncatedTitle}</span>
          )}
        </button>
      </div>
    </div>
  );
};

const CustomContentSidebar: React.FC<CustomContentSidebarProps> = ({ subjectName, subjectId, onTopicSelect, selectedTopic, onBackToNotes, contentData = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get progress tracking
  const { isCompleted, toggleCompletion, getTopicProgress } = useSubtopicProgress(subjectId);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Filter topics based on search query
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) {
      return contentData;
    }

    const query = searchQuery.toLowerCase();
    const filtered: ContentItem[] = [];

    contentData.forEach((topic) => {
      // Check if topic name matches
      const topicMatches = topic.title.toLowerCase().includes(query);
      
      // Check if any subtopic matches
      const matchingSubtopics = topic.children?.filter(subtopic => 
        subtopic.title.toLowerCase().includes(query)
      ) || [];

      if (topicMatches) {
        // If topic matches, include all subtopics
        filtered.push(topic);
      } else if (matchingSubtopics.length > 0) {
        // If subtopics match, include only matching subtopics
        filtered.push({
          ...topic,
          children: matchingSubtopics
        });
      }
    });

    return filtered;
  }, [searchQuery, contentData]);

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-background border-r border-border transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-24" : "w-64"
      )}
      style={{ height: '100%' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="border-b border-border flex-shrink-0">
        {/* Back Button */}
        <div className="p-3 border-b border-border">
          <button
            onClick={onBackToNotes}
            className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {!isCollapsed && <span>Back to Notes</span>}
          </button>
        </div>
        
        {/* Title and Collapse Button */}
        <div className={cn("flex items-center p-4", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className="h-4 w-4" />
              <h3 className="font-semibold text-sm truncate">
                Course Content
              </h3>
            </div>
          )}
          <button
            onClick={handleToggleCollapse}
            className={cn(
              "p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
              !isCollapsed && "ml-auto"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !isCollapsed && "rotate-180"
              )} 
            />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex-1 overflow-hidden flex flex-col">
        <div 
          className="flex-1 overflow-auto sidebar-scrollbar"
          style={{
            overflowX: 'hidden',
            overflowY: 'auto'
          }}
        >
          {!isCollapsed && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground px-2">
                {subjectName} Topics
              </p>
            </div>
          )}
          
          <div className="space-y-1" style={{ minWidth: 'max-content' }}>
            {filteredContent.map((item) => (
              <ContentMenuItem
                key={item.id}
                item={item}
                level={0}
                isCollapsed={isCollapsed}
                onTopicSelect={onTopicSelect}
                selectedTopic={selectedTopic}
                isCompleted={isCompleted}
                toggleCompletion={toggleCompletion.mutate}
                getTopicProgress={getTopicProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomContentSidebar;