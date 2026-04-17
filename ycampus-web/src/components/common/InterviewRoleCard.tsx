
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
  user_progress?: { completed_count: number; is_master: boolean };
  my_submissions?: any[];
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
  buttonType = 'start',
  user_progress,
  my_submissions = [],
}) => {
  const completedCount = user_progress?.completed_count || 0;
  const isMasterAvailable = completedCount >= 5;
  const currentTitle = isMasterAvailable ? `Master ${title}` : `${title}`;
  
  // Progress indicators - 5 steps
  const renderProgress = () => {
    return (
      <div className="flex flex-col gap-2 mt-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Practice Phase
          </span>
          <span className="text-[10px] font-medium text-slate-500">
            {completedCount}/5 Sessions
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div 
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                step <= completedCount 
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-100' 
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        {!isMasterAvailable && (
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
            <HelpCircle className="h-3 w-3" />
            <span>Complete 5 practice sessions to unlock Master Interview</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`relative overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 border-slate-200 rounded-2xl group flex flex-col h-full bg-white ${!isMasterAvailable && buttonType !== 'report' ? '' : 'ring-1 ring-amber-100'}`}>
      
      {/* Visual lock overlay for master state (if we wanted full lock) */}
      
      <CardHeader className="px-6 pt-6 pb-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className={`text-[9px] uppercase tracking-widest font-bold border px-2 py-0.5 rounded-md ${getCategoryBadgeClass(category)}`}
              >
                {category}
              </Badge>
              {isMasterAvailable && (
                 <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] uppercase tracking-tighter font-bold">
                    Master Unlocked
                 </Badge>
              )}
            </div>
            <CardTitle className="text-[19px] font-bold tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
              {currentTitle}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm font-medium text-slate-500 leading-relaxed min-h-[40px] mt-2">
              {description}
            </CardDescription>
            {renderProgress()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-0 mt-auto relative z-10">
        <div className="flex items-center justify-between pt-5 border-t border-slate-100/60">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-500" />
                <span>{duration} Mins</span>
              </div>
              <div className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-purple-500" />
                <span>{questionCount} Questions</span>
              </div>
            </div>
          </div>

          {buttonType === 'report' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={e => { e.stopPropagation(); onStart(); }}
              className="gap-2 h-10 text-xs font-bold px-5 rounded-xl border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              Show Report
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={e => { e.stopPropagation(); onStart(); }}
              className={`gap-2 h-10 text-xs font-bold px-6 rounded-xl transition-all shadow-lg active:scale-95 ${
                isMasterAvailable 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200/50' 
                  : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200/50'
              }`}
            >
              {isMasterAvailable ? (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> 
                  Master Session
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Practice Now
                </>
              )}
            </Button>
          )}
        </div>
  
  {my_submissions && my_submissions.length > 0 && (
    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
       <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">
         <Clock className="h-3 w-3" />
         Previous Attempts
       </div>
       <div className="flex flex-wrap gap-2">
         {my_submissions.slice(0, 3).map((sub: any) => (
           <Badge 
             key={sub.id} 
             variant="secondary" 
             className="text-[10px] py-0 h-6 cursor-pointer hover:bg-slate-200"
             onClick={(e) => {
               e.stopPropagation();
               // Navigate to report
               window.location.href = `/student/mock-interview/report/${sub.id}`;
             }}
           >
             {sub.report_summary?.overall_score ? `${sub.report_summary.overall_score}%` : 'View'}
           </Badge>
         ))}
         {my_submissions.length > 3 && (
           <span className="text-[10px] text-slate-400">+{my_submissions.length - 3} more</span>
         )}
       </div>
    </div>
  )}
</CardContent>
      </Card>
    
    
    
    
  );
};

export default InterviewRoleCard;
