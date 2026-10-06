import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Database, Link, Plus, Search, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/questions")({ component: QuestionsPage });

const CATS = [
  "Java", "Python", "React", "SQL", "DevOps", "Security", "System Design", "Testing", "Debugging", "Code Reviews"
];
const TYPES = [
  "Coding Task", "Bug Scenario", "Debugging Case", "Security Vuln", "Optimization", "Database Issue", "API Problem", "Deployment Failure"
];

const LAB_TYPES = ["DATABASE", "BACKEND", "FRONTEND", "FULL_STACK", "QUALITY_ASSURANCE", "DEVOPS"];
const SCENARIOS = [
  "DEBUGGING",
  "BUG_FIXING",
  "FEATURE_DEVELOPMENT",
  "API_OPTIMIZATION",
  "PERFORMANCE_OPTIMIZATION",
  "SECURITY",
  "ARCHITECTURE",
  "PERFORMANCE",
  "TESTING",
  "PRODUCTION_INCIDENT",
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  difficulty: "EASY",
  type: "BACKEND",
  experience: "FRESHER",
  scenario: "FEATURE_DEVELOPMENT",
  marks: 10,
  duration_minutes: 30,
  git_repo_starter_url: "",
  git_repo_starter_branch: "main",
  startup_command: "",
  test_command: "",
  allow_task_selection: true,
  programming_languages: [],
  databases: [],
  backend_frameworks: [],
  frontend_frameworks: [],
  tasks: [],
};

const arrayToString = (arr: any) => (Array.isArray(arr) ? arr.join(", ") : "");
const stringToArray = (str: string) => str.split(",").map((s) => s.trim()).filter((s) => s);

function QuestionsPage() {
  const queryClient = useQueryClient();
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["labQuestions"],
    queryFn: () => questionBankService.getLabQuestions(),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(DEFAULT_FORM);

  const createMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createLabQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => questionBankService.updateLabQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionBankService.deleteLabQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
    },
  });

  const openNewModal = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (q: any) => {
    setEditingId(q.id);
    setFormData({
      title: q.title || "",
      description: q.description || "",
      difficulty: q.difficulty || "EASY",
      type: q.type || "BACKEND",
      experience: q.experience || "FRESHER",
      scenario: q.scenario || "FEATURE_DEVELOPMENT",
      marks: q.marks || 10,
      duration_minutes: q.duration_minutes || 30,
      git_repo_starter_url: q.git_repo_starter_url || "",
      git_repo_starter_branch: q.git_repo_starter_branch || "main",
      startup_command: q.startup_command || "",
      test_command: q.test_command || "",
      allow_task_selection: q.allow_task_selection !== false,
      programming_languages: q.programming_languages || [],
      databases: q.databases || [],
      backend_frameworks: (q.backend_frameworks || []).map((f: string) => f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f),
      frontend_frameworks: q.frontend_frameworks || [],
      tasks: (q.tasks || []).map((t: any, i: number) => ({
        ...t,
        id: t.id || `task_${i}`,
        parent_task_id: t.parent_task_id || t.scoring_rules?.parent_task_id || (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) || null,
      })),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const getSolutionString = (solution: any) => {
    if (!solution) return "";
    if (typeof solution === "string") return solution;
    if (typeof solution === "object") {
      if (solution["query.sql"]) return solution["query.sql"];
      if (solution["query.js"]) return solution["query.js"];
      if (solution["code"]) return solution["code"];
      if (solution["solution"]) return solution["solution"];
      if (Object.keys(solution).length > 0) return JSON.stringify(solution, null, 2);
    }
    return "";
  };

  const handleSave = () => {
    const preparedTasks = (formData.tasks || []).map((t: any, index: number) => {
      let solutionObj = t.solution;
      if (typeof t.solution === "string") {
        const trimmed = t.solution.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            solutionObj = JSON.parse(trimmed);
          } catch (e) {
            solutionObj = { code: trimmed };
          }
        } else if (trimmed) {
          const dbs = formData.databases || [];
          if (dbs.includes("MONGODB")) {
            solutionObj = { "query.js": trimmed };
          } else if (dbs.includes("MYSQL") || dbs.includes("POSTGRESQL") || dbs.includes("SQLITE")) {
            solutionObj = { "query.sql": trimmed };
          } else {
            solutionObj = { code: trimmed };
          }
        } else {
          solutionObj = {};
        }
      }
      const pId = t.parent_task_id || (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) || null;
      return {
        ...t,
        order_index: index,
        solution: solutionObj,
        parent_task_id: pId,
        parent_task: pId,
        scoring_rules: {
          ...(typeof t.scoring_rules === "object" ? t.scoring_rules : {}),
          parent_task_id: pId,
        },
      };
    });

    const sanitizedBackendFrameworks = (formData.backend_frameworks || []).map((f: string) =>
      f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f
    );

    const payload = {
      ...formData,
      backend_frameworks: sanitizedBackendFrameworks,
      tasks: preparedTasks,
      domain: "OTHER",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setFormData({ ...formData, tasks: newTasks });
  };

  const removeTask = (index: number) => {
    const newTasks = formData.tasks.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, tasks: newTasks });
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [
        ...formData.tasks,
        {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: "",
          description: "",
          solution: "",
          difficulty: "EASY",
          marks: 10,
          duration_minutes: 15,
          order_index: formData.tasks.length,
          parent_task_id: null,
        },
      ],
    });
  };

  return (
    <AdminShell
      title="Question Bank"
      breadcrumb={["Engineering", "Question Bank"]}
      right={
        <button 
          onClick={openNewModal}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 hover:bg-primary/90 transition"
        >
          <Plus className="h-3.5 w-3.5" /> New item
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total items" value={isLoading ? "..." : questions.length.toString()} color="primary" icon={Database} />
        <KpiCard label="Avg success rate" value="N/A" color="warning" />
        <KpiCard label="Attached to sprints" value="N/A" color="ui" />
        <KpiCard label="Items added (7d)" value="N/A" delta="0" color="success" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search question bank…"
              className="bg-transparent outline-none flex-1"
            />
          </div>
          <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5">
            <option>All categories</option>
            {CATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5">
            <option>All types</option>
            {TYPES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5">
            <option>All difficulty</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading questions...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {questions.map((q: any) => (
            <div
              key={q.id}
              className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-muted-foreground">{q.id.substring(0, 8)}...</span>
                <Badge tone={q.difficulty === "HARD" ? "destructive" : (q.difficulty === "MEDIUM" ? "warning" : "success")}>{q.difficulty}</Badge>
              </div>
              <h3 className="font-semibold mb-2">{q.title}</h3>
              <div className="flex flex-wrap gap-1 mb-3">
                <Badge tone="primary">{q.domain}</Badge>
                <Badge tone="ui">{q.scenario}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Marks <span className="font-mono text-foreground">{q.marks}</span>
                </span>
                <span className="text-muted-foreground">
                  Duration <span className="font-mono text-foreground">{q.duration_minutes}m</span>
                </span>
                <button 
                  onClick={() => openEditModal(q)}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Edit →
                </button>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="col-span-2 p-8 text-center text-muted-foreground">No questions found.</div>
          )}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Question" : "New Question"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select 
                    id="difficulty" 
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Lab Role / Type</Label>
                  <select 
                    id="type"
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {LAB_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="experience">Experience</Label>
                  <select 
                    id="experience" 
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="FRESHER">Fresher</option>
                    <option value="MID_LEVEL">Mid Level</option>
                    <option value="SENIOR">Senior</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scenario">Scenario</Label>
                  <select 
                    id="scenario"
                    value={formData.scenario} 
                    onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {SCENARIOS.map(s => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marks">Marks</Label>
                  <Input id="marks" type="number" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input id="duration" type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="repo_url">Git Repo Starter URL</Label>
                  <Input id="repo_url" value={formData.git_repo_starter_url} onChange={(e) => setFormData({ ...formData, git_repo_starter_url: e.target.value })} placeholder="https://github.com/..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="starter_branch">Starter Branch</Label>
                  <Input id="starter_branch" value={formData.git_repo_starter_branch} onChange={(e) => setFormData({ ...formData, git_repo_starter_branch: e.target.value })} placeholder="main" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startup_cmd">Startup Command</Label>
                <Input id="startup_cmd" value={formData.startup_command} onChange={(e) => setFormData({ ...formData, startup_command: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="test_cmd">Test Command</Label>
                <Input id="test_cmd" placeholder="e.g. npm run test" value={formData.test_command || ""} onChange={(e) => setFormData({ ...formData, test_command: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prog_langs">Programming Languages</Label>
                  <select 
                    id="prog_langs" 
                    multiple
                    value={formData.programming_languages}
                    onChange={(e) => setFormData({ ...formData, programming_languages: Array.from(e.target.selectedOptions, option => option.value) })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="C">C</option>
                    <option value="C++">C++</option>
                    <option value="PYTHON">Python</option>
                    <option value="JAVA">Java</option>
                    <option value="SQL">SQL</option>
                    <option value="BASH">Bash</option>
                    <option value="JAVASCRIPT">JavaScript</option>
                    <option value="TYPESCRIPT">TypeScript</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dbs">Databases</Label>
                  <select 
                    id="dbs" 
                    multiple
                    value={formData.databases}
                    onChange={(e) => setFormData({ ...formData, databases: Array.from(e.target.selectedOptions, option => option.value) })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="SQLITE">SQLite</option>
                    <option value="POSTGRESQL">PostgreSQL</option>
                    <option value="MYSQL">MySQL</option>
                    <option value="MONGODB">MongoDB</option>
                    <option value="REDIS">Redis</option>
                    <option value="ELASTICSEARCH">Elasticsearch</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="backend_fws">Backend Frameworks</Label>
                  <select 
                    id="backend_fws" 
                    multiple
                    value={formData.backend_frameworks}
                    onChange={(e) => setFormData({ ...formData, backend_frameworks: Array.from(e.target.selectedOptions, option => option.value) })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="DJANGO">Django</option>
                    <option value="DJANGO_REST_FRAMEWORK">Django REST Framework</option>
                    <option value="FASTAPI">FastAPI</option>
                    <option value="FLASK">Flask</option>
                    <option value="SPRING_BOOT">Spring Boot</option>
                    <option value="NODEJS">NodeJS</option>
                    <option value="EXPRESS">Express</option>
                    <option value="NESTJS">NestJS</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="frontend_fws">Frontend Frameworks</Label>
                  <select 
                    id="frontend_fws" 
                    multiple
                    value={formData.frontend_frameworks}
                    onChange={(e) => setFormData({ ...formData, frontend_frameworks: Array.from(e.target.selectedOptions, option => option.value) })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="REACT">React</option>
                    <option value="NEXTJS">NextJS</option>
                    <option value="VUE">Vue</option>
                    <option value="ANGULAR">Angular</option>
                    <option value="SVELTE">Svelte</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold">Tasks</h4>
                  <Button variant="outline" size="sm" onClick={addTask} type="button">Add Task</Button>
                </div>
                <div className="space-y-4">
                  {formData.tasks.map((task: any, index: number) => (
                    <div key={index} className="p-4 border rounded-md relative bg-background/50">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8 text-destructive"
                        onClick={() => removeTask(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="grid gap-4 pr-8">
                        <div className="grid gap-2">
                          <Label>Task Title</Label>
                          <Input value={task.title} onChange={(e) => updateTask(index, "title", e.target.value)} placeholder="e.g. Calculate Total Revenue by Category" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea rows={2} value={task.description} onChange={(e) => updateTask(index, "description", e.target.value)} placeholder="Task requirements, input schemas, and expected outputs..." />
                        </div>
                        <div className="grid gap-2">
                          <Label>Solution / Reference Query</Label>
                          <Textarea 
                            rows={3} 
                            className="font-mono text-xs"
                            placeholder="e.g. SELECT * FROM users; or db.orders.aggregate([...]); or JSON solution object"
                            value={getSolutionString(task.solution)} 
                            onChange={(e) => updateTask(index, "solution", e.target.value)} 
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="grid gap-2">
                            <Label>Difficulty</Label>
                            <select 
                              value={task.difficulty}
                              onChange={(e) => updateTask(index, "difficulty", e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                              <option value="EASY">Easy</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HARD">Hard</option>
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Marks</Label>
                            <Input type="number" value={task.marks} onChange={(e) => updateTask(index, "marks", parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Duration (min)</Label>
                            <Input type="number" value={task.duration_minutes} onChange={(e) => updateTask(index, "duration_minutes", parseInt(e.target.value) || 0)} />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label className="flex items-center gap-1.5">
                            <Link className="h-3.5 w-3.5 text-muted-foreground" />
                            Linked Task / Dependency
                          </Label>
                          <select
                            value={task.parent_task_id || task.parent_task || ""}
                            onChange={(e) => updateTask(index, "parent_task_id", e.target.value || null)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="">None (Independent Task)</option>
                            {formData.tasks.map((otherTask: any, otherIdx: number) => {
                              if (otherIdx === index) return null;
                              const otherId = otherTask.id || `task_idx_${otherIdx}`;
                              return (
                                <option key={otherId} value={otherId}>
                                  Task {otherIdx + 1}: {otherTask.title || `Task ${otherIdx + 1}`}
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-[11px] text-muted-foreground">
                            Selecting this task when creating an evaluation will automatically select the linked task.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
