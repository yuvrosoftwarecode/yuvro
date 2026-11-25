import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWizard } from "./WizardContext";
import { TaskItem } from "./types";
import { standardizeTaskWithAI, estimateDurationWithAI } from "./adapters/architectAdapter";

function DiffViewer({ diff }: { diff: string }) {
  if (!diff || !diff.trim()) {
    return <pre className="dcode">No reference solution yet</pre>;
  }

  // Clean out markdown code blocks if wrapped with ```diff or ```
  const cleanDiff = diff.replace(/^```(?:diff|patch|[a-z0-9_-]+)?\n?/i, "").replace(/\n?```\s*$/i, "");
  const lines = cleanDiff.split("\n");

  // Check if it looks like a diff
  const isDiff = lines.some((l) =>
    l.startsWith("--- ") ||
    l.startsWith("+++ ") ||
    l.startsWith("@@ ") ||
    l.startsWith("diff --git ") ||
    l.startsWith("+") ||
    l.startsWith("-")
  );

  if (!isDiff) {
    // If not a git diff, render as standard code block
    return <pre className="dcode">{cleanDiff}</pre>;
  }

  return (
    <div className="diff-box">
      {lines.map((line, idx) => {
        let lineClass = "";
        if (line.startsWith("+++ ") || line.startsWith("--- ") || line.startsWith("diff --git ")) {
          lineClass = "diff-header";
        } else if (line.startsWith("@@ ")) {
          lineClass = "diff-hunk";
        } else if (line.startsWith("+")) {
          lineClass = "diff-add";
        } else if (line.startsWith("-")) {
          lineClass = "diff-del";
        }

        return (
          <div key={idx} className={`diff-line ${lineClass}`}>
            <span className="diff-ln">{idx + 1}</span>
            <span className="diff-content">{line || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TaskDetail({
  onClose,
  onAddOne,
  onDelete,
}: {
  onClose: () => void;
  onAddOne: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}) {
  const { state, setState } = useWizard();
  const t = state.t;

  // Find task from either tasks or runs
  const findTask = (id: string): { x: TaskItem; lab: boolean } | null => {
    const fromLab = t.tasks.find((x) => x.id === id);
    if (fromLab) return { x: fromLab, lab: true };
    for (const r of t.runs) {
      const fromRun = r.items.find((x) => x.id === id);
      if (fromRun) return { x: fromRun, lab: false };
    }
    return null;
  };

  const selectedInfo = t.sel ? findTask(t.sel) : null;

  // EDIT MODE STATE
  const isEditing = Boolean(t.ed);
  const editData = t.ed?.d;
  const editErrors = t.ed?.e || {};

  const handleStartEdit = () => {
    if (!selectedInfo) return;
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        ed: {
          id: selectedInfo.x.id,
          d: {
            title: selectedInfo.x.title,
            diff: selectedInfo.x.diff,
            marks: selectedInfo.x.marks,
            min: selectedInfo.x.min,
            dep: selectedInfo.x.dep || "",
            desc: selectedInfo.x.desc,
            ref: selectedInfo.x.ref,
          },
          e: {},
        },
      },
    }));
  };

  const handleCancelEdit = () => {
    setState((prev) => ({
      ...prev,
      t: { ...prev.t, ed: null },
    }));
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    const e: Record<string, string> = {};
    if (!editData.title.trim()) e.title = "Title is required";
    if (Number(editData.marks) < 0) e.marks = "Marks cannot be negative";
    if (Number(editData.min) <= 0) e.min = "Minutes must be greater than 0";

    if (Object.keys(e).length > 0) {
      setState((prev) => ({
        ...prev,
        t: {
          ...prev.t,
          ed: {
            id: prev.t.ed!.id,
            d: editData,
            e,
          },
        },
      }));
      return;
    }

    const editId = t.ed?.id;
    if (editId) {
      // Update existing task (in lab tasks or runs)
      setState((prev) => {
        const nextTasks = prev.t.tasks.map((tk) =>
          tk.id === editId ? { ...tk, ...editData, marks: Number(editData.marks), min: Number(editData.min) } : tk
        );
        const nextRuns = prev.t.runs.map((r) => ({
          ...r,
          items: r.items.map((tk) =>
            tk.id === editId ? { ...tk, ...editData, marks: Number(editData.marks), min: Number(editData.min) } : tk
          ),
        }));
        return {
          ...prev,
          t: {
            ...prev.t,
            tasks: nextTasks,
            runs: nextRuns,
            ed: null,
          },
        };
      });
    } else {
      // New task created manually
      const newTask: TaskItem = {
        id: `t_${Date.now()}`,
        title: editData.title,
        diff: editData.diff,
        marks: Number(editData.marks) || 3,
        min: Number(editData.min) || 10,
        dep: editData.dep || "",
        desc: editData.desc,
        ref: editData.ref,
        fresh: true,
      };

      setState((prev) => ({
        ...prev,
        t: {
          ...prev.t,
          tasks: [...prev.t.tasks, newTask],
          sel: newTask.id,
          tab: "lab",
          ed: null,
        },
      }));
    }
  };

  const handleStandardize = async (task: TaskItem) => {
    const updated = await standardizeTaskWithAI(task, state.f);
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        tasks: prev.t.tasks.map((tk) => (tk.id === task.id ? updated : tk)),
        runs: prev.t.runs.map((r) => ({
          ...r,
          items: r.items.map((tk) => (tk.id === task.id ? updated : tk)),
        })),
      },
    }));
  };

  const handleEstimateDuration = async (task: TaskItem) => {
    const est = await estimateDurationWithAI(task, state.f);
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        tasks: prev.t.tasks.map((tk) => (tk.id === task.id ? { ...tk, min: est } : tk)),
        runs: prev.t.runs.map((r) => ({
          ...r,
          items: r.items.map((tk) => (tk.id === task.id ? { ...tk, min: est } : tk)),
        })),
      },
    }));
  };

  // 1. EDIT MODE
  if (isEditing && editData) {
    const otherTasks = t.tasks.filter((tk) => tk.id !== t.ed?.id);

    return (
      <>
        <div className="dh">
          <div className="dti">
            <p className="mut sm" style={{ margin: 0 }}>
              {t.ed?.id ? "Editing task" : "New task"}
            </p>
          </div>
          <div className="dact">
            <button type="button" className="lk" onClick={handleCancelEdit}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={handleSaveEdit}>
              Save task
            </button>
          </div>
        </div>

        <div className="edform">
          <div className="fg">
            <label className="lab" htmlFor="te-title">
              Title
            </label>
            <input
              id="te-title"
              className="ctl"
              value={editData.title}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  t: {
                    ...prev.t,
                    ed: {
                      id: prev.t.ed!.id,
                      d: { ...prev.t.ed!.d, title: e.target.value },
                      e: { ...prev.t.ed!.e, title: "" },
                    },
                  },
                }))
              }
            />
            {editErrors.title && <p className="er">{editErrors.title}</p>}
          </div>

          <div className="g4">
            <div className="fg">
              <label className="lab" htmlFor="te-diff">
                Difficulty
              </label>
              <select
                id="te-diff"
                className="ctl"
                value={editData.diff}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    t: {
                      ...prev.t,
                      ed: {
                        id: prev.t.ed!.id,
                        d: { ...prev.t.ed!.d, diff: e.target.value as any },
                        e: prev.t.ed!.e,
                      },
                    },
                  }))
                }
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="fg">
              <label className="lab" htmlFor="te-marks">
                Marks
              </label>
              <input
                id="te-marks"
                type="number"
                min={0}
                className="ctl"
                value={editData.marks}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    t: {
                      ...prev.t,
                      ed: {
                        id: prev.t.ed!.id,
                        d: { ...prev.t.ed!.d, marks: Number(e.target.value) || 0 },
                        e: { ...prev.t.ed!.e, marks: "" },
                      },
                    },
                  }))
                }
              />
              {editErrors.marks && <p className="er">{editErrors.marks}</p>}
            </div>

            <div className="fg">
              <label className="lab" htmlFor="te-min">
                Minutes
              </label>
              <input
                id="te-min"
                type="number"
                min={1}
                className="ctl"
                value={editData.min}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    t: {
                      ...prev.t,
                      ed: {
                        id: prev.t.ed!.id,
                        d: { ...prev.t.ed!.d, min: Number(e.target.value) || 0 },
                        e: { ...prev.t.ed!.e, min: "" },
                      },
                    },
                  }))
                }
              />
              {editErrors.min && <p className="er">{editErrors.min}</p>}
            </div>

            <div className="fg">
              <label className="lab" htmlFor="te-dep">
                Linked task
              </label>
              <select
                id="te-dep"
                className="ctl"
                value={editData.dep}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    t: {
                      ...prev.t,
                      ed: {
                        id: prev.t.ed!.id,
                        d: { ...prev.t.ed!.d, dep: e.target.value },
                        e: prev.t.ed!.e,
                      },
                    },
                  }))
                }
              >
                <option value="">None</option>
                {otherTasks.map((tk) => (
                  <option key={tk.id} value={tk.id}>
                    {tk.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fg grow">
            <div className="lr">
              <label className="lab" htmlFor="te-desc">
                Description
              </label>
              <button
                type="button"
                className="lk sm"
                onClick={async () => {
                  const standardized = await standardizeTaskWithAI(
                    {
                      id: "temp",
                      title: editData.title,
                      diff: editData.diff,
                      marks: editData.marks,
                      min: editData.min,
                      desc: editData.desc,
                      ref: editData.ref,
                    },
                    state.f
                  );
                  setState((prev) => ({
                    ...prev,
                    t: {
                      ...prev.t,
                      ed: {
                        id: prev.t.ed!.id,
                        d: { ...prev.t.ed!.d, desc: standardized.desc },
                        e: prev.t.ed!.e,
                      },
                    },
                  }));
                }}
              >
                Standardize with AI
              </button>
            </div>
            <textarea
              id="te-desc"
              className="ctl"
              value={editData.desc}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  t: {
                    ...prev.t,
                    ed: {
                      id: prev.t.ed!.id,
                      d: { ...prev.t.ed!.d, desc: e.target.value },
                      e: prev.t.ed!.e,
                    },
                  },
                }))
              }
            />
          </div>

          <div className="fg grow">
            <label className="lab" htmlFor="te-ref">
              Reference solution
            </label>
            <textarea
              id="te-ref"
              className="ctl mono"
              spellCheck={false}
              value={editData.ref}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  t: {
                    ...prev.t,
                    ed: {
                      id: prev.t.ed!.id,
                      d: { ...prev.t.ed!.d, ref: e.target.value },
                      e: prev.t.ed!.e,
                    },
                  },
                }))
              }
            />
          </div>
        </div>
      </>
    );
  }

  // 2. VIEW MODE
  if (!selectedInfo) {
    return (
      <>
        <div className="dh">
          <div className="dti">
            <h2 className="d-t" style={{ color: "var(--mut)", fontWeight: 500 }}>
              No task selected
            </h2>
          </div>
        </div>
        <p className="mut" style={{ margin: "6px 0 0", maxWidth: 380 }}>
          Select a task to read it here. Ask the architect in the chat to change generated tasks, or use Edit to change one yourself.
        </p>
      </>
    );
  }

  const { x, lab } = selectedInfo;
  const linkedTask = lab && x.dep ? t.tasks.find((y) => y.id === x.dep) : null;

  return (
    <>
      <div className="dh">
        <div className="dti">
          <h2 className="d-t">{x.title || "Untitled task"}</h2>
          <p className="mut" style={{ margin: "2px 0 0" }}>
            {x.diff} · {x.marks} {x.marks === 1 ? "mark" : "marks"} · {x.min} min ·{" "}
            {lab ? "In your tasks" : "Generated, not added yet"}
            {x.upd ? " · Updated" : ""}
          </p>
        </div>

        <div className="dact">
          <button type="button" className="lk" onClick={onClose}>
            Close
          </button>
          {!lab && (
            <button
              type="button"
              className="btn"
              onClick={() => onAddOne(x)}
            >
              Add to tasks
            </button>
          )}
          <button type="button" className="lk" onClick={handleStartEdit}>
            Edit
          </button>
          {lab && (
            <button
              type="button"
              className="lk rm"
              onClick={() => onDelete(x.id)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="db">
        <h4 className="h4">Description</h4>
        <div className="dtx md-rendered">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {x.desc || "No description provided"}
          </ReactMarkdown>
        </div>

        <h4 className="h4">Reference solution</h4>
        <DiffViewer diff={x.ref} />

        <h4 className="h4">Linked task</h4>
        <p style={{ margin: 0 }}>
          {linkedTask ? linkedTask.title : "None, this task is independent"}
        </p>

        <div className="lx">
          <button type="button" className="lk" onClick={() => handleStandardize(x)}>
            Standardize with AI
          </button>
          <button type="button" className="lk" onClick={() => handleEstimateDuration(x)}>
            Estimate duration
          </button>
        </div>
      </div>
    </>
  );
}
