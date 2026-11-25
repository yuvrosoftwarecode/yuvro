import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useWizard } from "./WizardContext";
import {
  generateCommandsWithAI,
  generateRulesWithAI,
  pushRulesToRepo,
} from "./adapters/scoringAdapter";
import { runVerificationStages } from "./adapters/verificationAdapter";
import { ScoringFileRule } from "./types";

export const ScoringStep: React.FC = () => {
  const { state, setState, tsum, tmin, canPublish, publishBlockReason } = useWizard();

  const [activeStageTab, setActiveStageTab] = useState<number>(0);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const [isGeneratingCmds, setIsGeneratingCmds] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [isPushingRules, setIsPushingRules] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Derived scoring status
  const hasCommands = Boolean(state.sc.startup.trim() && state.sc.test.trim());
  const hasRules = Boolean(
    state.sc.rules &&
      state.sc.rules.files &&
      Object.keys(state.sc.rules.files).length > 0
  );
  const isRulesOutOfDate = Boolean(state.sc.rulesOutOfDate);
  const isVerified = state.sc.ver.st === "passed" && Boolean(state.sc.ver.done[2]);
  const isPushed = Boolean(state.sc.pushed);

  // Guided single primary action calculation
  const guidedStep = useMemo<"commands" | "rules" | "verify" | "push" | "publish">(() => {
    if (!hasCommands) return "commands";
    if (!hasRules || isRulesOutOfDate) return "rules";
    if (!isVerified) return "verify";
    if (!isPushed) return "push";
    return "publish";
  }, [hasCommands, hasRules, isRulesOutOfDate, isVerified, isPushed]);

  // Handler: Change command inputs
  const handleStartupChange = (val: string) => {
    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        startup: val,
        pushed: null,
        ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
      },
    }));
  };

  const handleTestChange = (val: string) => {
    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        test: val,
        pushed: null,
        ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
      },
    }));
  };

  const handleAllowChange = (checked: boolean) => {
    setState((prev) => ({
      ...prev,
      sc: { ...prev.sc, allow: checked },
    }));
  };

  // Handler: Generate Lifecycle Commands with AI
  const handleGenerateCommands = async () => {
    setIsGeneratingCmds(true);
    try {
      const res = await generateCommandsWithAI(
        {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        state.t.tasks
      );
      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          startup: res.startup,
          test: res.test,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate lifecycle commands");
    } finally {
      setIsGeneratingCmds(false);
    }
  };

  // Handler: Generate Scoring Rules with AI
  const handleGenerateRules = async () => {
    setIsGeneratingRules(true);
    try {
      const res = await generateRulesWithAI(
        {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        state.t.tasks
      );

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          rules: {
            files: res.files,
            fileRules: res.fileRules,
            timestamp: res.timestamp,
          },
          test: res.test_command || prev.sc.test || "",
          rulesOutOfDate: false,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate scoring rules");
    } finally {
      setIsGeneratingRules(false);
    }
  };

  // Handler: Push Scoring Rules to Repository
  const handlePushRules = async () => {
    if (!state.sc.rules?.files) return;
    setIsPushingRules(true);
    try {
      const repoRef = state.f.repo || state.f.url;
      const res = await pushRulesToRepo({
        repoIdentifier: repoRef,
        branch: state.f.branch || "main",
        files: state.sc.rules.files,
      });

      if (res.success) {
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            pushed: timeStr,
          },
        }));
        toast.success("Scoring rules pushed to repository");
      } else {
        toast.error("Failed to push scoring rules to repository");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to push scoring rules to repository");
    } finally {
      setIsPushingRules(false);
    }
  };

  // Handler: Run Sandbox Verification
  const handleRunVerification = async () => {
    if (!hasRules || !state.sc.rules?.files) return;

    setIsVerifying(true);
    setActiveStageTab(0);

    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        ver: {
          st: "running",
          p: 0,
          done: {},
          log: ["", "", ""],
          statuses: ["", "", ""],
          run: prev.sc.ver.run + 1,
        },
      },
    }));

    try {
      const result = await runVerificationStages({
        repoUrl: state.f.url,
        branch: state.f.branch || "main",
        testCommand: state.sc.test || "",
        tasks: state.t.tasks,
        scoringFiles: state.sc.rules.files,
        totalMarks: Number(state.f.marks) || 10,
        onProgress: (stage, status, log) => {
          setActiveStageTab(stage);
          setState((prev) => {
            const nextDone = { ...prev.sc.ver.done, [stage]: true };
            const nextLogs = [...(prev.sc.ver.log || ["", "", ""])];
            nextLogs[stage] = log;
            const nextStatuses = [...(prev.sc.ver.statuses || ["", "", ""])];
            nextStatuses[stage] = status;
            return {
              ...prev,
              sc: {
                ...prev.sc,
                ver: {
                  ...prev.sc.ver,
                  p: stage,
                  done: nextDone,
                  log: nextLogs,
                  statuses: nextStatuses,
                },
              },
            };
          });
        },
      });

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          ver: {
            ...prev.sc.ver,
            st: result.success ? "passed" : "failed",
            p: 2,
            done: { 0: true, 1: true, 2: true },
            log: result.logs,
            statuses: result.statuses,
          },
        },
      }));

      if (!result.success) {
        toast.error("Verification failed on pass case or container testing");
      }
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          ver: {
            ...prev.sc.ver,
            st: "failed",
          },
        },
      }));
    } finally {
      setIsVerifying(false);
    }
  };

  // Toggle rule file expansion
  const toggleFileExpansion = (name: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // File rules list
  const fileRules: ScoringFileRule[] = state.sc.rules?.fileRules || [];

  // Stage details
  const stageTitles = [
    "Create temporary workspace",
    "Run fail case",
    "Run pass case",
  ];
  const stageDescs = [
    "Clones the starter repository into an isolated sandbox container and verifies file tree.",
    "Executes the automated test command against unmodified starter code. Expects 0 marks.",
    "Applies reference solutions for each task and re-executes tests. Expects full marks.",
  ];

  const currentStageStatus =
    state.sc.ver.statuses?.[activeStageTab] ||
    (state.sc.ver.done[activeStageTab]
      ? "Completed"
      : isVerifying && state.sc.ver.p === activeStageTab
      ? "Running…"
      : "Not run yet");

  const currentStageLog =
    state.sc.ver.log?.[activeStageTab] ||
    "Run verification to view container execution logs for this stage.";

  const marksMismatch = state.t.tasks.length > 0 && tsum !== Number(state.f.marks);

  return (
    <div style={{ display: "grid", gap: "36px" }}>
      {/* 1. Lifecycle Commands Section */}
      <section className="sec2">
        <div className="lr">
          <h3 style={{ margin: 0 }}>Lifecycle commands</h3>
          {guidedStep === "commands" ? (
            <button
              type="button"
              className="btn sm"
              onClick={handleGenerateCommands}
              disabled={isGeneratingCmds}
            >
              {isGeneratingCmds ? "Generating…" : "Generate with AI"}
            </button>
          ) : (
            <button
              type="button"
              className="lk sm"
              onClick={handleGenerateCommands}
              disabled={isGeneratingCmds}
            >
              {isGeneratingCmds ? "Generating…" : "Generate with AI"}
            </button>
          )}
        </div>
        <p className="sub">
          Commands executed in the candidate container for startup and automated test grading.
        </p>

        <div className="g21" style={{ marginTop: "16px" }}>
          <div className="fg">
            <label className="lab" htmlFor="sc-startup">
              Startup command
            </label>
            <input
              type="text"
              id="sc-startup"
              className="ctl"
              value={state.sc.startup}
              onChange={(e) => handleStartupChange(e.target.value)}
              placeholder="npm start or python main.py"
            />
          </div>

          <div className="fg">
            <label className="lab" htmlFor="sc-test">
              Test command
            </label>
            <input
              type="text"
              id="sc-test"
              className="ctl"
              value={state.sc.test}
              onChange={(e) => handleTestChange(e.target.value)}
              placeholder="npm test or pytest"
            />
          </div>
        </div>

        <label className="ck" style={{ marginTop: "16px" }}>
          <input
            type="checkbox"
            checked={state.sc.allow}
            onChange={(e) => handleAllowChange(e.target.checked)}
          />
          <span>
            Allow recruiters to choose individual tasks when assigning this lab in an evaluation
          </span>
        </label>
      </section>

      {/* 2. Scoring Rules Section */}
      <section className="sec2">
        <div className="lr">
          <h3 style={{ margin: 0 }}>Scoring rules</h3>
          <div className="acts">
            {!hasRules ? (
              guidedStep === "rules" ? (
                <button
                  type="button"
                  className="btn sm"
                  onClick={handleGenerateRules}
                  disabled={isGeneratingRules || !state.t.tasks.length}
                >
                  {isGeneratingRules ? "Generating…" : "Generate scoring rules"}
                </button>
              ) : (
                <button
                  type="button"
                  className="lk sm"
                  onClick={handleGenerateRules}
                  disabled={isGeneratingRules || !state.t.tasks.length}
                >
                  {isGeneratingRules ? "Generating…" : "Generate scoring rules"}
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  className={guidedStep === "rules" ? "btn sm" : "lk sm"}
                  onClick={handleGenerateRules}
                  disabled={isGeneratingRules}
                >
                  {isGeneratingRules ? "Regenerating…" : "Regenerate"}
                </button>

                {isPushed ? (
                  <span className="mut sm">Pushed at {state.sc.pushed}</span>
                ) : (
                  <button
                    type="button"
                    className={guidedStep === "push" ? "btn sm" : "lk sm"}
                    onClick={handlePushRules}
                    disabled={isPushingRules || !isVerified}
                  >
                    {isPushingRules ? "Pushing…" : "Push to repository"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="sub">
          Automated grading tests that evaluate candidate code against each task.
        </p>

        {isRulesOutOfDate && (
          <p style={{ color: "var(--red)", fontSize: "14px", marginTop: "8px" }}>
            Tasks have changed since rules were generated. Regenerate them before you publish.
          </p>
        )}

        {hasRules && (
          <>
            <div className="kv">
              <div>
                <dt>Repository</dt>
                <dd>{state.f.repo || state.f.url || "—"}</dd>
              </div>
              <div>
                <dt>Runner command</dt>
                <dd>{state.sc.test || "—"}</dd>
              </div>
            </div>

            <div className="rl2">
              {fileRules.map((file) => {
                const isExpanded = Boolean(expandedFiles[file.name]);
                return (
                  <div key={file.name} className="rr">
                    <button
                      type="button"
                      className="rrb"
                      onClick={() => toggleFileExpansion(file.name)}
                      aria-expanded={isExpanded}
                    >
                      <span className="rrn">
                        <b>{file.name}</b>
                        <span className="mut">{file.desc}</span>
                      </span>
                      <span className="mut sm">
                        {isExpanded ? "Hide checks" : `${file.checks.length} checks`}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="rrc">
                        {file.checks.map((chk, idx) => (
                          <p key={idx}>· {chk}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* 3. Verification Section */}
      <section className="sec2">
        <div className="lr">
          <h3 style={{ margin: 0 }}>Verification</h3>
          {guidedStep === "verify" ? (
            <button
              type="button"
              className="btn sm"
              onClick={handleRunVerification}
              disabled={isVerifying || !hasRules}
            >
              {isVerifying ? "Verifying…" : "Run full verification"}
            </button>
          ) : (
            <button
              type="button"
              className="lk sm"
              onClick={handleRunVerification}
              disabled={isVerifying || !hasRules}
            >
              {isVerifying
                ? "Verifying…"
                : state.sc.ver.st === "passed"
                ? "Run again"
                : "Run full verification"}
            </button>
          )}
        </div>
        <p className="sub">
          Spins up an isolated temporary workspace, verifies the fail case against unmodified starter code, and verifies the pass case with reference solutions.
        </p>

        {/* 3 Verification Tabs */}
        <div className="vtb" role="tablist">
          {stageTitles.map((title, idx) => {
            const isReached =
              idx === 0 ||
              Boolean(state.sc.ver.done[idx - 1]) ||
              state.sc.ver.p >= idx;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                className={`tbn${activeStageTab === idx ? " on" : ""}`}
                disabled={!isReached}
                onClick={() => setActiveStageTab(idx)}
              >
                {idx + 1} {title}
              </button>
            );
          })}
        </div>

        {/* Verification Stage Panel */}
        <div className="vp">
          <div className="vph">
            <div>
              <b>{stageTitles[activeStageTab]}</b>
              <p className="mut sm" style={{ margin: "2px 0 0" }}>
                {stageDescs[activeStageTab]}
              </p>
            </div>
            <span className="sm mut" style={{ whiteSpace: "nowrap" }}>
              {currentStageStatus}
            </span>
          </div>

          {/* Thin progress line while running */}
          {isVerifying && (
            <div
              style={{
                height: "2px",
                width: "100%",
                background: "var(--trk)",
                marginTop: "12px",
                overflow: "hidden",
                borderRadius: "1px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "50%",
                  background: "var(--pri)",
                  animation: "wizard-scan-indeterminate 1.5s infinite ease-in-out",
                }}
              />
            </div>
          )}

          {/* Monospace Output */}
          <pre
            className="dcode mono"
            style={{
              marginTop: "16px",
              maxHeight: "240px",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {currentStageLog}
          </pre>
        </div>
      </section>

      {/* 4. Review before publishing Section */}
      <section className="sec2">
        <h3 style={{ margin: 0 }}>Review before publishing</h3>
        <p className="sub">
          {state.type === "lab" || (state.type as any) === "LAB"
            ? "Engineering lab"
            : state.type === "design" || (state.type as any) === "SYSTEM_DESIGN"
            ? "System design"
            : "Knowledge assessment"}{" "}
          · {(state.f.difficulty || "Easy").toUpperCase()} · {tsum} marks · {tmin} min ·{" "}
          {state.f.title || "Untitled"}
        </p>

        <div className="rvg" style={{ marginTop: "20px" }}>
          {/* Column 1: Repository and commands */}
          <div className="rv">
            <span className="mut sm">Repository and commands</span>
            <p>
              <b>{state.f.repo || state.f.url || "No repository configured"}</b>
            </p>
            <p className="mut sm">Branch: {state.f.branch || "main"}</p>
            <p className="mut sm">
              Startup: {state.sc.startup || "None configured"}
            </p>
            <p className="mut sm">
              Test: {state.sc.test || "None configured"}
            </p>
          </div>

          {/* Column 2: Tasks */}
          <div className="rv">
            <span className="mut sm">Tasks</span>
            <p
              style={{
                color: marksMismatch ? "var(--red)" : "inherit",
                fontWeight: 500,
              }}
            >
              {state.t.tasks.length}{" "}
              {state.t.tasks.length === 1 ? "task" : "tasks"} · {tsum} of{" "}
              {state.f.marks} marks
            </p>
            {marksMismatch && (
              <p style={{ color: "var(--red)", fontSize: "13px" }}>
                Marks do not match total question marks
              </p>
            )}
            {state.t.tasks.map((task, idx) => (
              <p
                key={task.id}
                className="mut sm"
                style={{
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {idx + 1}. {task.title} ({task.marks}m)
              </p>
            ))}
          </div>

          {/* Column 3: Scoring */}
          <div className="rv">
            <span className="mut sm">Scoring</span>
            <p>
              Rules:{" "}
              {hasRules
                ? `${fileRules.length} files generated`
                : "Not generated"}
            </p>
            <p className="mut sm">
              Fail case: {state.sc.ver.statuses?.[1] || "Not verified"}
            </p>
            <p className="mut sm">
              Pass case: {state.sc.ver.statuses?.[2] || "Not verified"}
            </p>
            <p className="mut sm">
              Repository:{" "}
              {state.sc.pushed ? `Pushed (${state.sc.pushed})` : "Not pushed"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
