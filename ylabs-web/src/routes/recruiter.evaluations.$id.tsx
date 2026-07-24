import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ChevronLeft, Plus, X, Search, Trash2, Copy, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ChevronRight,
  Beaker, BookOpen, MessageSquare, Sparkles, Clock, Award, Star, Check, Link as LinkIcon,
  Upload, Mail, Rocket, Eye, Pencil, GripVertical, Shuffle,
} from "lucide-react";
import {
  getEvaluation, saveEvaluation, evaluationTotals,
  DOMAINS, PROGRAMMING_LANGUAGES, DATABASES, SCENARIOS, DIFFICULTIES, EXPERIENCE_LEVELS, FORMATS,
  newUid, Evaluation, Section, LabsSection, AssessmentSection, DiscussionSection, LabItem, QuestionItem, CourseItem, TopicItem, PredefinedQuestion,
  fetchLabs, fetchQuestions, fetchCourses, fetchTopics, createEvaluation, saveDraftLocally, getDraftLocally, clearDraftLocally, syncMockInterviews,
} from "@/lib/recruiter";
import { Workspace } from "@/components/evaluation/WorkspaceApp";
import { createPortal } from "react-dom";
import ProctoringSettingsCard from "@/components/evaluation/ProctoringSettingsCard";

const search = z.object({ view: z.enum(["edit", "preview", "publish", "publish-done"]).default("edit").catch("edit") });

export const Route = createFileRoute("/recruiter/evaluations/$id")({
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Evaluation Workspace — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: EvaluationWorkspace,
});

function EvaluationWorkspace() {
  const { id } = Route.useParams();
  const { view } = Route.useSearch();
  const nav = useNavigate();
  const loc = useLocation();
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [labDrawerFor, setLabDrawerFor] = useState<string | null>(null);
  const [qDrawerFor, setQDrawerFor] = useState<{ sectionId: string } | null>(null);

  // Child route matched (e.g. /workspace, /candidates/...) — defer to it.
  const isChild = loc.pathname.replace(/\/$/, "") !== `/recruiter/evaluations/${id}`;

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isChild) return;
    const local = getDraftLocally(id);
    if (local) {
      setEv(local);
    } else if (id === "draft") {
      createEvaluation().then(setEv);
    } else {
      getEvaluation(id).then(e => {
        if (!e) nav({ to: "/recruiter/evaluations" }); else setEv(e);
      });
    }
  }, [id, nav, isChild]);

  if (isChild) return <Outlet />;
  if (!ev) return null;

  const update = (fn: (e: Evaluation) => void) => {
    const c = { ...ev, sections: JSON.parse(JSON.stringify(ev.sections)) };
    fn(c); saveDraftLocally(c); setEv(c);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    const syncedEv = await syncMockInterviews(ev);
    
    const saved = await saveEvaluation(syncedEv);
    if (saved) {
      clearDraftLocally(ev.id);
      if (ev.id === "draft") {
        nav({ to: "/recruiter/evaluations/$id", params: { id: saved.id }, replace: true });
      } else {
        setEv(saved);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    }
    setIsSaving(false);
  };

  const totals = evaluationTotals(ev);

  const setView = (v: "edit" | "preview" | "publish" | "publish-done") => nav({ to: "/recruiter/evaluations/$id", params: { id }, search: { view: v } });

  if (view === "publish-done") return <PublishedScreen ev={ev} onBack={() => setView("edit")} />;
  if (view === "publish") return <PublishScreen ev={ev} onBack={() => setView("edit")} onPublish={async (invite) => { 
    setIsSaving(true);
    
    const syncedEv = await syncMockInterviews(ev);
    
    const c = { ...syncedEv, status: "published" as const, publishedAt: Date.now(), invite, candidatesInvited: invite.emails.length || (invite.type === "link" ? 0 : 0), sections: JSON.parse(JSON.stringify(syncedEv.sections)) };
    const saved = await saveEvaluation(c);
    if (saved) {
      clearDraftLocally(c.id);
      if (ev.id === "draft") {
        setEv(saved);
        nav({ to: "/recruiter/evaluations/$id", params: { id: saved.id }, search: { view: "publish-done" }, replace: true });
      } else {
        setEv(saved);
        setView("publish-done");
      }
    }
    setIsSaving(false);
  }} />;
  if (view === "preview") return <PreviewScreen ev={ev} onBack={() => setView("edit")} />;

  return (
    <div className="grid grid-cols-[1fr_320px] gap-0">
      {/* Main workspace */}
      <div className="min-h-screen p-8 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <Link to="/recruiter/evaluations" className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white"><ChevronLeft className="h-3.5 w-3.5" /> All evaluations</Link>
            <div className="flex items-center gap-2">
              <button onClick={() => setView("preview")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-neutral-300 hover:bg-white/5"><Eye className="h-3.5 w-3.5" /> Preview</button>
              <button onClick={handleSave} disabled={isSaving || saveSuccess} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all">
                {isSaving ? "Saving..." : saveSuccess ? <><Check className="h-3.5 w-3.5" /> Saved!</> : "Save Draft"}
              </button>
              <button onClick={() => setView("publish")} disabled={ev.sections.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1.5 text-[12px] font-medium text-black disabled:opacity-40"><Rocket className="h-3.5 w-3.5" /> Publish</button>
            </div>
          </div>

          <div className="mt-8">
            <input value={ev.title} onChange={e => update(x => { x.title = e.target.value; })} placeholder="Untitled Evaluation" className="w-full border-0 bg-transparent text-[42px] font-semibold tracking-tight text-white placeholder-neutral-600 outline-none" />
            <div className="mt-2 flex items-center gap-3">
              <select value={ev.domain} onChange={e => update(x => { x.domain = e.target.value as any; })} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[12px] text-neutral-300 outline-none">
                <option value="">Set domain…</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="text-[12px] text-neutral-500">·</span>
              <span className="text-[12px] text-neutral-500">{ev.sections.length} sections · {totals.minutes} min · {totals.marks} marks</span>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {ev.sections.map((s, idx) => (
              <SectionBlock
                key={s.id}
                section={s}
                index={idx}
                total={ev.sections.length}
                onChange={(next) => update(x => { x.sections[idx] = next; })}
                onDelete={() => update(x => { x.sections.splice(idx, 1); })}
                onDuplicate={() => update(x => { x.sections.splice(idx + 1, 0, { ...JSON.parse(JSON.stringify(s)), id: newUid() }); })}
                onMove={(dir) => update(x => {
                  const to = idx + (dir === "up" ? -1 : 1);
                  if (to < 0 || to >= x.sections.length) return;
                  const [it] = x.sections.splice(idx, 1); x.sections.splice(to, 0, it);
                })}
                onAddLab={() => setLabDrawerFor(s.id)}
                onAddQuestions={() => setQDrawerFor({ sectionId: s.id })}
              />
            ))}

            <button onClick={() => setAddSectionOpen(true)} className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-6 text-[13px] text-neutral-500 transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.03] hover:text-white">
              <Plus className="h-4 w-4 transition group-hover:rotate-90" /> Add Section
            </button>
          </div>
        </div>
      </div>

      {/* Right summary */}
      <SummarySidebar ev={ev} onPublish={() => setView("publish")} onPreview={() => setView("preview")} />

      {/* Modals & drawers */}
      {addSectionOpen && (
        <AddSectionModal
          onClose={() => setAddSectionOpen(false)}
          onPick={(kind) => {
            update(x => {
              if (kind === "labs") x.sections.push({ id: newUid(), kind: "labs", title: "Engineering Labs", labs: [] });
              else if (kind === "assessment") x.sections.push({ id: newUid(), kind: "assessment", title: "Knowledge Assessment", questions: [] });
              else x.sections.push({ id: newUid(), kind: "discussion", title: "Engineering Discussion", duration: 15, mode: "Custom", questions: [] });
            });
            setAddSectionOpen(false);
          }}
        />
      )}
      {labDrawerFor && (
        <LabDrawer
          existing={((ev.sections.find(s => s.id === labDrawerFor) as LabsSection | undefined)?.labs ?? []).map(l => l.id)}
          onClose={() => setLabDrawerFor(null)}
          onAdd={(lab) => {
            update(x => {
              const sec = x.sections.find(s => s.id === labDrawerFor) as LabsSection | undefined;
              if (sec && !sec.labs.find(l => l.id === lab.id)) sec.labs.push(lab);
            });
          }}
        />
      )}

      {qDrawerFor && (
        <QuestionDrawer
          existing={((ev.sections.find(s => s.id === qDrawerFor.sectionId) as AssessmentSection | undefined)?.questions ?? []).map(q => q.id)}
          onClose={() => setQDrawerFor(null)}
          onAdd={(q) => {
            update(x => {
              const sec = x.sections.find(s => s.id === qDrawerFor.sectionId) as AssessmentSection | undefined;
              if (sec && !sec.questions.find(qq => qq.id === q.id)) sec.questions.push(q);
            });
          }}
        />
      )}
    </div>
  );
}

// ---------------- Section block ----------------

function SectionBlock({ section, index, total, onChange, onDelete, onDuplicate, onMove, onAddLab, onAddQuestions }: {
  section: Section; index: number; total: number;
  onChange: (s: Section) => void;
  onDelete: () => void; onDuplicate: () => void;
  onMove: (dir: "up" | "down") => void;
  onAddLab: () => void;
  onAddQuestions: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const icon = section.kind === "labs" ? Beaker : section.kind === "assessment" ? BookOpen : MessageSquare;
  const tone = section.kind === "labs" ? "from-emerald-400 to-cyan-400" : section.kind === "assessment" ? "from-violet-400 to-fuchsia-400" : "from-amber-400 to-orange-400";

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <GripVertical className="h-4 w-4 cursor-grab text-neutral-600" />
        <div className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br ${tone} text-black`}>{(() => { const I = icon; return <I className="h-3.5 w-3.5" />; })()}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Section {index + 1}</div>
          {renaming ? (
            <input autoFocus onBlur={() => setRenaming(false)} value={section.title} onChange={e => onChange({ ...section, title: e.target.value } as Section)} className="w-full bg-transparent text-[15px] text-white outline-none" />
          ) : (
            <button onClick={() => setRenaming(true)} className="truncate text-left text-[15px] font-medium text-white">{section.title}</button>
          )}
        </div>
        <ToolBtn title="Move up" onClick={() => onMove("up")} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Move down" onClick={() => onMove("down")} disabled={index === total - 1}><ArrowDown className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Duplicate" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</ToolBtn>
        <ToolBtn title="Delete" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></ToolBtn>
      </div>
      {!collapsed && (
        <div className="p-4">
          {section.kind === "labs" && <LabsSectionBody section={section} onChange={onChange} onAddLab={onAddLab} />}
          {section.kind === "assessment" && <AssessmentSectionBody section={section} onChange={onChange} onAddQuestions={onAddQuestions} />}
          {section.kind === "discussion" && <DiscussionSectionBody section={section} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title?: string; disabled?: boolean }) {
  return <button onClick={onClick} title={title} disabled={disabled} className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-white disabled:opacity-30">{children}</button>;
}

function LabsSectionBody({ section, onChange, onAddLab }: { section: LabsSection; onChange: (s: Section) => void; onAddLab: () => void }) {
  const minutes = section.labs.reduce((a, l) => a + (l.duration_minutes || 0), 0);
  const marks = section.labs.reduce((a, l) => a + l.marks, 0);
  const remove = (id: string) => onChange({ ...section, labs: section.labs.filter(l => l.id !== id) });
  const dup = (id: string) => {
    const l = section.labs.find(x => x.id === id); if (!l) return;
    onChange({ ...section, labs: [...section.labs, { ...l, id: newUid() }] });
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Labs" value={section.labs.length} />
        <Stat label="Time" value={`${minutes} min`} />
        <Stat label="Marks" value={marks} />
      </div>
      {section.labs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {section.labs.map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5">
              <span className="font-mono text-[10px] text-neutral-500">L{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-white">{l.title}</div>
                <div className="text-[11px] text-neutral-500">{l.domain} · {l.programming_languages?.[0] || 'Any'} · {l.scenario} · {l.difficulty} · {l.duration_minutes} min · {l.marks} marks</div>
              </div>
              <ToolBtn title="Duplicate" onClick={() => dup(l.id)}><Copy className="h-3.5 w-3.5" /></ToolBtn>
              <ToolBtn title="Remove" onClick={() => remove(l.id)}><Trash2 className="h-3.5 w-3.5" /></ToolBtn>
            </li>
          ))}
        </ul>
      )}
      <button onClick={onAddLab} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[12px] text-neutral-400 hover:border-emerald-400/40 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add Lab</button>
      
      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard 
          proctoring={section.proctoring || {}} 
          onChange={(p) => onChange({ ...section, proctoring: p })} 
        />
      </div>
    </div>
  );
}

function LabPreview({ l }: { l: any }) {
  return (
    <div className="rounded-md bg-white/5 p-4 text-[13px] text-neutral-300 space-y-4">
      {l.description ? (
        <div className="whitespace-pre-wrap">{l.description}</div>
      ) : l.text ? (
        <div className="whitespace-pre-wrap">{l.text}</div>
      ) : (
        <div className="italic text-neutral-500">No detailed description available.</div>
      )}
      
      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-neutral-500">Domain</div>
          <div className="text-white">{l.domain || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500">Scenario</div>
          <div className="text-white">{l.scenario || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500">Difficulty</div>
          <div className="text-white">{l.difficulty || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500">Duration</div>
          <div className="text-white">{l.duration_minutes || 0} min</div>
        </div>
        <div>
          <div className="text-neutral-500">Marks</div>
          <div className="text-white">{l.marks || 0}</div>
        </div>
      </div>
      
      {l.programming_languages && l.programming_languages.length > 0 && (
        <div>
          <div className="text-neutral-500 mb-1 text-[12px]">Programming Languages</div>
          <div className="flex flex-wrap gap-1">
            {l.programming_languages.map((x: string) => <Chip key={x}>{x}</Chip>)}
          </div>
        </div>
      )}
      
      {l.databases && l.databases.length > 0 && (
        <div>
          <div className="text-neutral-500 mb-1 text-[12px]">Databases</div>
          <div className="flex flex-wrap gap-1">
            {l.databases.map((x: string) => <Chip key={x}>{x}</Chip>)}
          </div>
        </div>
      )}
      
      {l.tasks && l.tasks.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <div className="text-neutral-400 font-semibold mb-3">Tasks in this Lab</div>
          <div className="space-y-2">
            {l.tasks.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded bg-black/20 p-3 text-[12px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{i + 1}. {t.title}</span>
                  {t.difficulty && <span className="text-[10px] text-neutral-400">{t.difficulty}</span>}
                </div>
                {t.description && <div className="text-neutral-400 line-clamp-2 mt-1 whitespace-pre-wrap">{t.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionPreview({ q }: { q: any }) {
  return (
    <div className="rounded-md bg-white/5 p-4 text-[13px] text-neutral-300 space-y-4">
      {q.text && <div className="whitespace-pre-wrap">{q.text}</div>}
      
      {q.mcq_options && q.mcq_options.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-neutral-400">Options:</div>
          {q.mcq_options.map((opt: any, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded bg-black/20 px-3 py-2">
              <div className="mt-0.5">{opt.is_correct ? <Check className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border border-white/10" />}</div>
              <div className="flex-1">{opt.text}</div>
            </div>
          ))}
        </div>
      )}

      {q.test_cases_basic && q.test_cases_basic.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-neutral-400">Examples:</div>
          {q.test_cases_basic.map((ex: any, i: number) => (
            <div key={i} className="rounded bg-black/20 p-3 font-mono text-[11px]">
              <div><span className="text-neutral-500">Input:</span> {ex.input}</div>
              <div className="mt-2"><span className="text-neutral-500">Output:</span> {ex.output}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentQuestionItem({ q, onRemove }: { q: any, onRemove: () => void }) {
  return (
    <li className="flex flex-col rounded-md border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="line-clamp-1 flex-1 text-[12px] text-neutral-300">{q.text || q.title || "Untitled Question"}</span>
        <span className="text-[10px] text-neutral-500">{q.difficulty} &middot; {q.marks}m &middot; {q.duration_minutes || (q.seconds ? Math.ceil(q.seconds/60) : 0)} min</span>
        <ToolBtn title="Remove" onClick={onRemove}><X className="h-3 w-3" /></ToolBtn>
      </div>
    </li>
  );
}

function AssessmentSectionBody({ section, onChange, onAddQuestions }: { section: AssessmentSection; onChange: (s: Section) => void; onAddQuestions: () => void }) {
  const totalQ = section.questions.length;
  const totalM = section.questions.reduce((a, q) => a + q.marks, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Questions" value={totalQ} />
        <Stat label="Marks" value={totalM} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ToolBtn title="Randomize" onClick={() => onChange({ ...section, randomize: !section.randomize })}><Star className={`h-3.5 w-3.5 ${section.randomize ? "text-emerald-400" : ""}`} /></ToolBtn>
        <ToolBtn title="Shuffle" onClick={() => onChange({ ...section, shuffle: !section.shuffle })}><Shuffle className={`h-3.5 w-3.5 ${section.shuffle ? "text-emerald-400" : ""}`} /></ToolBtn>
      </div>
      {section.questions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.questions.map(q => (
            <AssessmentQuestionItem 
              key={q.id} 
              q={q} 
              onRemove={() => onChange({ ...section, questions: section.questions.filter(qq => qq.id !== q.id) })} 
            />
          ))}
        </ul>
      )}
      <button onClick={onAddQuestions} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[12px] text-neutral-400 hover:border-violet-400/40 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add Questions</button>
      
      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard 
          proctoring={section.proctoring || {}} 
          onChange={(p) => onChange({ ...section, proctoring: p })} 
        />
      </div>
    </div>
  );
}

function DiscussionSectionBody({ section, onChange }: { section: DiscussionSection; onChange: (s: Section) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">Duration</div>
          <div className="mt-1 flex items-center gap-2">
            {[10, 15, 20, 30].map(d => (
              <button key={d} onClick={() => onChange({ ...section, duration: d })} className={`rounded-md border px-2.5 py-1 text-[12px] ${section.duration === d ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 text-neutral-400 hover:text-white"}`}>{d} min</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">Question Mode</div>
          <div className="mt-1 flex items-center gap-2">
            <button className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[12px] text-amber-300">Custom</button>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg border border-white/5 bg-black/20 p-3">
        <div className="text-[12px] text-neutral-300">Discussion Questions Tree</div>
        <div className="mt-4">
          <QuestionTreeBuilder questions={section.questions} onChange={(qs) => onChange({ ...section, questions: qs })} />
        </div>
      </div>
      
      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard 
          proctoring={section.proctoring || {}} 
          onChange={(p) => onChange({ ...section, proctoring: p })} 
        />
      </div>
    </div>
  );
}

function QuestionTreeBuilder({ questions, onChange, level = 0 }: { questions: PredefinedQuestion[], onChange: (qs: PredefinedQuestion[]) => void, level?: number }) {
  const [newText, setNewText] = useState("");
  
  const addNode = () => {
    if (newText.trim()) {
      onChange([...questions, { text: newText.trim(), follow_ups: [] }]);
      setNewText("");
    }
  };

  const updateNode = (index: number, updated: PredefinedQuestion) => {
    const copy = [...questions];
    copy[index] = updated;
    onChange(copy);
  };

  const removeNode = (index: number) => {
    const copy = [...questions];
    copy.splice(index, 1);
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {(questions || []).map((q, i) => (
        <div key={i} className={`rounded-md border border-white/5 bg-white/[0.02] p-3 text-[12px] text-neutral-300`}>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-[10px] text-neutral-500">{level === 0 ? "Q" : "↳"}{i + 1}</span>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <input value={q.text} onChange={e => updateNode(i, { ...q, text: e.target.value })} className="flex-1 bg-transparent outline-none border-b border-white/10 focus:border-amber-400/50" />
                <ToolBtn title="Remove" onClick={() => removeNode(i)}><X className="h-3 w-3" /></ToolBtn>
              </div>
              <div className="pl-4 border-l border-white/5">
                <QuestionTreeBuilder questions={q.follow_ups} onChange={(f) => updateNode(i, { ...q, follow_ups: f })} level={level + 1} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <input value={newText} onChange={e => setNewText(e.target.value)} placeholder={level === 0 ? "Add a main question..." : "Add a follow-up question..."} className="flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[12px] outline-none focus:border-amber-400/50" />
        <button onClick={addNode} className="rounded-md bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/15">Add</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-medium text-white">{value}</div>
    </div>
  );
}

// ---------------- Summary sidebar ----------------

function SummarySidebar({ ev, onPublish, onPreview }: { ev: Evaluation; onPublish: () => void; onPreview: () => void }) {
  const t = evaluationTotals(ev);
  const labs = ev.sections.filter(s => s.kind === "labs").reduce((a, s: any) => a + s.labs.length, 0);
  const questions = ev.sections.filter(s => s.kind === "assessment").reduce((a, s: any) => a + (s.questions?.length || 0), 0);
  const discussion = ev.sections.filter(s => s.kind === "discussion").reduce((a, s: any) => a + s.duration, 0);
  const score = Math.min(5, Math.round((labs > 0 ? 2 : 0) + (questions >= 10 ? 2 : questions > 0 ? 1 : 0) + (discussion > 0 ? 1 : 0)));

  return (
    <aside className="sticky top-0 h-screen border-l border-white/5 bg-black/30 p-5">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">Evaluation Summary</div>
      <div className="mt-5 space-y-3">
        <SumRow label="Sections" value={t.sections} />
        <SumRow label="Labs" value={labs} />
        <SumRow label="Assessment" value={`${questions} Q`} />
        <SumRow label="Discussion" value={`${discussion} min`} />
        <div className="my-3 h-px bg-white/5" />
        <SumRow label="Total Duration" value={`${t.minutes} min`} strong />
        <SumRow label="Total Marks" value={t.marks} strong />
      </div>
      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Estimated Candidate Experience</div>
        <div className="mt-2 text-[13px] text-white">{["—", "Basic", "Fair", "Good", "Great", "Excellent"][score]}</div>
        <div className="mt-1 flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < score ? "fill-current" : "text-neutral-700"}`} />)}
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <button onClick={onPreview} className="w-full rounded-lg border border-white/10 py-2 text-[12px] text-neutral-300 hover:bg-white/5">Preview Candidate Experience</button>
        <button onClick={onPublish} disabled={ev.sections.length === 0} className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 py-2 text-[12px] font-medium text-black disabled:opacity-40">Publish Evaluation</button>
      </div>
    </aside>
  );
}
function SumRow({ label, value, strong }: { label: string; value: any; strong?: boolean }) {
  return <div className="flex items-center justify-between text-[12px]"><span className="text-neutral-500">{label}</span><span className={strong ? "text-white" : "text-neutral-300"}>{value}</span></div>;
}

// ---------------- Add Section modal ----------------

function AddSectionModal({ onClose, onPick }: { onClose: () => void; onPick: (k: "labs" | "assessment" | "discussion") => void }) {
  const options = [
    { key: "labs", title: "Engineering Labs", desc: "Real workspaces with terminal, editor and tasks.", icon: Beaker, tone: "from-emerald-400 to-cyan-400" },
    { key: "assessment", title: "Knowledge Assessment", desc: "MCQ, multi-select and scenario questions.", icon: BookOpen, tone: "from-violet-400 to-fuchsia-400" },
    { key: "discussion", title: "Vitarka AI Discussion", desc: "AI-led engineering discussion, contextual to work.", icon: MessageSquare, tone: "from-amber-400 to-orange-400" },
  ] as const;
  const later = ["Coding Challenge", "Take Home Assignment", "System Design"];
  return (
    <Overlay onClose={onClose}>
      <div className="w-[560px] rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Add section</div>
        <div className="mt-1 text-[18px] font-semibold text-white">What kind of section?</div>
        <div className="mt-5 grid gap-2.5">
          {options.map(o => (
            <button key={o.key} onClick={() => onPick(o.key as any)} className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left transition hover:border-white/15 hover:bg-white/[0.04]">
              <div className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${o.tone} text-black`}><o.icon className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="text-[14px] text-white">{o.title}</div>
                <div className="text-[11px] text-neutral-500">{o.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-600 transition group-hover:text-white" />
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-neutral-500">
          Coming soon: {later.join(" · ")}
        </div>
      </div>
    </Overlay>
  );
}

function SubsectionModal({ onClose, onPick }: { onClose: () => void; onPick: (n: string) => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-[520px] rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Add subsection</div>
        <div className="mt-1 text-[18px] font-semibold text-white">Pick a topic</div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {SUBSECTION_NAMES.map(n => (
            <button key={n} onClick={() => onPick(n)} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-3 text-[13px] text-neutral-200 transition hover:border-violet-400/40 hover:text-white">{n}</button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

// ---------------- Lab Drawer ----------------

function LabDrawer({ existing, onClose, onAdd }: { existing: string[]; onClose: () => void; onAdd: (l: LabItem) => void }) {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string>("All");
  const [lang, setLang] = useState<string>("All");
  const [db, setDb] = useState<string>("All");
  const [scenario, setScenario] = useState<string>("All");
  const [diff, setDiff] = useState<string>("All");

  const [labs, setLabs] = useState<LabItem[]>([]);
  const [previewLab, setPreviewLab] = useState<any>(null);

  useEffect(() => { fetchLabs().then(setLabs); }, []);

  const filtered = useMemo(() => labs.filter(l => {
    const qmatch = !q || l.title.toLowerCase().includes(q.toLowerCase());
    const domatch = domain === "All" || (l.domain || "").toUpperCase() === domain.toUpperCase();
    const lmatch = lang === "All" || (l.programming_languages || []).map(x => x.toUpperCase()).includes(lang.toUpperCase());
    const dbmatch = db === "All" || (l.databases || []).map(x => x.toUpperCase()).includes(db.toUpperCase());
    const smatch = scenario === "All" || (l.scenario || "").toUpperCase() === scenario.toUpperCase().replace(" ", "_");
    const dmatch = diff === "All" || (l.difficulty || "").toUpperCase() === diff.toUpperCase();
    return qmatch && domatch && lmatch && dbmatch && smatch && dmatch;
  }), [q, domain, lang, db, scenario, diff, labs]);

  return (
    <Drawer 
      title="Engineering Lab Library" 
      subtitle="Real labs, not textbook questions." 
      onClose={onClose}
      leftPanel={
        previewLab && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/5 p-6">
              <div className="text-[16px] font-semibold text-white">{previewLab.title || previewLab.text || "Preview"}</div>
              <button onClick={() => setPreviewLab(null)} className="rounded-md p-1.5 text-neutral-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <LabPreview l={previewLab} />
            </div>
            <div className="border-t border-white/5 p-5 flex justify-end">
              <button disabled={existing.includes(previewLab.id)} onClick={() => { onAdd(previewLab); setPreviewLab(null); }} className="rounded-md bg-emerald-400 px-5 py-2.5 text-[13px] font-medium text-black disabled:opacity-50">
                {existing.includes(previewLab.id) ? "Added" : "Add Lab"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="grid gap-2 border-b border-white/5 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search labs…" className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-emerald-400/60" />
        </div>
        <FilterRow label="Domain" value={domain} setValue={setDomain} options={["All", ...DOMAINS]} />
        <FilterRow label="Programming Languages" value={lang} setValue={setLang} options={["All", ...PROGRAMMING_LANGUAGES]} />
        <FilterRow label="Databases" value={db} setValue={setDb} options={["All", ...DATABASES]} />
        <FilterRow label="Scenario" value={scenario} setValue={setScenario} options={["All", ...SCENARIOS]} />
        <FilterRow label="Difficulty" value={diff} setValue={setDiff} options={["All", ...DIFFICULTIES]} />
      </div>
      <div className="mt-3 space-y-2">
        {filtered.map(l => {
          const added = existing.includes(l.id);
          return (
            <div key={l.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-white">{l.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                    <Chip>{l.domain}</Chip>{l.programming_languages?.map(x=><Chip key={x}>{x}</Chip>)}<Chip>{l.scenario}</Chip><Chip>{l.difficulty}</Chip>
                  </div>
                  <div className="mt-1.5 text-[11px] text-neutral-500"><Clock className="mr-1 inline h-3 w-3" />{l.duration_minutes} min · <Award className="mr-1 inline h-3 w-3" />{l.marks} marks</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPreviewLab(l)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/5">
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button disabled={added} onClick={() => onAdd(l)} className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2 py-1 text-[11px] font-medium text-black disabled:bg-white/10 disabled:text-neutral-500">
                    {added ? <><Check className="h-3 w-3" /> Added</> : <><Plus className="h-3 w-3" /> Add</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-8 text-center text-[12px] text-neutral-500">No labs match your filters.</div>}
      </div>
    </Drawer>
  );
}

function QuestionDrawerItem({ it, added, onAdd, onPreview }: { it: any, added: boolean, onAdd: (q: any) => void, onPreview: (q: any) => void }) {
  return (
    <div className="flex flex-col rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[13px] text-white flex-1">{it.text || it.title}</div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
        {it.programming_languages?.map((x: string)=><Chip key={x}>{x}</Chip>)}{it.databases?.map((x: string)=><Chip key={x}>{x}</Chip>)}<Chip>{it.difficulty}</Chip><Chip>{it.experience || it.level}</Chip><Chip>{it.format || it.type}</Chip>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] text-neutral-500">{it.marks} marks &middot; {it.duration_minutes || it.duration || (it.seconds ? Math.ceil(it.seconds/60) : 0)} min</div>
        <div className="flex items-center gap-1">
          <button onClick={() => onPreview(it)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/5">
            <Eye className="h-3 w-3" /> Preview
          </button>
          <button disabled={added} onClick={() => onAdd(it)} className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2 py-1 text-[11px] font-medium text-black disabled:bg-white/10 disabled:text-neutral-500">
            {added ? <><Check className="h-3 w-3" /> Added</> : <><Plus className="h-3 w-3" /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionDrawer({ existing, onClose, onAdd }: { existing: string[]; onClose: () => void; onAdd: (q: QuestionItem) => void }) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("All");
  const [db, setDb] = useState("All");
  const [diff, setDiff] = useState("All");
  const [exp, setExp] = useState("All");
  const [format, setFormat] = useState("All");
  
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [allTopics, setAllTopics] = useState<TopicItem[]>([]);
  const [course, setCourse] = useState("All");
  const [topic, setTopic] = useState("All");

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [previewQ, setPreviewQ] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const handlePreview = async (q: any) => {
    setLoadingPreview(true);
    const { fetchQuestionDetails } = await import('@/lib/recruiter');
    const details = await fetchQuestionDetails(q.id);
    setPreviewQ(details || q);
    setLoadingPreview(false);
  };

  const handleAdd = async (q: any) => {
    let finalQ = q;
    // If we haven't fetched the details for this question yet, fetch them before adding
    if (!q.content && !q.mcq_options) {
      const { fetchQuestionDetails } = await import('@/lib/recruiter');
      const details = await fetchQuestionDetails(q.id);
      finalQ = details || q;
    }

    const c = courses.find((c: any) => c.id === finalQ.course);
    const t = allTopics.find((t: any) => t.id === finalQ.topic);

    onAdd({
      ...finalQ,
      course_title: c ? c.name : "Other Subjects",
      topic_title: t ? t.name : "Other Topics",
    });
  };

  useEffect(() => { 
    setLoading(true);
    Promise.all([
      fetchQuestions().then(setQuestions),
      fetchCourses().then(setCourses),
      fetchTopics().then(setAllTopics)
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTopics([]);
    fetchTopics(course !== "All" ? course : undefined).then(setTopics);
  }, [course]);

  const filtered = useMemo(() => questions.filter(it => {
    const qmatch = !q || (it.text || it.title || "").toLowerCase().includes(q.toLowerCase());
    const lmatch = lang === "All" || (it.programming_languages || []).map(x => x.toUpperCase()).includes(lang.toUpperCase());
    const dmatch = diff === "All" || (it.difficulty || "").toUpperCase() === diff.toUpperCase();
    const fmatch = format === "All" || (it.format || it.type || "").toUpperCase() === format.toUpperCase().replace(" ", "_");
    const cmatch = course === "All" || it.course === course;
    const tmatch = topic === "All" || it.topic === topic;
    return qmatch && lmatch && dmatch && fmatch && cmatch && tmatch;
  }), [q, lang, diff, format, course, topic, questions]);

  return (
    <Drawer 
      title="Assessment Question Bank" 
      subtitle="Curated by topic and experience level." 
      onClose={onClose}
      leftPanel={
        previewQ && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/5 p-6">
              <div className="text-[16px] font-semibold text-white">{previewQ.title || previewQ.text || "Preview"}</div>
              <button onClick={() => setPreviewQ(null)} className="rounded-md p-1.5 text-neutral-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <QuestionPreview q={previewQ} />
            </div>
            <div className="border-t border-white/5 p-5 flex justify-end">
              <button disabled={existing.includes(previewQ.id)} onClick={() => { handleAdd(previewQ); setPreviewQ(null); }} className="rounded-md bg-emerald-400 px-5 py-2.5 text-[13px] font-medium text-black disabled:opacity-50">
                {existing.includes(previewQ.id) ? "Added" : "Add Question"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="grid gap-2 border-b border-white/5 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search questions…" className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-violet-400/60" />
        </div>
        <FilterRow label="Programming Languages" value={lang} setValue={setLang} options={["All", ...PROGRAMMING_LANGUAGES]} />
        <FilterRow label="Difficulty" value={diff} setValue={setDiff} options={["All", ...DIFFICULTIES]} />
        <FilterRow label="Format" value={format} setValue={setFormat} options={["All", ...FORMATS]} />
        <FilterRowObj 
          label="Courses" 
          value={course} 
          setValue={(v) => { setCourse(v); setTopic("All"); }} 
          options={[{value: "All", label: "All Courses"}, ...courses.map(c => ({value: c.id, label: c.name}))]} 
        />
        {course !== "All" && (
          <FilterRowObj 
            label="Topics" 
            value={topic} 
            setValue={setTopic} 
            options={[{value: "All", label: "All Topics"}, ...topics.map(t => ({value: t.id, label: t.name}))]} 
          />
        )}
      </div>
      <div className="mt-3 space-y-2">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}
        {!loading && filtered.map(it => (
          <QuestionDrawerItem key={it.id} it={it} added={existing.includes(it.id)} onAdd={handleAdd} onPreview={handlePreview} />
        ))}
        {filtered.length === 0 && <div className="py-8 text-center text-[12px] text-neutral-500">No questions match your filters.</div>}
      </div>
    </Drawer>
  );
}

function FilterRow({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map(o => (
          <button key={o} onClick={() => setValue(o)} className={`rounded-md border px-2 py-0.5 text-[11px] ${value === o ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400 hover:text-white"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function FilterRowObj({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: {value: string, label: string}[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map(o => (
          <button key={o.value} onClick={() => setValue(o.value)} className={`rounded-md border px-2 py-0.5 text-[11px] ${value === o.value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400 hover:text-white"}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-neutral-400">{children}</span>;
}

// ---------------- Overlay / Drawer primitives ----------------

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Drawer({ children, onClose, title, subtitle, leftPanel }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string; leftPanel?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur" onClick={onClose}>
      {leftPanel && (
        <div onClick={(e) => e.stopPropagation()} className="flex flex-1 justify-end p-8 pb-10 max-h-screen">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl flex flex-col">
            {leftPanel}
          </div>
        </div>
      )}
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-[480px] flex-col border-l border-white/10 bg-neutral-950">
        <div className="flex items-start justify-between border-b border-white/5 p-5">
          <div>
            <div className="text-[14px] font-medium text-white">{title}</div>
            {subtitle && <div className="mt-0.5 text-[11px] text-neutral-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------- Preview / Publish screens ----------------

function PreviewScreen({ ev, onBack }: { ev: Evaluation; onBack: () => void }) {
  const previewData = useMemo(() => {
    return {
      sections: ev.sections.map(s => {
        if (s.kind === "labs") {
          return {
            type: "LAB",
            id: s.id,
            title: s.title,
            questions: (s as any).labs // Workspace expects questions array for labs
          };
        } else if (s.kind === "assessment") {
          return {
            type: "KNOWLEDGE_ASSESSMENT",
            id: s.id,
            title: s.title,
            questions: (s as any).questions
          };
        } else if (s.kind === "discussion") {
          return {
            type: "VITARKA_AI_INTERVIEW",
            id: s.id,
            title: s.title
          };
        }
        return null;
      }).filter(Boolean)
    };
  }, [ev]);

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-12 items-center justify-between border-b border-white/10 bg-neutral-950 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">STUDENT PREVIEW</div>
          <div className="text-[13px] font-medium text-neutral-300">{ev.title}</div>
        </div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/20">
          <X className="h-3.5 w-3.5" /> Close Preview
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <Workspace previewData={previewData} />
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

function parseCSVLine(text: string) {
  const ret = [];
  let state = 0; // 0 = unquoted, 1 = quoted
  let val = "";
  for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (state === 0) {
          if (c === '"') { state = 1; }
          else if (c === ',') { ret.push(val); val = ""; }
          else { val += c; }
      } else {
          if (c === '"') {
              if (i + 1 < text.length && text[i + 1] === '"') { val += '"'; i++; } // escaped quote
              else { state = 0; }
          }
          else { val += c; }
      }
  }
  ret.push(val);
  return ret;
}

function PublishScreen({ ev, onBack, onPublish }: { ev: Evaluation; onBack: () => void; onPublish: (invite: NonNullable<Evaluation["invite"]>) => void }) {
  const [type, setType] = useState<"email" | "link" | "csv">("email");
  const [emails, setEmails] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [expiry, setExpiry] = useState<"7" | "14" | "30" | "custom">("14");
  const [attempts, setAttempts] = useState<"1" | "2" | "unlimited">("1");
  const link = useMemo(() => `${typeof window !== "undefined" ? window.location.origin : ""}/evaluation?e=${ev.id}`, [ev.id]);
  const [copied, setCopied] = useState(false);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError("");
    setCsvSuccess("");
    const f = e.target.files?.[0];
    if (!f) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      
      if (lines.length === 0) {
        setCsvError("CSV file is empty.");
        return;
      }
      
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      const emailIdx = headers.findIndex(h => h === "email");
      
      if (emailIdx === -1) {
        setCsvError("Invalid CSV format. Missing 'email' column header.");
        return;
      }
      
      const parsedEmails = new Set<string>();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let invalidCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const emailStr = cols[emailIdx]?.trim();
        if (emailStr) {
           if (emailRegex.test(emailStr)) {
               parsedEmails.add(emailStr);
           } else {
               invalidCount++;
           }
        }
      }
      
      if (parsedEmails.size === 0) {
         setCsvError(`No valid emails found in CSV. ${invalidCount} invalid entries.`);
         return;
      }
      
      setEmails(Array.from(parsedEmails).join("\n"));
      setCsvSuccess(`Successfully loaded ${parsedEmails.size} valid emails.` + (invalidCount > 0 ? ` Ignored ${invalidCount} invalid.` : ""));
    };
    reader.readAsText(f);
  };

  const submit = () => {
    if (type === "csv" && !emails) {
       alert("Please upload a valid CSV first.");
       return;
    }
    const list = emails.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean);
    if ((type === "email" || type === "csv") && list.length === 0) {
       alert("Please provide at least one valid email.");
       return;
    }
    const publishType = type === "csv" ? "email" : type;
    onPublish({ type: publishType, emails: list, expiry, attempts, link });
  };

  return (
    <div className="min-h-screen p-10">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white"><ChevronLeft className="h-3.5 w-3.5" /> Back</button>
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="text-[10px] uppercase tracking-widest text-emerald-400">Ready to publish</div>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{ev.title}</h1>
        <p className="mt-1 text-[13px] text-neutral-400">Choose how candidates receive this evaluation.</p>

        <div className="mt-8 grid grid-cols-4 gap-2">
          {[
            { k: "email", label: "Email", icon: Mail },
            { k: "link", label: "Public Link", icon: LinkIcon },
            { k: "csv", label: "Bulk CSV", icon: Upload },
            { k: "ats", label: "ATS", icon: Sparkles, soon: true },
          ].map((o: any) => (
            <button key={o.k} disabled={o.soon} onClick={() => setType(o.k)} className={`rounded-xl border p-4 text-left transition ${o.soon ? "border-white/5 opacity-40" : type === o.k ? "border-emerald-400/40 bg-emerald-400/5" : "border-white/10 hover:bg-white/[0.02]"}`}>
              <o.icon className="h-4 w-4 text-neutral-300" />
              <div className="mt-2 text-[12px] text-white">{o.label}</div>
              {o.soon && <div className="text-[10px] text-neutral-500">Coming soon</div>}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          {type === "email" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Candidate Emails</div>
              <textarea value={emails} onChange={e => setEmails(e.target.value)} rows={4} placeholder="candidate@example.com, another@example.com" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] outline-none focus:border-emerald-400/60" />
            </div>
          )}
          {type === "link" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Public Link</div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] text-neutral-300">
                {ev.id === "draft" ? (
                  <span className="flex-1 truncate font-mono text-neutral-500">Link will be generated upon publish</span>
                ) : (
                  <>
                    <span className="flex-1 truncate font-mono">{link}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white">{copied ? "Copied" : "Copy"}</button>
                  </>
                )}
              </div>
            </div>
          )}
          {type === "csv" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Upload CSV</div>
              <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-white/10 p-4 text-[12px] text-neutral-400 hover:border-emerald-400/40 hover:text-white">
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Drop CSV or browse (email,name,role)</span>
                <input type="file" accept=".csv" className="sr-only" onChange={handleCsvUpload} />
              </label>
              <div className="mt-2 flex justify-between items-center text-[11px]">
                  <a href={`data:text/csv;charset=utf-8,email\ncandidate1@example.com\ncandidate2@example.com\ncandidate3@example.com`} download="sample_template.csv" className="text-emerald-400 hover:underline">Download Sample CSV</a>
              </div>
              {csvError && <div className="mt-2 text-[12px] text-red-400">{csvError}</div>}
              {csvSuccess && <div className="mt-2 text-[12px] text-emerald-400">{csvSuccess}</div>}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Expiry</div>
            <div className="mt-2 flex gap-1.5">
              {(["7", "14", "30", "custom"] as const).map(x => (
                <button key={x} onClick={() => setExpiry(x)} className={`rounded-md border px-2 py-1 text-[11px] ${expiry === x ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400"}`}>{x === "custom" ? "Custom" : `${x} days`}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Attempts</div>
            <div className="mt-2 flex gap-1.5">
              {(["1", "2", "unlimited"] as const).map(x => (
                <button key={x} onClick={() => setAttempts(x)} className={`rounded-md border px-2 py-1 text-[11px] ${attempts === x ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400"}`}>{x}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-2">
          <button onClick={onBack} className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-neutral-300 hover:bg-white/5">Cancel</button>
          <button onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2 text-[13px] font-medium text-black hover:brightness-110"><Rocket className="h-4 w-4" /> Publish Evaluation</button>
        </div>
      </div>
    </div>
  );
}

function PublishedScreen({ ev, onBack }: { ev: Evaluation; onBack: () => void }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/evaluation?e=${ev.id}` : "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid min-h-screen place-items-center p-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-400"><Check className="h-6 w-6" /></div>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight">Evaluation published</h1>
        <p className="mt-1 text-[13px] text-neutral-400">{ev.title} is now live.</p>
        
        {ev.invite?.type === "email" ? (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
            <div className="text-[14px] text-emerald-400">Emails have been successfully sent to all invited candidates.</div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Shareable link</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="truncate font-mono text-[12px] text-neutral-300">{link}</div>
              <button onClick={handleCopy} className="ml-2 rounded-md bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/20">
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-8 flex items-center justify-center gap-2">
          <button onClick={onBack} className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-neutral-300 hover:bg-white/5">Back to workspace</button>
          <Link to="/recruiter/evaluations" className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-[12px] font-medium text-black">View all evaluations</Link>
        </div>
      </div>
    </div>
  );
}