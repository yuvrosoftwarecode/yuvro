import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, HelpCircle } from 'lucide-react';


interface InterviewRoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  duration: number;
  questionCount: number;
  category: string;
  onStart: () => void;
  buttonType?: 'start' | 'report';

}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'Product Based':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Startup':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Service Based':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const InterviewRoleCard: React.FC<InterviewRoleCardProps> = ({
  title,
  description,
  icon,
  duration,
  questionCount,
  category,
  onStart,
  buttonType = 'start', // ✅ default value
}) => {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 rounded-xl group flex flex-col h-full">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Type + category badge row — same as Task */}
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] tracking-wide font-semibold border px-2.5 py-0.5 ${getCategoryBadgeClass(category)}`}
              >
                {category}
              </Badge>
            </div>
            <CardTitle className="text-[18px] font-semibold group-hover:text-primary transition-colors leading-tight line-clamp-2">
              {title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm font-normal text-slate-500 leading-relaxed min-h-[40px]">
              {description}
            </CardDescription>
          </div>
  
        </div>
      </CardHeader>

        <CardContent className="px-6 pb-6 pt-0 mt-auto">
  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span>{duration} mins</span>
      </div>
      <div className="flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>{questionCount} questions</span>
      </div>
    </div>

    {buttonType === 'report' ? (
      <Button
        size="sm"
        variant="outline"
        onClick={e => { e.stopPropagation(); onStart(); }}
        className="gap-1.5 h-9 text-sm font-semibold px-4 shrink-0"
      >
        Show Report
      </Button>
    ) : (
      <Button
        size="sm"
        onClick={e => { e.stopPropagation(); onStart(); }}
        className="gap-1.5 h-9 text-sm font-semibold px-4 shrink-0"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        Start
      </Button>
    )}
  </div>
</CardContent>
      </Card>
    
    
    
    
  );
};

export default InterviewRoleCard;
