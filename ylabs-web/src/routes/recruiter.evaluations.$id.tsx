import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ChevronLeft, Plus, X, Search, Trash2, Copy, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
  Beaker, BookOpen, MessageSquare, Sparkles, Clock, Award, Star, Check, Link as LinkIcon,
  Upload, Mail, Rocket, Eye, Pencil, GripVertical, Shuffle,
} from "lucide-react";
import {
  getEvaluation, saveEvaluation, evaluationTotals, LAB_LIBRARY, QUESTION_BANK, SUBSECTION_NAMES,
  newUid, Evaluation, Section, LabsSection, AssessmentSection, DiscussionSection, LabItem, QuestionItem,
} from "@/lib/recruiter";

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
  const [qDrawerFor, setQDrawerFor] = useState<{ sectionId: string; subId: string } | null>(null);
  const [addSubFor, setAddSubFor] = useState<string | null>(null);

  // Child route matched (e.g. /workspace, /candidates/...) — defer to it.
  const isChild = loc.pathname.replace(/\/$/, "") !== `/recruiter/evaluations/${id}`;

  useEffect(() => {
    if (isChild) return;
    const e = getEvaluation(id);
    if (!e) nav({ to: "/recruiter/evaluations" }); else setEv(e);
  }, [id, nav, isChild]);

  if (isChild) return <Outlet />;
  if (!ev) return null;

  const update = (fn: (e: Evaluation) => void) => {
    const c = { ...ev, sections: JSON.parse(JSON.stringify(ev.sections)) };
    fn(c); saveEvaluation(c); setEv(c);
  };

  const totals = evaluationTotals(ev);

  const setView = (v: "edit" | "preview" | "publish" | "publish-done") => nav({ to: "/recruiter/evaluations/$id", params: { id }, search: { view: v } });

  if (view === "publish-done") return <PublishedScreen ev={ev} onBack={() => setView("edit")} />;
  if (view === "publish") return <PublishScreen ev={ev} onBack={() => setView("edit")} onPublish={(invite) => { update(e => { e.status = "published"; e.publishedAt = Date.now(); e.invite = invite; e.candidatesInvited = invite.emails.length || (invite.type === "link" ? 0 : 0); }); setView("publish-done"); }} />;
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
              <button onClick={() => saveEvaluation(ev)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-neutral-300 hover:bg-white/5">Save Draft</button>
              <button onClick={() => setView("publish")} disabled={ev.sections.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1.5 text-[12px] font-medium text-black disabled:opacity-40"><Rocket className="h-3.5 w-3.5" /> Publish</button>
            </div>
          </div>

          <div className="mt-8">
            <input value={ev.title} onChange={e => update(x => { x.title = e.target.value; })} placeholder="Untitled Evaluation" className="w-full border-0 bg-transparent text-[42px] font-semibold tracking-tight text-white placeholder-neutral-600 outline-none" />
            <div className="mt-2 flex items-center gap-3">
              <select value={ev.domain} onChange={e => update(x => { x.domain = e.target.value as any; })} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[12px] text-neutral-300 outline-none">
                <option value="">Set domain…</option>
                {["Finance", "Insurance", "EdTech", "Supply Chain", "Healthcare", "Retail"].map(d => <option key={d} value={d}>{d}</option>)}
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
                onAddSubsection={() => setAddSubFor(s.id)}
                onAddQuestions={(subId) => setQDrawerFor({ sectionId: s.id, subId })}
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
              else if (kind === "assessment") x.sections.push({ id: newUid(), kind: "assessment", title: "Knowledge Assessment", subsections: [] });
              else x.sections.push({ id: newUid(), kind: "discussion", title: "Engineering Discussion", duration: 15, mode: "Automatic", questions: [] });
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
            setLabDrawerFor(null);
          }}
        />
      )}
      {addSubFor && (
        <SubsectionModal
          onClose={() => setAddSubFor(null)}
          onPick={(name) => {
            update(x => {
              const sec = x.sections.find(s => s.id === addSubFor) as AssessmentSection | undefined;
              sec?.subsections.push({ id: newUid(), name, questions: [] });
            });
            setAddSubFor(null);
          }}
        />
      )}
      {qDrawerFor && (
        <QuestionDrawer
          existing={((ev.sections.find(s => s.id === qDrawerFor.sectionId) as AssessmentSection | undefined)?.subsections.find(sb => sb.id === qDrawerFor.subId)?.questions ?? []).map(q => q.id)}
          onClose={() => setQDrawerFor(null)}
          onAdd={(q) => {
            update(x => {
              const sec = x.sections.find(s => s.id === qDrawerFor.sectionId) as AssessmentSection | undefined;
              const sub = sec?.subsections.find(sb => sb.id === qDrawerFor.subId);
              if (sub && !sub.questions.find(qq => qq.id === q.id)) sub.questions.push(q);
            });
            setQDrawerFor(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------- Section block ----------------

function SectionBlock({ section, index, total, onChange, onDelete, onDuplicate, onMove, onAddLab, onAddSubsection, onAddQuestions }: {
  section: Section; index: number; total: number;
  onChange: (s: Section) => void;
  onDelete: () => void; onDuplicate: () => void;
  onMove: (dir: "up" | "down") => void;
  onAddLab: () => void;
  onAddSubsection: () => void;
  onAddQuestions: (subId: string) => void;
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
          {section.kind === "assessment" && <AssessmentSectionBody section={section} onChange={onChange} onAddSubsection={onAddSubsection} onAddQuestions={onAddQuestions} />}
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
  const minutes = section.labs.reduce((a, l) => a + l.minutes, 0);
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
                <div className="text-[11px] text-neutral-500">{l.domain} · {l.tech} · {l.scenario} · {l.level} · {l.minutes} min · {l.marks} marks</div>
              </div>
              <ToolBtn title="Duplicate" onClick={() => dup(l.id)}><Copy className="h-3.5 w-3.5" /></ToolBtn>
              <ToolBtn title="Remove" onClick={() => remove(l.id)}><Trash2 className="h-3.5 w-3.5" /></ToolBtn>
            </li>
          ))}
        </ul>
      )}
      <button onClick={onAddLab} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[12px] text-neutral-400 hover:border-emerald-400/40 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add Lab</button>
    </div>
  );
}

function AssessmentSectionBody({ section, onChange, onAddSubsection, onAddQuestions }: { section: AssessmentSection; onChange: (s: Section) => void; onAddSubsection: () => void; onAddQuestions: (subId: string) => void }) {
  const update = (subId: string, fn: (s: any) => void) => {
    const subs = section.subsections.map(s => s.id === subId ? (() => { const c = { ...s, questions: [...s.questions] }; fn(c); return c; })() : s);
    onChange({ ...section, subsections: subs });
  };
  const removeSub = (id: string) => onChange({ ...section, subsections: section.subsections.filter(s => s.id !== id) });
  const dupSub = (id: string) => {
    const s = section.subsections.find(x => x.id === id); if (!s) return;
    onChange({ ...section, subsections: [...section.subsections, { ...s, id: newUid() }] });
  };
  const totalQ = section.subsections.reduce((a, s) => a + s.questions.length, 0);
  const totalM = section.subsections.reduce((a, s) => a + s.questions.reduce((b, q) => b + q.marks, 0), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Subsections" value={section.subsections.length} />
        <Stat label="Questions" value={totalQ} />
        <Stat label="Marks" value={totalM} />
      </div>
      {section.subsections.length > 0 && (
        <div className="mt-3 space-y-2">
          {section.subsections.map(sub => {
            const m = sub.questions.reduce((a, q) => a + q.marks, 0);
            const t = Math.ceil(sub.questions.reduce((a, q) => a + q.seconds, 0) / 60);
            return (
              <div key={sub.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-[10px] font-medium text-neutral-300">{sub.name[0]}</span>
                  <div className="flex-1 text-[13px] text-white">{sub.name}</div>
                  <span className="text-[11px] text-neutral-500">{sub.questions.length} Q · {m} marks · {t} min</span>
                  <ToolBtn title="Randomize" onClick={() => update(sub.id, s => { s.randomize = !s.randomize; })}><Star className={`h-3.5 w-3.5 ${sub.randomize ? "text-emerald-400" : ""}`} /></ToolBtn>
                  <ToolBtn title="Shuffle" onClick={() => update(sub.id, s => { s.shuffle = !s.shuffle; })}><Shuffle className={`h-3.5 w-3.5 ${sub.shuffle ? "text-emerald-400" : ""}`} /></ToolBtn>
                  <ToolBtn title="Duplicate" onClick={() => dupSub(sub.id)}><Copy className="h-3.5 w-3.5" /></ToolBtn>
                  <ToolBtn title="Delete" onClick={() => removeSub(sub.id)}><Trash2 className="h-3.5 w-3.5" /></ToolBtn>
                </div>
                {sub.questions.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-white/5 pt-2">
                    {sub.questions.map(q => (
                      <li key={q.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-[12px]">
                        <span className="line-clamp-1 flex-1 text-neutral-300">{q.text}</span>
                        <span className="text-[10px] text-neutral-500">{q.difficulty} · {q.marks}m · {q.seconds}s</span>
                        <ToolBtn title="Remove" onClick={() => update(sub.id, s => { s.questions = s.questions.filter((qq: QuestionItem) => qq.id !== q.id); })}><X className="h-3 w-3" /></ToolBtn>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => onAddQuestions(sub.id)} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/10 px-2.5 py-1 text-[11px] text-neutral-400 hover:border-violet-400/40 hover:text-white"><Plus className="h-3 w-3" /> Add Questions</button>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={onAddSubsection} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[12px] text-neutral-400 hover:border-violet-400/40 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add Subsection</button>
    </div>
  );
}

function DiscussionSectionBody({ section, onChange }: { section: DiscussionSection; onChange: (s: Section) => void }) {
  const [custom, setCustom] = useState("");
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
            {(["Automatic", "Custom", "Hybrid"] as const).map(m => (
              <button key={m} onClick={() => onChange({ ...section, mode: m })} className={`rounded-md border px-2.5 py-1 text-[12px] ${section.mode === m ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 text-neutral-400 hover:text-white"}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>
      {section.mode === "Automatic" && (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-[12px] text-neutral-400">
          <div className="flex items-center gap-2 text-neutral-300"><Sparkles className="h-3.5 w-3.5 text-amber-400" /> Vitarka AI will generate questions from labs, assessment answers and candidate decisions.</div>
        </div>
      )}
      {(section.mode === "Custom" || section.mode === "Hybrid") && (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <div className="text-[12px] text-neutral-300">Custom questions</div>
          <ul className="mt-2 space-y-1">
            {section.questions.map((q, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md bg-white/[0.02] px-2 py-1.5 text-[12px] text-neutral-300">
                <span className="text-[10px] text-neutral-500">Q{i + 1}</span>
                <span className="flex-1">{q}</span>
                <ToolBtn title="Remove" onClick={() => onChange({ ...section, questions: section.questions.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></ToolBtn>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="How would you improve scalability?" className="flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[12px] outline-none" />
            <button onClick={() => { if (custom.trim()) { onChange({ ...section, questions: [...section.questions, custom.trim()] }); setCustom(""); } }} className="rounded-md bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/15">Add</button>
          </div>
        </div>
      )}
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
  const questions = ev.sections.filter(s => s.kind === "assessment").reduce((a, s: any) => a + s.subsections.reduce((b: number, sb: any) => b + sb.questions.length, 0), 0);
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
  const [tech, setTech] = useState<string>("All");
  const [scenario, setScenario] = useState<string>("All");
  const [level, setLevel] = useState<string>("All");

  const filtered = useMemo(() => LAB_LIBRARY.filter(l =>
    (!q || l.title.toLowerCase().includes(q.toLowerCase())) &&
    (domain === "All" || l.domain === domain) &&
    (tech === "All" || l.tech === tech) &&
    (scenario === "All" || l.scenario === scenario) &&
    (level === "All" || l.level === level)
  ), [q, domain, tech, scenario, level]);

  return (
    <Drawer title="Engineering Lab Library" subtitle="Real labs, not textbook questions." onClose={onClose}>
      <div className="grid gap-2 border-b border-white/5 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search labs…" className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-emerald-400/60" />
        </div>
        <FilterRow label="Domain" value={domain} setValue={setDomain} options={["All", "Finance", "Insurance", "EdTech", "Supply Chain", "Healthcare", "Retail"]} />
        <FilterRow label="Technology" value={tech} setValue={setTech} options={["All", "Java", "SQL", "Python", "React", "Node", "DevOps", "Testing", "Security", "JavaScript"]} />
        <FilterRow label="Scenario" value={scenario} setValue={setScenario} options={["All", "Debugging", "Feature Development", "API", "Optimization", "Security", "Architecture", "Performance", "Testing", "Production Incident"]} />
        <FilterRow label="Difficulty" value={level} setValue={setLevel} options={["All", "L1", "L2", "L3"]} />
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
                    <Chip>{l.domain}</Chip><Chip>{l.tech}</Chip><Chip>{l.scenario}</Chip><Chip>{l.level}</Chip>
                  </div>
                  <div className="mt-1.5 text-[11px] text-neutral-500"><Clock className="mr-1 inline h-3 w-3" />{l.minutes} min · <Award className="mr-1 inline h-3 w-3" />{l.marks} marks · Tasks {l.tasks}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/5">Preview</button>
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

function QuestionDrawer({ existing, onClose, onAdd }: { existing: string[]; onClose: () => void; onAdd: (q: QuestionItem) => void }) {
  const [q, setQ] = useState("");
  const [tech, setTech] = useState("All");
  const [diff, setDiff] = useState("All");
  const [exp, setExp] = useState("All");
  const [format, setFormat] = useState("All");

  const filtered = useMemo(() => QUESTION_BANK.filter(it =>
    (!q || it.text.toLowerCase().includes(q.toLowerCase())) &&
    (tech === "All" || it.tech === tech) &&
    (diff === "All" || it.difficulty === diff) &&
    (exp === "All" || it.experience === exp) &&
    (format === "All" || it.format === format)
  ), [q, tech, diff, exp, format]);

  return (
    <Drawer title="Assessment Question Bank" subtitle="Curated by topic and experience level." onClose={onClose}>
      <div className="grid gap-2 border-b border-white/5 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search questions…" className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-violet-400/60" />
        </div>
        <FilterRow label="Technology" value={tech} setValue={setTech} options={["All", "Java", "SQL", "Python", "React", "Node", "JavaScript", "Security"]} />
        <FilterRow label="Difficulty" value={diff} setValue={setDiff} options={["All", "Easy", "Medium", "Hard"]} />
        <FilterRow label="Experience" value={exp} setValue={setExp} options={["All", "Fresher", "1-3", "3-5"]} />
        <FilterRow label="Format" value={format} setValue={setFormat} options={["All", "MCQ", "Multiple Select", "Scenario Based"]} />
      </div>
      <div className="mt-3 space-y-2">
        {filtered.map(it => {
          const added = existing.includes(it.id);
          return (
            <div key={it.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[13px] text-white">{it.text}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                <Chip>{it.tech}</Chip><Chip>{it.topic}</Chip><Chip>{it.difficulty}</Chip><Chip>{it.format}</Chip>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-neutral-500">{it.marks} marks · {it.seconds}s</div>
                <div className="flex items-center gap-1">
                  <button className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/5">Preview</button>
                  <button disabled={added} onClick={() => onAdd(it)} className="inline-flex items-center gap-1 rounded-md bg-violet-400 px-2 py-1 text-[11px] font-medium text-black disabled:bg-white/10 disabled:text-neutral-500">
                    {added ? <><Check className="h-3 w-3" /> Added</> : <><Plus className="h-3 w-3" /> Add</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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

function Drawer({ children, onClose, title, subtitle }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur" onClick={onClose}>
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
  const t = evaluationTotals(ev);
  return (
    <div className="min-h-screen p-10">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white"><ChevronLeft className="h-3.5 w-3.5" /> Back to workspace</button>
      <div className="mx-auto mt-8 max-w-3xl">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Evaluation</div>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{ev.title}</h1>
        <div className="mt-1 text-[12px] text-neutral-400">{ev.domain || "—"} · {t.minutes} min · {t.marks} marks</div>

        <div className="mt-8 divide-y divide-white/5 border-y border-white/5">
          {ev.sections.map((s, i) => (
            <div key={s.id} className="py-5">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Section {i + 1}</div>
              <div className="mt-1 text-[16px] text-white">{s.title}</div>
              <div className="mt-1 text-[12px] text-neutral-400">
                {s.kind === "labs" && `${s.labs.length} labs · ${s.labs.reduce((a, l) => a + l.minutes, 0)} min`}
                {s.kind === "assessment" && `${s.subsections.map(x => x.name).join(" · ")} · ${s.subsections.reduce((a, x) => a + x.questions.length, 0)} questions`}
                {s.kind === "discussion" && `${s.duration} min · ${s.mode} mode`}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <Stat label="Total sections" value={t.sections} />
          <Stat label="Total duration" value={`${t.minutes} min`} />
          <Stat label="Total marks" value={t.marks} />
        </div>

        <div className="mt-8 flex items-center gap-2">
          <button onClick={onBack} className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-neutral-300 hover:bg-white/5"><Pencil className="mr-1 inline h-3.5 w-3.5" /> Continue editing</button>
        </div>
      </div>
    </div>
  );
}

function PublishScreen({ ev, onBack, onPublish }: { ev: Evaluation; onBack: () => void; onPublish: (invite: NonNullable<Evaluation["invite"]>) => void }) {
  const [type, setType] = useState<"email" | "link" | "csv">("email");
  const [emails, setEmails] = useState("");
  const [expiry, setExpiry] = useState<"7" | "14" | "30" | "custom">("14");
  const [attempts, setAttempts] = useState<"1" | "2" | "unlimited">("1");
  const link = useMemo(() => `${typeof window !== "undefined" ? window.location.origin : ""}/evaluation?e=${ev.id}`, [ev.id]);
  const [copied, setCopied] = useState(false);

  const submit = () => {
    const list = emails.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean);
    onPublish({ type, emails: list, expiry, attempts, link });
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
                <span className="flex-1 truncate font-mono">{link}</span>
                <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white">{copied ? "Copied" : "Copy"}</button>
              </div>
            </div>
          )}
          {type === "csv" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Upload CSV</div>
              <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-white/10 p-4 text-[12px] text-neutral-400 hover:border-emerald-400/40 hover:text-white">
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Drop CSV or browse (email,name,role)</span>
                <input type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setEmails(`imported: ${f.name}`); }} />
              </label>
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
  return (
    <div className="grid min-h-screen place-items-center p-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-400"><Check className="h-6 w-6" /></div>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight">Evaluation published</h1>
        <p className="mt-1 text-[13px] text-neutral-400">{ev.title} is now live. Candidates have been notified.</p>
        {ev.invite?.link && (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Shareable link</div>
            <div className="mt-1 truncate font-mono text-[12px] text-neutral-300">{ev.invite.link}</div>
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
