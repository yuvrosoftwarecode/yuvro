import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, Edit2, BookOpen, Brain, Terminal, LayoutGrid, ListFilter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Topic, 
  fetchTopics, 
  createTopic, 
  updateTopic, 
  deleteTopic 
} from '@/services/plannerService';

const PlannerTopicsTab = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState<{name: string, category: 'Technical' | 'Behavioral' | 'Core Subjects', difficulty: 'Medium' | 'Easy' | 'Hard'}>({ 
    name: '', 
    category: 'Technical', 
    difficulty: 'Medium' 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchTopics();
      setTopics(data);
    } catch (error) {
      toast.error("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = topics.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Topic name is required");
      return;
    }

    try {
      if (editingTopic) {
        const updated = await updateTopic(editingTopic.id, form);
        setTopics(prev => prev.map(t => t.id === editingTopic.id ? { ...t, ...updated } : t));
        toast.success("Topic updated");
      } else {
        const newTopic = await createTopic(form);
        setTopics(prev => [...prev, newTopic]);
        toast.success("Topic created");
      }
      setIsModalOpen(false);
      setEditingTopic(null);
      setForm({ name: '', category: 'Technical', difficulty: 'Medium' });
    } catch (error) {
      toast.error("Failed to save topic");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTopic(id);
      setTopics(prev => prev.filter(t => t.id !== id));
      toast.success("Topic removed");
    } catch (error) {
      toast.error("Failed to delete topic");
    }
  };

  const categories = ["Technical", "Behavioral", "Core Subjects"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Topics & Questions</h2>
          <p className="text-muted-foreground mt-1">Manage the conceptual building blocks for preparation roadmaps.</p>
        </div>
        <Button onClick={() => { setEditingTopic(null); setForm({ name: '', category: 'Technical', difficulty: 'Medium' }); setIsModalOpen(true); }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Create Topic
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-background p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search topics by name..." 
            className="pl-9 h-10 bg-muted/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px] h-10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading topics...</div>
      ) : filteredTopics.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-16 text-center">
          <Brain className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="font-semibold text-lg">No Topics Found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">Try adjusting your filters or create a new topic to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTopics.map(topic => (
            <Card key={topic.id} className="group hover:border-primary/40 hover:shadow-md transition-all border-border/60">
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    topic.category === 'Technical' ? 'bg-blue-100 text-blue-700' :
                    topic.category === 'Behavioral' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {topic.category === 'Technical' ? <Terminal className="h-5 w-5" /> :
                      topic.category === 'Behavioral' ? <Brain className="h-5 w-5" /> :
                      <BookOpen className="h-5 w-5" />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTopic(topic); setForm({ name: topic.name, category: topic.category, difficulty: topic.difficulty }); setIsModalOpen(true); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(topic.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-3 font-bold group-hover:text-primary transition-colors">{topic.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] font-medium tracking-tight h-5">{topic.category}</Badge>
                  <Badge variant="secondary" className={`text-[10px] font-bold h-5 ${
                    topic.difficulty === 'Hard' ? 'bg-red-50 text-red-700 border-red-100' :
                    topic.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-green-50 text-green-700 border-green-100'
                  }`}>
                    {topic.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> {topic.question_count} Questions</span>
                  <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary">Manage Bank</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingTopic ? 'Update Topic' : 'Add New Topic'}</DialogTitle>
            <DialogDescription>Define a core topic used in preparation roadmaps.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic-name" className="text-sm font-semibold">Topic Name</Label>
              <Input id="topic-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Linked Lists, Graphs, Resume Building" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
              <Select value={form.category} onValueChange={(val: any) => setForm({ ...form, category: val })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty" className="text-sm font-semibold">Base Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(val: any) => setForm({ ...form, difficulty: val })}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Discard</Button>
            <Button onClick={handleSave} className="font-semibold">{editingTopic ? 'Save Changes' : 'Create Topic'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerTopicsTab;
