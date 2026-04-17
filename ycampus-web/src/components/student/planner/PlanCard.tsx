import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, BrainCircuit, Trash2 } from 'lucide-react';
import { StudentPlan } from '@/services/plannerService';

interface PlanCardProps {
  plan: StudentPlan;
  onClick: (plan: StudentPlan) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export default function PlanCard({ plan, onClick, onDelete }: PlanCardProps) {
  return (
    <Card 
      className="group hover:border-orange-200 hover:shadow-md transition-all cursor-pointer overflow-hidden border-border/60"
      onClick={() => onClick(plan)}
    >
      <div className="h-1.5 w-full bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500" 
          style={{ width: `${plan.progress_percentage}%` }}
        />
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <BrainCircuit className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{plan.role_title}</h3>
              <p className="text-sm text-muted-foreground font-medium">{plan.company_name}</p>
            </div>
          </div>
          <Badge 
            className="bg-orange-100 text-orange-700 border-orange-200 text-xs"
          >
            {plan.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-orange-500" />
            <span>{plan.duration_days} Days</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>{plan.daily_hours}h/Day</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Readiness</span>
            <span>{plan.progress_percentage}%</span>
          </div>
          <Progress value={plan.progress_percentage} className="h-1.5 bg-muted/50" />
        </div>

        <div className="mt-5 pt-4 border-t flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
            onClick={(e) => onDelete(plan.id, e)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50">
            View Roadmap <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
