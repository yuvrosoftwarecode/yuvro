import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock } from 'lucide-react';

interface InterviewRoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string; // Tailwind gradient classes e.g. "from-orange-500 to-rose-500"
  duration: number;
  questionCount: number;
  category: string; // Startup, Product Based, Service Based
  onStart: () => void;
}

const InterviewRoleCard: React.FC<InterviewRoleCardProps> = ({
  title,
  description,
  icon,
  gradient,
  duration,
  questionCount,
  category,
  onStart,
}) => {
  return (
    <Card className="group relative h-full flex flex-col overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl">
      {/* Top Gradient Section */}
      <div className={`relative h-32 w-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {/* Decorative Circles */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/5 rounded-full blur-2xl" />
        
        {/* Icon */}
        <div className="relative z-10 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner group-hover:scale-110 transition-transform duration-500">
          <span className="text-3xl text-white drop-shadow-md">
            {icon}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/20 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-white/90" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">{duration}m Interview</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between mt-auto mb-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
              {questionCount} Questions
            </span>
          </div>
          <Badge variant="secondary" className="bg-white text-slate-600 border-none font-bold text-[10px] uppercase px-2 py-0.5 rounded-md">
            {category}
          </Badge>
        </div>

        {/* Action Button */}
        <Button 
          onClick={onStart}
          className={`w-full py-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all active:scale-95 shadow-lg shadow-slate-200 group-button`}
        >
          <Play className="w-4 h-4 mr-2 fill-current" />
          Start Interview
        </Button>
      </div>
    </Card>
  );
};

export default InterviewRoleCard;
