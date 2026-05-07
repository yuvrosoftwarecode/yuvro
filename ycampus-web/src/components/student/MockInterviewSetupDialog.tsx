import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Code,
  Terminal,
  Brain,
  Puzzle,
  MessageCircle,
  Building2,
  Briefcase,
  Rocket,
  Clock,
  Play,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockInterviewSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (config: InterviewConfig) => void;
}

export interface InterviewConfig {
  companyTypes: string[];
  domain: string;
  duration: number; // in minutes
}

const companyTypes = [
  {
    id: 'product',
    label: 'Product Based',
    description: 'DSA-heavy, problem solving',
    icon: Building2,
  },
  {
    id: 'service',
    label: 'Service Based',
    description: 'Aptitude + fundamentals',
    icon: Briefcase,
  },
  {
    id: 'startup',
    label: 'Startup',
    description: 'Practical + mixed',
    icon: Rocket,
  },
  {
    id: 'it_service',
    label: 'IT Service & Consulting',
    description: 'Process + Tech fundamentals',
    icon: Briefcase,
  },
];

const domains = [
  { id: 'dsa', label: 'DSA', description: 'Data Structures & Algorithms', icon: Code },
  { id: 'python', label: 'Python', description: 'Python programming concepts', icon: Terminal },
  { id: 'aptitude', label: 'Aptitude', description: 'Quantitative & verbal skills', icon: Brain },
  { id: 'logical', label: 'Logical Reasoning', description: 'Patterns & deduction', icon: Puzzle },
  { id: 'communication', label: 'Communication', description: 'Verbal & written skills', icon: MessageCircle },
];

const durations = [
  { value: 15, label: '15 Minutes', tag: 'Quick Practice' },
  { value: 30, label: '30 Minutes', tag: 'Standard' },
  { value: 45, label: '45 Minutes', tag: 'Deep Practice' },
];

const MockInterviewSetupDialog: React.FC<MockInterviewSetupDialogProps> = ({
  open,
  onOpenChange,
  onStart,
}) => {
  const [step, setStep] = useState(1);
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<string[]>([
    'product',
    'service',
    'startup',
  ]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(0);

  const toggleCompanyType = (id: string) => {
    setSelectedCompanyTypes((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((t) => t !== id);
      }
      return [...prev, id];
    });
  };

  const reset = () => {
    setStep(1);
    setSelectedCompanyTypes(['product', 'service', 'startup', 'it_service']);
    setSelectedDomain('');
    setSelectedDuration(0);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleStart = () => {
    onStart({
      companyTypes: selectedCompanyTypes,
      domain: selectedDomain,
      duration: selectedDuration,
    });
    reset();
  };

  const canProceed = () => {
    if (step === 1) return selectedCompanyTypes.length > 0;
    if (step === 2) return !!selectedDomain;
    if (step === 3) return selectedDuration > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            Mock Interview Setup
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    step === s
                      ? 'bg-amber-500 text-white'
                      : step > s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      'h-0.5 w-8 rounded-full',
                      step > s ? 'bg-emerald-500' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {step === 1 && 'Company Type'}
              {step === 2 && 'Select Domain'}
              {step === 3 && 'Set Duration'}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Step 1: Company Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select the company type(s) to tailor your interview style.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {companyTypes.map((ct) => {
                  const selected = selectedCompanyTypes.includes(ct.id);
                  return (
                    <Card
                      key={ct.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        selected
                          ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => toggleCompanyType(ct.id)}
                    >
                      <CardContent className="p-4 text-center space-y-2">
                        <ct.icon
                          className={cn(
                            'h-8 w-8 mx-auto',
                            selected ? 'text-amber-500' : 'text-muted-foreground'
                          )}
                        />
                        <p className="text-sm font-semibold text-foreground">{ct.label}</p>
                        <p className="text-xs text-muted-foreground">{ct.description}</p>
                        {selected && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0 text-[10px]">
                            Selected
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Domain Selection */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pick the domain you want to practice.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {domains.map((d) => {
                  const selected = selectedDomain === d.id;
                  return (
                    <Card
                      key={d.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        selected
                          ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => setSelectedDomain(d.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center',
                            selected
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-muted'
                          )}
                        >
                          <d.icon
                            className={cn(
                              'h-5 w-5',
                              selected ? 'text-amber-600' : 'text-muted-foreground'
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{d.label}</p>
                          <p className="text-xs text-muted-foreground">{d.description}</p>
                        </div>
                        {selected && (
                          <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Duration Selection */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose how long you want the interview to last.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {durations.map((d) => {
                  const selected = selectedDuration === d.value;
                  return (
                    <Card
                      key={d.value}
                      className={cn(
                        'cursor-pointer transition-all',
                        selected
                          ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => setSelectedDuration(d.value)}
                    >
                      <CardContent className="p-4 text-center space-y-2">
                        <Clock
                          className={cn(
                            'h-7 w-7 mx-auto',
                            selected ? 'text-amber-500' : 'text-muted-foreground'
                          )}
                        />
                        <p className="text-sm font-semibold text-foreground">{d.label}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            selected && 'border-amber-300 text-amber-600'
                          )}
                        >
                          {d.tag}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (step === 1 ? handleClose(false) : setStep(step - 1))}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 3 ? (
              <Button
                size="sm"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!canProceed()}
                onClick={handleStart}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="h-4 w-4 mr-1" />
                Start Interview
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MockInterviewSetupDialog;
