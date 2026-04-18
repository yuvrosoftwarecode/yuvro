import React, { useEffect, useState } from 'react';
import { PartyPopper, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface ThankYouScreenProps {
  onComplete: () => void;
}

const ThankYouScreen: React.FC<ThankYouScreenProps> = ({ onComplete }) => {
  const [countdown, setCountdown] = useState(5);
  const progressValue = ((5 - countdown) / 5) * 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <Card className="w-full max-w-md shadow-2xl border-border animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div className="relative">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 p-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                    <PartyPopper className="w-4 h-4 text-amber-500" />
                </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Great Job!
          </CardTitle>
          <CardDescription className="text-base font-medium text-slate-600 dark:text-slate-300 mt-2">
            Thank you for attending the mock interview.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center pt-2 pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your performance analysis is being generated.
            You can view your detailed report in the library shortly.
          </p>

          <div className="mt-10 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              <span>Redirecting to Library</span>
              <span className="text-primary">{countdown}s</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button 
            onClick={onComplete}
            className="w-full h-11 rounded-lg font-bold transition-all active:scale-[0.98] gap-2"
          >
            Go to Library Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ThankYouScreen;