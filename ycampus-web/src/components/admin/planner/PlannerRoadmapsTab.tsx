import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";
import { 
  PrepTimeline, 
  StudyTime, 
  fetchPrepTimelines, 
  createPrepTimeline, 
  deletePrepTimeline,
  fetchStudyTimes,
  createStudyTime,
  deleteStudyTime
} from '@/services/plannerService';

const PlannerRoadmapsTab = () => {
  const [prepTimelines, setPrepTimelines] = useState<PrepTimeline[]>([]);
  const [studyTimes, setStudyTimes] = useState<StudyTime[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newDays, setNewDays] = useState('');
  const [newHours, setNewHours] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [timelines, times] = await Promise.all([
        fetchPrepTimelines(),
        fetchStudyTimes()
      ]);
      setPrepTimelines(timelines.sort((a, b) => a.days - b.days));
      setStudyTimes(times.sort((a, b) => a.hours - b.hours));
    } catch (error) {
      toast.error("Failed to load configuration options");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeline = async () => {
    const days = parseInt(newDays);
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter a valid number of days");
      return;
    }

    try {
      const newItem = await createPrepTimeline({ days });
      setPrepTimelines(prev => [...prev, newItem].sort((a, b) => a.days - b.days));
      setNewDays('');
      toast.success(`${days} days timeline added`);
    } catch (error) {
      toast.error("Failed to add timeline (it may already exist)");
    }
  };

  const handleDeleteTimeline = async (id: string) => {
    try {
      await deletePrepTimeline(id);
      setPrepTimelines(prev => prev.filter(t => t.id !== id));
      toast.success("Timeline option removed");
    } catch (error) {
      toast.error("Failed to delete timeline");
    }
  };

  const handleAddStudyTime = async () => {
    const hours = parseInt(newHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    try {
      const newItem = await createStudyTime({ hours });
      setStudyTimes(prev => [...prev, newItem].sort((a, b) => a.hours - b.hours));
      setNewHours('');
      toast.success(`${hours} hours study time added`);
    } catch (error) {
      toast.error("Failed to add study time (it may already exist)");
    }
  };

  const handleDeleteStudyTime = async (id: string) => {
    try {
      await deleteStudyTime(id);
      setStudyTimes(prev => prev.filter(t => t.id !== id));
      toast.success("Study time option removed");
    } catch (error) {
      toast.error("Failed to delete study time");
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground animate-pulse">Initializing roadmap dimensions...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
<h2 className="text-2xl font-bold tracking-tight text-foreground">          Roadmap Configurations
        </h2>
          <p className="text-muted-foreground mt-1">          Manage dimensions that students can select to generate their personalized AI roadmaps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preparation Timeline Column */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-lg shadow-primary/5 h-full overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Preparation Timelines</CardTitle>
                  <CardDescription>Available durations in days</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type="number" 
                    placeholder="Enter days (e.g. 30)" 
                    className="pl-9 h-11"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                  />
                  <Clock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
                <Button onClick={handleAddTimeline} className="h-11 px-6 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" /> Add 
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {prepTimelines.length === 0 ? (
                  <div className="text-center py-10 bg-muted/30 rounded-xl border-dashed border-2">
                    <p className="text-sm text-muted-foreground">No timelines defined yet.</p>
                  </div>
                ) : (
                  prepTimelines.map((timeline) => (
                    <div 
                      key={timeline.id}
                      className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 opacity-60" />
                        <div>
                          <span className="text-lg font-bold tracking-tight">{timeline.days}</span>
                          <span className="ml-2 text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Days</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteTimeline(timeline.id)}
                        className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Study Time Column */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-lg shadow-secondary/5 h-full overflow-hidden">
            <CardHeader className="bg-secondary/5 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle>Daily Study Time</CardTitle>
                  <CardDescription>Available choices in hours per day</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type="number" 
                    placeholder="Enter hours (e.g. 4)" 
                    className="pl-9 h-11"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                  />
                  <Clock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
                <Button onClick={handleAddStudyTime} variant="secondary" className="h-11 px-6 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {studyTimes.length === 0 ? (
                  <div className="text-center py-10 bg-muted/30 rounded-xl border-dashed border-2">
                    <p className="text-sm text-muted-foreground">No hours defined yet.</p>
                  </div>
                ) : (
                  studyTimes.map((time) => (
                    <div 
                      key={time.id}
                      className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background hover:border-secondary/30 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-500 opacity-60" />
                        <div>
                          <span className="text-lg font-bold tracking-tight">{time.hours}</span>
                          <span className="ml-2 text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Hours / Day</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteStudyTime(time.id)}
                        className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-none bg-gradient-to-br from-primary/5 via-background to-secondary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Clock className="h-32 w-32" />
        </div>
        <CardContent className="p-8">
          <h4 className="font-bold text-lg mb-2">How these work:</h4>
          <ul className="text-sm text-muted-foreground space-y-2 max-w-2xl">
            <li>• Students will pick one duration (e.g. <strong>30 Days</strong>) from the Preparation Timelines.</li>
            <li>• They will then specify their commitment (e.g. <strong>4 Hours/Day</strong>) from the Daily Study Choices.</li>
            <li>• The AI uses these two dimensions to intelligently distribute topics, tests, and mock interviews across their personalized calendar.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlannerRoadmapsTab;
