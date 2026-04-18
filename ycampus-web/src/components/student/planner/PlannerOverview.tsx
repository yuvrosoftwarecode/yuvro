import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BrainCircuit, Sparkles, Loader2, TrendingUp, CheckCircle2, AlertTriangle, Mic, Trash2 } from 'lucide-react';
import { StudentPlan, fetchStudentPlans, deleteStudentPlan } from '@/services/plannerService';
import PlanCard from './PlanCard';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlannerOverviewProps {
  onCreateNew: () => void;
  onSelectPlan: (plan: StudentPlan) => void;
}

const insights = [
  { icon: TrendingUp, text: 'Your coding accuracy improved by 12% in the last 7 days.', type: 'positive' as const },
  { icon: CheckCircle2, text: 'You are strong in Arrays and Sorting.', type: 'positive' as const },
  { icon: AlertTriangle, text: 'Dynamic Programming requires additional practice.', type: 'warning' as const },
  { icon: Mic, text: 'Recommended 2 more coding mock interviews before your target interview.', type: 'info' as const },
];

export default function PlannerOverview({ onCreateNew, onSelectPlan }: PlannerOverviewProps) {
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchStudentPlans();
      setPlans(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error("Failed to load plans", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrigger = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlanToDelete(id);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;

    try {
      await deleteStudentPlan(planToDelete);
      setPlans(prev => prev.filter(p => p.id !== planToDelete));
      toast.success("Plan deleted successfully");
    } catch (error) {
      toast.error("Failed to delete plan");
    } finally {
      setPlanToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>Syncing with AI Planner...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BrainCircuit className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Interview Planner</h1>
            <p className="text-sm text-muted-foreground">Track your personalized preparation roadmaps</p>
          </div>
        </div>
        <Button onClick={onCreateNew} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2 h-11 px-6 shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">
          <Plus className="h-4 w-4" /> Create New Plan
        </Button>
      </div>

      {/* Ongoing Plans Listing */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Ongoing Plans</h2>
          <div className="bg-orange-100 text-orange-700 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full">
            {plans.length} Total
          </div>
        </div>

        {plans.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/10 py-16">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                <BrainCircuit className="h-8 w-8 text-orange-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">No Preparation Plans Found</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Generate your first personalized interview preparation roadmap today.
                </p>
              </div>
              <Button onClick={onCreateNew} variant="outline" className="mt-4 gap-2 border-orange-200 hover:bg-orange-50 text-orange-600">
                <Sparkles className="h-4 w-4" /> Start Generation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <PlanCard 
                key={plan.id} 
                plan={plan} 
                onClick={onSelectPlan} 
                onDelete={handleDeleteTrigger}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Readiness Insights Section */}
      <div className="space-y-6 pt-10 border-t">
        <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">AI Readiness Insights</h2>
            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50/50">Personalized</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins, i) => (
                <Card key={i} className={`border-border/60 ${ins.type === 'warning' ? 'border-l-4 border-l-amber-400' : ins.type === 'positive' ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-blue-400'}`}>
                    <CardContent className="pt-4 pb-3 flex items-center gap-3">
                        <ins.icon className={`h-5 w-5 shrink-0 ${ins.type === 'warning' ? 'text-amber-500' : ins.type === 'positive' ? 'text-green-600' : 'text-blue-500'}`} />
                        <p className="text-sm text-foreground/80">{ins.text}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Preparation Plan?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your progress and generated tasks for this roadmap will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
