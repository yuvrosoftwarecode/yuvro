import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Briefcase, Rocket, Clock, Play, Code, Terminal, Brain, Puzzle, MessageCircle, Database, Server, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import MockInterviewSession from '@/components/student/MockInterviewSession';
import type { InterviewConfig } from '@/components/student/MockInterviewSetupDialog';

const companyFilters = [
  { id: 'all', label: 'All', icon: Building2 },
  { id: 'product', label: 'Product Based', icon: Building2 },
  { id: 'service', label: 'Service Based', icon: Briefcase },
  { id: 'startup', label: 'Startup', icon: Rocket },
];

const domainCards = [
  {
    id: 'dsa',
    title: 'DSA',
    description: 'Data Structures & Algorithms',
    icon: Code,
    duration: 30,
    durationLabel: '30m interview',
    gradient: 'from-amber-400 to-orange-500',
    bgLight: 'bg-amber-50 dark:bg-amber-950/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    questions: 15,
    companyType: 'Product',
  },
  {
    id: 'python',
    title: 'Python',
    description: 'Python programming & frameworks',
    icon: Terminal,
    duration: 30,
    durationLabel: '30m interview',
    gradient: 'from-blue-400 to-indigo-500',
    bgLight: 'bg-blue-50 dark:bg-blue-950/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    questions: 12,
    companyType: 'Product',
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'Scalability, architecture & design patterns',
    icon: Server,
    duration: 45,
    durationLabel: '45m interview',
    gradient: 'from-purple-400 to-violet-500',
    bgLight: 'bg-purple-50 dark:bg-purple-950/20',
    textColor: 'text-purple-700 dark:text-purple-300',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    questions: 8,
    companyType: 'Product',
  },
  {
    id: 'java',
    title: 'Java',
    description: 'Core Java, OOP & enterprise patterns',
    icon: Coffee,
    duration: 30,
    durationLabel: '30m interview',
    gradient: 'from-red-400 to-rose-500',
    bgLight: 'bg-red-50 dark:bg-red-950/20',
    textColor: 'text-red-700 dark:text-red-300',
    badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    questions: 14,
    companyType: 'Service',
  },
  {
    id: 'aptitude',
    title: 'Aptitude',
    description: 'Quantitative & verbal reasoning',
    icon: Brain,
    duration: 30,
    durationLabel: '30m interview',
    gradient: 'from-emerald-400 to-teal-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    questions: 20,
    companyType: 'Service',
  },
  {
    id: 'logical',
    title: 'Logical Reasoning',
    description: 'Patterns, puzzles & deduction',
    icon: Puzzle,
    duration: 30,
    durationLabel: '30m interview',
    gradient: 'from-cyan-400 to-sky-500',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/20',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
    questions: 18,
    companyType: 'Startup',
  },
  {
    id: 'communication',
    title: 'Communication',
    description: 'Verbal, written & presentation skills',
    icon: MessageCircle,
    duration: 15,
    durationLabel: '15m interview',
    gradient: 'from-pink-400 to-fuchsia-500',
    bgLight: 'bg-pink-50 dark:bg-pink-950/20',
    textColor: 'text-pink-700 dark:text-pink-300',
    badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    questions: 10,
    companyType: 'Startup',
  },
  {
    id: 'dbms',
    title: 'DBMS',
    description: 'Database concepts, SQL & normalization',
    icon: Database,
    duration: 30,
    durationLabel: '30m interview',
    gradient: 'from-yellow-400 to-amber-500',
    bgLight: 'bg-yellow-50 dark:bg-yellow-950/20',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    questions: 12,
    companyType: 'Product',
  },
];

const MockInterviewSelect = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null);

  const filteredCards = activeFilter === 'all'
    ? domainCards
    : domainCards.filter(c => c.companyType.toLowerCase() === activeFilter);

  const handleStartInterview = (card: typeof domainCards[0]) => {
    setInterviewConfig({
      companyTypes: [card.companyType.toLowerCase()],
      domain: card.id,
      duration: card.duration,
    });
  };

  if (interviewConfig) {
    return (
      <StudentLayout>
        <MockInterviewSession
          config={interviewConfig}
          onExit={() => setInterviewConfig(null)}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/interview-preparation')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mock Interviews</h1>
            <p className="text-sm text-muted-foreground">Choose a domain and start practicing</p>
          </div>
        </div>

        {/* Company Type Filter */}
        <div className="flex flex-wrap gap-2">
          {companyFilters.map((f) => (
            <Button
              key={f.id}
              variant={activeFilter === f.id ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-1.5 text-xs',
                activeFilter === f.id && 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
              )}
              onClick={() => setActiveFilter(f.id)}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </Button>
          ))}
        </div>

        {/* Domain Cards Grid - grouped in rows of 4 with extra gap */}
        <div className="space-y-8">
          {Array.from({ length: Math.ceil(filteredCards.length / 4) }, (_, groupIdx) => (
            <div key={groupIdx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCards.slice(groupIdx * 4, groupIdx * 4 + 4).map((card) => (
                <Card
                  key={card.id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-sm"
                  onClick={() => handleStartInterview(card)}
                >
                  {/* Gradient Header */}
                  <div className={cn('h-24 bg-gradient-to-br flex items-center justify-center relative', card.gradient)}>
                    <card.icon className="h-10 w-10 text-white/90" />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 text-[10px] font-semibold gap-1">
                        <Clock className="h-3 w-3" />
                        {card.durationLabel}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-foreground text-base">{card.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.description}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{card.questions} questions</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {card.companyType}
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      className={cn(
                        'w-full text-xs gap-1.5 bg-gradient-to-r text-white border-0',
                        card.gradient
                      )}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Interview
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No interviews available for this company type.</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default MockInterviewSelect;
