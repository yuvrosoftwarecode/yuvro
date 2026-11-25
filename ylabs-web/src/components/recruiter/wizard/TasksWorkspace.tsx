import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWizard } from "./WizardContext";
import { useRecruiterSidebar } from "@/lib/recruiterSidebarContext";
import { TopBar } from "./TopBar";
import { ChatColumn } from "./ChatColumn";
import { GeneratedPanel } from "./GeneratedPanel";
import { TasksPanel } from "./TasksPanel";
import { TaskDetail } from "./TaskDetail";
import { ColumnDivider } from "./ColumnDivider";
import { TaskItem, RunItem } from "./types";
import { chatArchitect, genUid } from "./adapters/architectAdapter";

interface TasksWorkspaceProps {
  onCancel?: () => void;
}

export const TasksWorkspace: React.FC<TasksWorkspaceProps> = ({ onCancel }) => {
  const { state, setState } = useWizard();
  const { setIsStep4Workspace } = useRecruiterSidebar();

  // Column split ratios (remembered in memory)
  const [sp, setSp] = useState({ a2: 0.6, a3: 0.34, b3: 0.24 });

  // Abort controller ref for in-flight generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set step 4 workspace mode on sidebar so normal sidebar hides and top-bar toggle opens drawer
  useEffect(() => {
    setIsStep4Workspace(true);
    return () => {
      setIsStep4Workspace(false);
    };
  }, [setIsStep4Workspace]);

  const t = state.t;
  const isDetailOpen = Boolean(t.sel || t.ed);

  // Divider drag handler
  const handleDividerDrag = useCallback(
    (index: 1 | 2, clientX: number, containerWidth: number) => {
      if (containerWidth <= 0) return;
      const ratio = clientX / containerWidth;

      setSp((prev) => {
        if (!isDetailOpen) {
          // 2-column mode: clamp a2 between 0.3 and 0.8
          const a2Clamped = Math.max(0.3, Math.min(0.8, ratio));
          return { ...prev, a2: a2Clamped };
        } else {
          // 3-column mode
          if (index === 1) {
            // Dragging left divider (chat width)
            const a3Clamped = Math.max(0.2, Math.min(0.6, ratio));
            return { ...prev, a3: a3Clamped };
          } else {
            // Dragging right divider (middle column width)
            const b3 = ratio - prev.a3;
            const b3Clamped = Math.max(0.15, Math.min(0.5, b3));
            return { ...prev, b3: b3Clamped };
          }
        }
      });
    },
    [isDetailOpen]
  );

  // Calculate dynamic gridTemplateColumns style
  const gridStyle = isDetailOpen
    ? `${sp.a3 * 100}% ${sp.b3 * 100}% ${(1 - sp.a3 - sp.b3) * 100}%`
    : `${sp.a2 * 100}% ${(1 - sp.a2) * 100}%`;

  // Task selection
  const handleSelectTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        sel: id,
        ed: null,
      },
    }));
  };

  // Close detail column
  const handleCloseDetail = () => {
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        sel: null,
        ed: null,
      },
    }));
  };

  // Manual Add task
  const handleAddNewTask = () => {
    const newId = genUid();
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        tab: "lab",
        sel: newId,
        ed: {
          id: newId,
          d: {
            title: "",
            diff: "Easy",
            marks: 5,
            min: 15,
            dep: "",
            desc: "",
            ref: "",
          },
          e: {},
        },
      },
    }));
  };

  // Add a single task to tasks tab
  const handleAddOne = (task: TaskItem) => {
    setState((prev) => {
      const alreadyIn = prev.t.tasks.some((x) => x.id === task.id);
      if (alreadyIn) return prev;
      return {
        ...prev,
        t: {
          ...prev.t,
          tasks: [...prev.t.tasks, task],
          tab: "lab",
          sel: task.id,
        },
        sc: {
          ...prev.sc,
          rules: null,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1 },
        },
      };
    });
  };

  // Add all tasks from a run to tasks tab
  const handleAddRun = (run: RunItem) => {
    setState((prev) => {
      const existingIds = new Set(prev.t.tasks.map((x) => x.id));
      const newItems = run.items.filter((x) => !existingIds.has(x.id));
      return {
        ...prev,
        t: {
          ...prev.t,
          tasks: [...prev.t.tasks, ...newItems],
          tab: "lab",
          sel: newItems[0]?.id || prev.t.sel,
        },
        sc: {
          ...prev.sc,
          rules: null,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1 },
        },
      };
    });
  };

  // Delete a task from lab tasks
  const handleDeleteTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        tasks: prev.t.tasks.filter((x) => x.id !== id),
        sel: prev.t.sel === id ? null : prev.t.sel,
        ed: prev.t.ed?.id === id ? null : prev.t.ed,
      },
      sc: {
        ...prev.sc,
        rules: null,
        pushed: null,
        ver: { ...prev.sc.ver, st: "idle", p: -1 },
      },
    }));
  };

  // Chat architect message sending
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || state.t.busy) return;

    abortControllerRef.current = new AbortController();

    // Append user message and set busy
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        busy: true,
        draft: "",
        msgs: [
          ...prev.t.msgs,
          { r: "u", t: text, snap: true },
        ],
      },
    }));

    try {
      const response = await chatArchitect({
        prompt: text,
        conversationHistory: state.t.msgs,
        repoUrl: state.f.url,
        branch: state.f.branch,
        indexedFiles: state.scan?.files || [],
        existingTasks: state.t.tasks,
        targetMarks: Number(state.f.marks) || 10,
        targetMinutes: Number(state.f.dur) || 30,
        labContext: {
          title: state.f.title,
          description: state.f.desc,
          domain: state.f.domain,
          difficulty: state.f.difficulty,
          scenario: state.f.scenario,
          git_repo_starter_url: state.f.url,
          git_repo_starter_branch: state.f.branch || "main",
          repo_tree: state.scan?.files || [],
          programming_languages: state.stack.lang,
          databases: state.stack.db,
          backend_frameworks: state.stack.be,
          frontend_frameworks: state.stack.fe,
        },
        signal: abortControllerRef.current.signal,
      });

      setState((prev) => {
        const nextMsgs = [
          ...prev.t.msgs,
          { r: "a" as const, t: response.replyText },
        ];

        let nextRuns = prev.t.runs;
        let nextSel = prev.t.sel;
        let nextTab = prev.t.tab;

        if (response.tasks && response.tasks.length > 0) {
          const runId = `run_${Date.now()}`;
          const newRun: RunItem = {
            id: runId,
            prompt: text,
            time: "Just now",
            v: prev.t.run + 1,
            items: response.tasks,
          };
          nextRuns = [...prev.t.runs, newRun];
          nextSel = response.tasks[0]?.id || nextSel;
          nextTab = "gen";
        }

        return {
          ...prev,
          t: {
            ...prev.t,
            busy: false,
            msgs: nextMsgs,
            runs: nextRuns,
            run: prev.t.run + (response.tasks?.length ? 1 : 0),
            sel: nextSel,
            tab: nextTab,
          },
        };
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setState((prev) => ({
          ...prev,
          t: {
            ...prev.t,
            busy: false,
            msgs: [
              ...prev.t.msgs,
              { r: "a", t: "Generation stopped.", muted: true },
            ],
          },
        }));
      } else {
        const errorMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Sorry, an error occurred while connecting to the AI task architect.";
        setState((prev) => ({
          ...prev,
          t: {
            ...prev.t,
            busy: false,
            msgs: [
              ...prev.t.msgs,
              {
                r: "a",
                t: errorMsg,
                muted: true,
              },
            ],
          },
        }));
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Stop message generation
  const handleStopMessage = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const gcount = t.runs.reduce((a, r) => a + r.items.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Top Bar with Sidebar Drawer Toggle, Step Switcher, Chat History, and Continue */}
      <TopBar onCancel={onCancel} />

      {/* 3-Column Resizable Grid Container */}
      <div
        className={`t4${isDetailOpen ? " d3" : ""}`}
        style={{ gridTemplateColumns: gridStyle, position: "relative" }}
      >
        {/* Column 1: Chat */}
        <ChatColumn
          onSendMessage={handleSendMessage}
          onStopMessage={handleStopMessage}
        />

        {/* Column 2: Middle Panel with Generated / Tasks Tabs */}
        <div className="tb2">
          <div className="colh tabs">
            <button
              type="button"
              className={`tbn${t.tab === "gen" ? " on" : ""}`}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  t: { ...prev.t, tab: "gen" },
                }))
              }
            >
              Generated ({gcount})
            </button>
            <button
              type="button"
              className={`tbn${t.tab === "lab" ? " on" : ""}`}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  t: { ...prev.t, tab: "lab" },
                }))
              }
            >
              Tasks ({t.tasks.length})
            </button>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="lk sm"
              onClick={handleAddNewTask}
            >
              Add task
            </button>
          </div>

          <div className="tbl" id="tbl">
            {t.tab === "gen" ? (
              <GeneratedPanel
                onSelectTask={handleSelectTask}
                onAddOne={handleAddOne}
                onAddRun={handleAddRun}
              />
            ) : (
              <TasksPanel
                onSelectTask={handleSelectTask}
                onNewTask={handleAddNewTask}
              />
            )}
          </div>
        </div>

        {/* Column 3: Task Detail */}
        <div className={`td${isDetailOpen ? "" : " closed"}`}>
          {isDetailOpen && (
            <TaskDetail
              onClose={handleCloseDetail}
              onAddOne={handleAddOne}
              onDelete={handleDeleteTask}
            />
          )}
        </div>

        {/* Divider 1: Between Chat and Middle Panel */}
        <ColumnDivider
          dividerIndex={1}
          leftRatio={isDetailOpen ? sp.a3 : sp.a2}
          onDrag={handleDividerDrag}
        />

        {/* Divider 2: Between Middle Panel and Detail Column (only if open) */}
        {isDetailOpen && (
          <ColumnDivider
            dividerIndex={2}
            leftRatio={sp.a3 + sp.b3}
            onDrag={handleDividerDrag}
          />
        )}
      </div>
    </div>
  );
};
