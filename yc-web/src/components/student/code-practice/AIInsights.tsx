import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Brain, TrendingUp, Target, Lightbulb, BookOpen, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import codeEditorService from '@/services/codeEditorService';
import { toast } from 'sonner';

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
    title: 'Time Complexity Struggles',
    description: 'Detected O(n²) solutions where O(n) was possible. Focus on hash maps and two-pointer techniques.',
    icon: BookOpen,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  },
  {
    type: 'recommendation',
    title: 'Master Graph Traversal',
    description: 'You often skip Graph problems. Try solving "Number of Islands" to build confidence with DFS/BFS.',
    icon: Lightbulb,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  {
    type: 'strength',
    title: 'Python Proficiency',
    description: 'You demonstrate strong command of Python list comprehensions and standard libraries.',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  {
    type: 'trend',
    title: 'Consistent Night Owl',
    description: 'You perform best between 8 PM and 11 PM. Your success rate is 20% higher during these hours.',
    icon: Zap,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }
];

const PRO_TIPS = [
  "Consistency is key. Try to maintain a streak of at least 3 days to see the biggest improvements in your logic.",
  "Read the problem statement twice before writing a single line of code. Understanding edge cases saves debugging time.",
  "Optimize for readability first, then performance. Clear code is easier to debug and maintain.",
  "Don't get stuck! If you're blocked for 20 minutes, peek at a hint or the discussion tab to unblock your learning.",
  "Practice writing test cases before your solution. It forces you to understand the requirements deeply."
];

const AIInsights = ({ onBack }: AIInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTip, setCurrentTip] = useState(PRO_TIPS[0]);

  useEffect(() => {
    // Randomize tip on mount
    setCurrentTip(PRO_TIPS[Math.floor(Math.random() * PRO_TIPS.length)]);

    const fetchInsights = async () => {
      try {
        setLoading(true);
        // Attempt to fetch real data
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

              let colorClass = 'bg-muted text-muted-foreground';
              if (item.type === 'strength') colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
              else if (item.type === 'weakness') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
              else if (item.type === 'recommendation') colorClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
              else if (item.type === 'trend') colorClass = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';

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
          console.warn("Backend fetch failed, falling back to mock data for demo", err);
        }

        // Use mock data if real data is empty (or fetch failed)
        if (fetchedInsights.length === 0) {
          setInsights(MOCK_INSIGHTS);
        } else {
          setInsights(fetchedInsights);
        }
      } catch (error) {
        console.error('Failed to generate insights:', error);
        // Even in outer catch, fallback to mock data so UI shows something
        setInsights(MOCK_INSIGHTS);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  // Split insights into categories
  const focusAreas = insights.filter(i => i.type === 'weakness' || i.type === 'recommendation');
  const growthAreas = insights.filter(i => i.type === 'strength' || i.type === 'trend');

  // Chart Data
  const chartData = [
    { name: 'Weakness', count: insights.filter(i => i.type === 'weakness').length, color: '#ef4444' }, // red-500
    { name: 'Strength', count: insights.filter(i => i.type === 'strength').length, color: '#22c55e' }, // green-500
    { name: 'Improve', count: insights.filter(i => i.type === 'recommendation').length, color: '#3b82f6' }, // blue-500
    { name: 'Trend', count: insights.filter(i => i.type === 'trend').length, color: '#a855f7' }, // purple-500
  ].filter(d => d.count > 0);

  // Dynamic Pulse Message
  const getPulseMessage = () => {
    if (loading) return "Analyzing your code DNA...";
    if (insights.length === 0) return "Ready to analyze your first steps.";

    const weaknessCount = insights.filter(i => i.type === 'weakness').length;
    const strengthCount = insights.filter(i => i.type === 'strength').length;

    if (weaknessCount > strengthCount) return "Optimization Mode: High potential for growth detected.";
    if (strengthCount > weaknessCount) return "Momentum Mode: You're crushing it! Keep the streak alive.";
    return "Balanced Growth: You're making steady progress.";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse space-y-8">
          <div className="h-20 bg-muted/50 rounded-2xl w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-muted/50 rounded-2xl" />
            <div className="h-64 bg-muted/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8 space-y-10">
      {/* Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-background/80 -ml-2 gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Hero / Pulse Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600/10 via-blue-600/5 to-transparent border border-white/10 p-8 md:p-10 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-primary/20 text-primary mb-3 px-3 py-1">
              <Brain className="w-3 h-3 mr-2 inline-block animate-pulse" />
              AI Code Analysis
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {getPulseMessage()}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              Based on your last {insights.length > 0 ? '20' : '0'} submissions, here is your personalized roadmap.
            </p>
          </div>

          {/* Dynamic Bar Chart */}
          <div className="hidden md:block w-1/3 max-w-xs h-32">
            {insights.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/30">
                <Brain className="w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      {insights.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* PRIMARY COLUMN: FOCUS AREAS (Weakness/Recommendation) - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-1 bg-red-500 rounded-full" />
              <h2 className="text-2xl font-bold tracking-tight">Focus Areas</h2>
              <Badge variant="secondary" className="ml-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-0">
                Action Required
              </Badge>
            </div>

            {focusAreas.length > 0 ? (
              focusAreas.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <Card key={index} className="group overflow-hidden border-0 border-l-4 border-l-red-500/50 hover:border-l-red-500 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-red-500/5 dark:bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${insight.color} bg-opacity-10 shrink-0`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-xl leading-none group-hover:text-primary transition-colors">
                            {insight.title}
                          </CardTitle>
                          <Badge variant="outline" className={`${insight.color} bg-opacity-5 border-0 ring-1 ring-inset ring-current opacity-70`}>
                            {insight.type === 'weakness' ? 'Critical' : 'Recommendation'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed text-base">
                        {insight.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/30">
                <p>No critical areas detected yet. Keep challenging yourself!</p>
              </div>
            )}
          </div>

          {/* SECONDARY COLUMN: GROWTH ZONE (Strength/Trend) - 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-1 bg-green-500 rounded-full" />
              <h2 className="text-2xl font-bold tracking-tight">Growth Zone</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {growthAreas.length > 0 ? (
                growthAreas.map((insight, index) => {
                  const Icon = insight.icon;
                  return (
                    <Card key={index} className="hover:scale-[1.01] transition-transform duration-300 border-0 shadow-sm hover:shadow-md dark:bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${insight.color} bg-opacity-10 shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground leading-snug">
                            {insight.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/30">
                  <p>Solve more problems to uncover your strengths.</p>
                </div>
              )}
            </div>

            {/* Mini Stat Card (Pro Tip) */}
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-0 shadow-sm hover:scale-[1.02] transition-transform duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold">Pro Tip</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentTip}
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      ) : (
        <div className="text-center py-24 bg-muted/20 rounded-3xl border border-dashed">
          <Brain className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Awaiting Data</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete a few coding problems to generate your first set of AI-powered insights.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIInsights;