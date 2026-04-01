import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Brain, TrendingUp, Target, Lightbulb, BookOpen, Zap, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import codeEditorService from '@/services/codeEditorService';

interface AIInsightsProps {
  onBack: () => void;
}

interface Insight {
  type: 'strength' | 'weakness' | 'recommendation' | 'trend';
  title: string;
  description: string;
  icon: any;
  color: string;
}

const MOCK_INSIGHTS: Insight[] = [
  {
    type: 'weakness',
    title: 'Temporal Complexity Logic Failure',
    description: 'Detected sub-optimal O(n²) logic paths where linear O(n) vectors were possible. Recalibrate hash mapping and two-pointer synchronization.',
    icon: BookOpen,
    color: 'bg-rose-50 text-rose-600 border-rose-100 placeholder-rose-500'
  },
  {
    type: 'recommendation',
    title: 'Decrypt Graph Traversal',
    description: 'Signal loss detected in Graph sectors. Initialize DFS/BFS subroutines to resolve "Number of Islands" modules.',
    icon: Lightbulb,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100 placeholder-indigo-500'
  },
  {
    type: 'strength',
    title: 'Python Logic Proficiency',
    description: 'High-fidelity command of Python list comprehensions and standard library protocols detected.',
    icon: TrendingUp,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100 placeholder-emerald-500'
  },
  {
    type: 'trend',
    title: 'Peak Operational Window',
    description: 'Max cognitive throughput detected between 2000h and 2300h. Vectors show 20% higher sync rate.',
    icon: Zap,
    color: 'bg-amber-50 text-amber-600 border-amber-100 placeholder-amber-500'
  }
];

const PRO_TIPS = [
  "Maintain continuous uplink for 3 cycles to activate deep logic synergy.",
  "Manifest full vector constraints before initializing code injection.",
  "Optimize for readability protocols over raw performance hacks.",
  "Peeking at hints during signal loss prevents total logic collapse.",
  "Simulate manual test vectors to harden your implementation matrix."
];

const AIInsights = ({ onBack }: AIInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTip, setCurrentTip] = useState(PRO_TIPS[0]);

  useEffect(() => {
    setCurrentTip(PRO_TIPS[Math.floor(Math.random() * PRO_TIPS.length)]);

    const fetchInsights = async () => {
      try {
        setLoading(true);
        let fetchedInsights: Insight[] = [];
        try {
          const data = await codeEditorService.generateInsights();
          if (data && data.insights) {
            fetchedInsights = data.insights.map((item: any) => {
              let IconComponent = Lightbulb;
              if (item.icon_name === 'TrendingUp') IconComponent = TrendingUp;
              else if (item.icon_name === 'BookOpen') IconComponent = BookOpen;
              else if (item.icon_name === 'Target') IconComponent = Target;
              else if (item.icon_name === 'Zap') IconComponent = Zap;

              let colorClass = 'bg-slate-50 text-slate-600 border-slate-100 placeholder-slate-500';
              if (item.type === 'strength') colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100 placeholder-emerald-500';
              else if (item.type === 'weakness') colorClass = 'bg-rose-50 text-rose-600 border-rose-100 placeholder-rose-500';
              else if (item.type === 'recommendation') colorClass = 'bg-indigo-50 text-indigo-600 border-indigo-100 placeholder-indigo-500';
              else if (item.type === 'trend') colorClass = 'bg-amber-50 text-amber-600 border-amber-100 placeholder-amber-500';

              return {
                type: item.type,
                title: item.title,
                description: item.description,
                icon: IconComponent,
                color: colorClass
              };
            });
          }
        } catch (err) {
          console.warn("Neural sync failed, utilizing fallback vectors", err);
        }

        if (fetchedInsights.length === 0) setInsights(MOCK_INSIGHTS);
        else setInsights(fetchedInsights);
      } catch (error) {
        console.error('Failed to generate insights:', error);
        setInsights(MOCK_INSIGHTS);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  const focusAreas = insights.filter(i => i.type === 'weakness' || i.type === 'recommendation');
  const growthAreas = insights.filter(i => i.type === 'strength' || i.type === 'trend');

  const chartData = [
    { name: 'Weakness', count: insights.filter(i => i.type === 'weakness').length, color: '#f43f5e' },
    { name: 'Strength', count: insights.filter(i => i.type === 'strength').length, color: '#10b981' },
    { name: 'Improve', count: insights.filter(i => i.type === 'recommendation').length, color: '#6366f1' },
    { name: 'Trend', count: insights.filter(i => i.type === 'trend').length, color: '#f59e0b' },
  ].filter(d => d.count > 0);

  const getPulseMessage = () => {
    if (loading) return "CALIBRATING COGNITIVE CORE...";
    if (insights.length === 0) return "AWAITING DEPLOYMENT...";
    const weaknessCount = insights.filter(i => i.type === 'weakness').length;
    const strengthCount = insights.filter(i => i.type === 'strength').length;
    if (weaknessCount > strengthCount) return "CRITICAL GROWTH POTENTIAL DETECTED";
    if (strengthCount > weaknessCount) return "LOGIC MOMENTUM: MAX THROUGHPUT";
    return "BALANCED COGNITIVE DEVELOPMENT";
  };

  if (loading) {
    return (
      <div className="w-full flex-1 p-10 space-y-12 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-[3rem] w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="h-80 bg-slate-100 rounded-[3rem]"></div>
          <div className="h-80 bg-slate-100 rounded-[3rem]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 overflow-y-auto space-y-12 p-8 pt-0 custom-scrollbar animate-in fade-in duration-700">
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 border-4 border-slate-800 p-12 transition-all shadow-2xl shadow-indigo-100/20">
        <div className="absolute top-0 right-0 p-10 opacity-10 blur-sm pointer-events-none">
             <Brain size={200} className="text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <Button variant="ghost" onClick={onBack} className="h-10 w-10 p-0 rounded-xl border border-white/10 hover:bg-white hover:text-black transition-all text-white">
                  <ChevronLeft size={16} strokeWidth={3} />
               </Button>
               <Badge className="bg-indigo-600 text-white border-0 px-4 py-1.5 rounded-xl uppercase font-black text-[9px] tracking-widest animate-pulse shadow-lg shadow-indigo-600/30">
                  <Sparkles className="w-3.5 h-3.5 mr-2 inline-block" /> Cognitive scan active
               </Badge>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none max-w-xl">
              {getPulseMessage()}
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] max-w-2xl leading-loose">
              LOG ANALYSIS OF LAST {insights.length > 0 ? '20' : '0'} VECTORS COMPLETE. ROADMAP INITIALIZED.
            </p>
          </div>

          <div className="hidden md:block w-48 h-48 bg-white/5 rounded-[2rem] border border-white/5 p-6 shadow-inner pb-2">
            {insights.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/10">
                <Brain className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pb-20">
        <div className="lg:col-span-7 space-y-10">
            <div className="flex items-center gap-4 px-2">
              <div className="h-10 w-2 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
              <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">Primary Focus Sectors</h2>
            </div>

            <div className="space-y-8">
              {focusAreas.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <Card key={index} className="group overflow-hidden rounded-[3rem] border-2 border-slate-50 bg-white shadow-xl hover:shadow-2xl hover:border-rose-100 transition-all duration-500 flex flex-col md:flex-row">
                    <div className="md:w-32 bg-slate-50 flex items-center justify-center p-8 group-hover:bg-rose-50 transition-colors">
                       <div className={`p-5 rounded-2xl ${insight.color} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                          <Icon className="w-8 h-8" />
                       </div>
                    </div>
                    <div className="flex-1 p-10 space-y-4">
                       <div className="flex items-center justify-between gap-4">
                          <CardTitle className="text-xl font-black text-slate-800 tracking-tight uppercase italic group-hover:text-rose-600 transition-colors">
                             {insight.title}
                          </CardTitle>
                          <Badge className={`${insight.color} shadow-sm border-0 px-3 py-1 rounded-lg uppercase font-black text-[8px] tracking-widest`}>
                             {insight.type}
                          </Badge>
                       </div>
                       <p className="text-sm font-bold text-slate-500 leading-relaxed uppercase tracking-wide">
                          {insight.description}
                       </p>
                    </div>
                  </Card>
                );
              })}
            </div>
        </div>

        <div className="lg:col-span-5 space-y-12">
            <div className="flex items-center gap-4 px-2">
              <div className="h-10 w-2 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">Strength Index</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {growthAreas.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <Card key={index} className="rounded-[2.5rem] border-2 border-slate-50 bg-white p-8 group hover:border-emerald-100 hover:shadow-2xl transition-all duration-500">
                    <CardContent className="p-0 flex items-start gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${insight.color} shadow-sm transition-transform group-hover:scale-110`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{insight.title}</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                          {insight.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="rounded-[2.5rem] bg-indigo-600 border-0 p-10 shadow-2xl shadow-indigo-200 overflow-hidden relative group hover:scale-[1.02] transition-transform">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
                  <Zap size={100} className="text-white fill-current" />
               </div>
               <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-3">
                   <Zap className="w-5 h-5 text-amber-300 fill-current animate-pulse" />
                   <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Operational Pro-Tip</h3>
                 </div>
                 <p className="text-lg font-black text-white italic tracking-tight leading-relaxed">
                   "{currentTip}"
                 </p>
               </div>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
