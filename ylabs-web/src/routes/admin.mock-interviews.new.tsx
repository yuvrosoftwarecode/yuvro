import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel } from "@/components/admin/AdminShell";
import { useState } from "react";
import {
  Bot,
  Plus,
  Trash2,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Clock,
  ArrowLeft,
  Check,
} from "lucide-react";
import {
  createMockInterview,
  type BackendQuestionNode,
} from "@/services/mockInterviewService";

export const Route = createFileRoute("/admin/mock-interviews/new")({
  component: CreateMockInterviewPage,
});

const ALL_PRODUCTS = [
  { id: "ylabs", label: "YLabs (Virtual Internships & Engineering)" },
  { id: "ycode", label: "YCode (Coding Assessment Platform)" },
  { id: "ycampus", label: "YCampus (College Training & Placements)" },
];

function QuestionNodeEditor({
  nodes,
  onChange,
  level = 1,
}: {
  nodes: BackendQuestionNode[];
  onChange: (nodes: BackendQuestionNode[]) => void;
  level?: number;
}) {
  const addQuestion = () => {
    const newNode: BackendQuestionNode = {
      id: "node_" + Math.random().toString(36).substr(2, 9),
      text: "",
      level,
      follow_ups: [],
    };
    onChange([...nodes, newNode]);
  };

  const updateNodeText = (index: number, text: string) => {
    const updated = [...nodes];
    updated[index] = { ...updated[index], text };
    onChange(updated);
  };

  const removeNode = (index: number) => {
    const updated = nodes.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateFollowUps = (index: number, follow_ups: BackendQuestionNode[]) => {
    const updated = [...nodes];
    updated[index] = { ...updated[index], follow_ups };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {nodes.map((node, idx) => (
        <div
          key={node.id || idx}
          className={`p-3.5 rounded-xl border border-border/70 ${
            level === 1 ? "bg-white shadow-xs" : "bg-neutral-50/70 ml-4 border-dashed"
          }`}
        >
          <div className="flex items-start gap-2 mb-2">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide px-2 py-0.5 rounded bg-neutral-100 shrink-0">
              {level === 1 ? `Q${idx + 1}` : `Follow-up`} (L{node.level || level})
            </span>
            <input
              type="text"
              value={node.text}
              onChange={(e) => updateNodeText(idx, e.target.value)}
              placeholder={
                level === 1
                  ? "Enter primary technical question text..."
                  : "Enter adaptive follow-up or deepening question..."
              }
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => removeNode(idx)}
              className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
              title="Remove Question"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nested follow-ups */}
          {level < 3 && (
            <div className="mt-2.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-neutral-600">
                  Follow-up questions ({node.follow_ups?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const childNode: BackendQuestionNode = {
                      id: "node_" + Math.random().toString(36).substr(2, 9),
                      text: "",
                      level: level + 1,
                      follow_ups: [],
                    };
                    updateFollowUps(idx, [...(node.follow_ups || []), childNode]);
                  }}
                  className="text-[11px] text-[#f7931e] hover:text-[#d07409] font-medium inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Follow-up
                </button>
              </div>

              {node.follow_ups && node.follow_ups.length > 0 && (
                <QuestionNodeEditor
                  nodes={node.follow_ups}
                  onChange={(children) => updateFollowUps(idx, children)}
                  level={level + 1}
                />
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full py-2.5 border border-dashed border-border/80 hover:border-[#f7931e] text-xs font-medium text-neutral-600 hover:text-[#f7931e] rounded-xl flex items-center justify-center gap-1.5 transition-colors bg-neutral-50/50 hover:bg-[#fffbf6]"
      >
        <Plus className="h-3.5 w-3.5" />
        {level === 1 ? "Add Root Interview Question" : "Add Nested Follow-up Question"}
      </button>
    </div>
  );
}

function CreateMockInterviewPage() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "Hands-free interactive AI interview. Answer aloud through your microphone or text. The Vitarka Dynamic Engine adapts questions dynamically based on your candidate responses."
  );
  const [maxDuration, setMaxDuration] = useState(30);
  const [interviewMode, setInterviewMode] = useState<"automatic" | "custom" | "hybrid">("automatic");
  const [publishStatus, setPublishStatus] = useState<"active" | "draft" | "inactive">("active");
  const [products, setProducts] = useState<string[]>(["ylabs", "ycode", "ycampus"]);

  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");

  const [optionalSkills, setOptionalSkills] = useState<string[]>([]);
  const [optInput, setOptInput] = useState("");

  const [questionTree, setQuestionTree] = useState<BackendQuestionNode[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProduct = (productId: string) => {
    setProducts((prev) =>
      prev.includes(productId) ? prev.filter((p) => p !== productId) : [...prev, productId]
    );
  };

  const handleAddReqSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = reqInput.trim().replace(/^,+|,+$/g, "");
      if (val && !requiredSkills.includes(val)) {
        setRequiredSkills([...requiredSkills, val]);
        setReqInput("");
      }
    }
  };

  const removeReqSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const handleAddOptSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = optInput.trim().replace(/^,+|,+$/g, "");
      if (val && !optionalSkills.includes(val)) {
        setOptionalSkills([...optionalSkills, val]);
        setOptInput("");
      }
    }
  };

  const removeOptSkill = (skill: string) => {
    setOptionalSkills(optionalSkills.filter((s) => s !== skill));
  };

  const handleSubmit = async (targetStatus?: "active" | "draft") => {
    const finalStatus = targetStatus || publishStatus;

    if (!title.trim()) {
      setError("Please provide a title for the mock interview.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description explaining what this interview evaluates.");
      return;
    }
    if (requiredSkills.length === 0) {
      setError("Please specify at least one required skill.");
      return;
    }
    if (products.length === 0) {
      setError("Please associate the mock interview with at least one product (e.g. YLabs).");
      return;
    }
    if (maxDuration <= 0) {
      setError("Duration must be greater than 0 minutes.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await createMockInterview({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        max_duration: Number(maxDuration),
        interview_mode: interviewMode,
        publish_status: finalStatus,
        products,
        required_skills: requiredSkills,
        optional_skills: optionalSkills,
        predefined_tree: interviewMode !== "automatic" ? questionTree : [],
      });

      nav({ to: "/admin/mock-interviews" });
    } catch (err: any) {
      console.error("Failed to create mock interview:", err);
      const detail = err?.data ? JSON.stringify(err.data) : err?.message || "Failed to create mock interview.";
      setError(detail);
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Create Mock Interview"
      breadcrumb={["Developer", "Mock Interviews", "New"]}
      right={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/mock-interviews"
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-white hover:bg-neutral-50 text-neutral-700 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit("draft")}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-white hover:bg-neutral-50 text-neutral-800 font-medium transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit("active")}
            className="text-xs px-4 py-1.5 rounded-lg bg-[#f7931e] text-white hover:bg-[#e07d0d] font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
          >
            {saving ? "Creating..." : "Create & Publish"}
          </button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6 pb-12">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Core Details */}
        <Panel title="Basic Information">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Interview Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Golang Microservices & Distributed Systems"
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of competencies and topics evaluated during this session..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Candidate Instructions
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions displayed to candidates prior to initiating interview..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed text-neutral-700"
              />
            </div>
          </div>
        </Panel>

        {/* Section 2: Configuration & Parameters */}
        <Panel title="Interview Configuration">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Max Duration (Minutes)
              </label>
              <div className="relative">
                <Clock className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  min={10}
                  max={120}
                  step={5}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Interview Mode
              </label>
              <select
                value={interviewMode}
                onChange={(e) => setInterviewMode(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="automatic">Automatic (Vitarka AI Adaptive)</option>
                <option value="custom">Custom (Predefined Question Tree)</option>
                <option value="hybrid">Hybrid (Predefined Tree + Adaptive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Publish Status
              </label>
              <select
                value={publishStatus}
                onChange={(e) => setPublishStatus(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="active">Active (Visible to candidates)</option>
                <option value="draft">Draft (Admin preview only)</option>
                <option value="inactive">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50">
            <label className="block text-xs font-semibold text-neutral-800 mb-2">
              Associated Products <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {ALL_PRODUCTS.map((prod) => {
                const checked = products.includes(prod.id);
                return (
                  <label
                    key={prod.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                      checked
                        ? "bg-orange-50/60 border-orange-300 text-neutral-900 font-medium"
                        : "bg-white border-border text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(prod.id)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>{prod.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* Section 3: Evaluated Skills */}
        <Panel title="Skill Tags & Competency Mapping">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Required Skills <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Type skill name and press <kbd className="px-1 py-0.5 rounded bg-neutral-100 border text-[10px]">Enter</kbd> or comma. The AI dynamically adapts question depth based on these skills.
              </p>
              <div className="p-2 rounded-lg border border-border bg-white flex flex-wrap gap-1.5 items-center min-h-[42px]">
                {requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#ffebd1] text-[#171717] font-medium border border-[#ffd59e]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeReqSkill(skill)}
                      className="text-neutral-500 hover:text-neutral-900 text-sm font-bold leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={reqInput}
                  onChange={(e) => setReqInput(e.target.value)}
                  onKeyDown={handleAddReqSkill}
                  placeholder={requiredSkills.length === 0 ? "e.g. Go, Goroutines, gRPC, Docker, Raft" : "Add skill..."}
                  className="flex-1 text-xs min-w-[120px] outline-none bg-transparent py-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Optional / Secondary Skills
              </label>
              <div className="p-2 rounded-lg border border-border bg-white flex flex-wrap gap-1.5 items-center min-h-[42px]">
                {optionalSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 font-medium border border-border/80"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeOptSkill(skill)}
                      className="text-neutral-500 hover:text-neutral-900 text-sm font-bold leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={optInput}
                  onChange={(e) => setOptInput(e.target.value)}
                  onKeyDown={handleAddOptSkill}
                  placeholder={optionalSkills.length === 0 ? "e.g. CI/CD, Kubernetes, Observability" : "Add skill..."}
                  className="flex-1 text-xs min-w-[120px] outline-none bg-transparent py-1"
                />
              </div>
            </div>
          </div>
        </Panel>

        {/* Section 4: Predefined Question Tree (Custom / Hybrid) */}
        {interviewMode !== "automatic" && (
          <Panel title="Predefined Question Tree">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Define the structured sequence of interview questions. The candidate will navigate this tree based on their answers, with optional follow-ups configured for each node.
            </p>
            <QuestionNodeEditor
              nodes={questionTree}
              onChange={(updated) => setQuestionTree(updated)}
              level={1}
            />
          </Panel>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Link
            to="/admin/mock-interviews"
            className="text-xs px-4 py-2 rounded-lg border border-border bg-white hover:bg-neutral-50 text-neutral-700 font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit("active")}
            className="text-xs px-5 py-2 rounded-lg bg-[#f7931e] text-white hover:bg-[#e07d0d] font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
          >
            {saving ? "Creating Mock Interview..." : "Create Mock Interview"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
