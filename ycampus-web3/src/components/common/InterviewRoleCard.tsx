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
}) => {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all border-slate-200 group flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Type + category badge row — same as Task */}
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`text-[9px] uppercase tracking-widest font-bold border ${getCategoryBadgeClass(category)}`}
              >
                {category}
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors leading-snug">
              {title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm font-medium leading-relaxed">
              {description}
            </CardDescription>
          </div>
          {/* Icon floated top-right like Task page's status badge */}
          <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
        </div>
      </CardHeader>

      <CardContent className="mt-auto">
        {/* Meta row — same style as Task's date/due row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{duration} mins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{questionCount} questions</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={e => { e.stopPropagation(); onStart(); }}
            className="gap-1.5 font-bold px-4 shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterviewRoleCard;
