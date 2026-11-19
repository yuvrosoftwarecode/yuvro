import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  labTaskAIService,
  type LabContext,
  type InspectRepoResponse,
  type ScoringRulesResponse,
  type TempWorkspaceCreateResponse,
  type TempScoringRunResponse,
  type PassSolutionResponse,
} from "@/services/labTaskAIService";

interface LabScoringLiveTestStepProps {
  labFormData: any;
  repoInspection: InspectRepoResponse | null;
  onRepoInspected: (info: InspectRepoResponse) => void;
  getLabContext: () => LabContext;
  scoringRules: ScoringRulesResponse | null;
  onScoringRulesChange: (rules: ScoringRulesResponse | null) => void;
  onApplyStartupCommand?: (cmd: string) => void;
  onApplyTestCommand: (cmd: string) => void;
  onApplySolution?: (solutionFiles: Record<string, string>) => void;
  onToggleTaskSelection?: (allow: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
  editingId: string | null;
}

export function LabScoringLiveTestStep({
  labFormData,
  repoInspection,
  onRepoInspected,
  getLabContext,
  scoringRules,
  onScoringRulesChange,
  onApplyStartupCommand,
  onApplyTestCommand,
  onApplySolution,
  onToggleTaskSelection,
  onSave,
  isSaving,
  canSave,
  editingId,
}: LabScoringLiveTestStepProps) {
  const [activeRuleFile, setActiveRuleFile] = useState<string>("");
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [isPushingRules, setIsPushingRules] = useState(false);
  const [isGeneratingLifecycle, setIsGeneratingLifecycle] = useState(false);
  const [pushResult, setPushResult] = useState<{ sha: string; url: string; branch: string } | null>(null);

  const handleGenerateLifecycleCommands = async () => {
    setIsGeneratingLifecycle(true);
    try {
      const context = getLabContext();
      let startupCmd = "";
      let testCmd = "";

      try {
        const res = await labTaskAIService.generateLifecycleCommands(context, tasks, "deepseek");
        if (res?.startup_command || res?.test_command) {
          startupCmd = res.startup_command || "";
          testCmd = res.test_command || "";
        }
      } catch (backendErr) {
        console.warn("AI lifecycle commands endpoint unreachable, falling back to smart heuristic deduction:", backendErr);
      }

      if (!startupCmd || !testCmd) {
        const langs = (labFormData.programming_languages || []).map((l: string) => l.toLowerCase());
        const beFrameworks = (labFormData.backend_frameworks || []).map((f: string) => f.toLowerCase());
        const feFrameworks = (labFormData.frontend_frameworks || []).map((f: string) => f.toLowerCase());
        const repoStr = (labFormData.git_repo_starter_url || "").toLowerCase();

        const isDjango = beFrameworks.some((f: string) => f.includes("django")) || repoStr.includes("django");
        const isFastAPI = beFrameworks.some((f: string) => f.includes("fastapi")) || repoStr.includes("fastapi");
        const isFlask = beFrameworks.some((f: string) => f.includes("flask")) || repoStr.includes("flask");
        const isSpringBoot = beFrameworks.some((f: string) => f.includes("spring")) || repoStr.includes("spring");
        const isNode = beFrameworks.some((f: string) => f.includes("node") || f.includes("express") || f.includes("nest")) ||
          langs.some((l: string) => l.includes("javascript") || l.includes("typescript")) ||
          feFrameworks.length > 0 || repoStr.includes("node") || repoStr.includes("express");
        const isGo = langs.some((l: string) => l.includes("go") || l === "golang") || repoStr.includes("go");
        const isPython = langs.some((l: string) => l.includes("python")) || repoStr.includes("python");

        if (isDjango) {
          if (!startupCmd) startupCmd = "python manage.py runserver 0.0.0.0:8000";
          if (!testCmd) testCmd = "python yuvro_scoring_rules/main_test.py";
        } else if (isFastAPI) {
          if (!startupCmd) startupCmd = "uvicorn main:app --host 0.0.0.0 --port 8000 --reload";
          if (!testCmd) testCmd = "python yuvro_scoring_rules/main_test.py";
        } else if (isFlask) {
          if (!startupCmd) startupCmd = "python app.py";
          if (!testCmd) testCmd = "python yuvro_scoring_rules/main_test.py";
        } else if (isSpringBoot) {
          if (!startupCmd) startupCmd = "./mvnw spring-boot:run";
          if (!testCmd) testCmd = "mvn test";
        } else if (isGo) {
          if (!startupCmd) startupCmd = "go run main.go";
          if (!testCmd) testCmd = "go test ./...";
        } else if (isNode) {
          if (!startupCmd) startupCmd = "npm start";
          if (!testCmd) testCmd = "node yuvro_scoring_rules/main_test.js";
        } else if (isPython) {
          if (!startupCmd) startupCmd = "python main.py";
          if (!testCmd) testCmd = "python yuvro_scoring_rules/main_test.py";
        } else {
          if (!startupCmd) startupCmd = "npm start";
          if (!testCmd) testCmd = "python yuvro_scoring_rules/main_test.py";
        }
      }

      if (startupCmd && onApplyStartupCommand) {
        onApplyStartupCommand(startupCmd);
      }
      if (testCmd) {
        onApplyTestCommand(testCmd);
      }
      toast.success("Lifecycle commands generated");
    } catch (err: any) {
      console.error("Failed to generate lifecycle commands", err);
      toast.error(err?.message || "Failed to generate lifecycle commands.");
    } finally {
      setIsGeneratingLifecycle(false);
    }
  };

  // Temp Workspace & Live Testing State
  const [tempWorkspace, setTempWorkspace] = useState<TempWorkspaceCreateResponse | null>(null);
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [isRunningFail, setIsRunningFail] = useState(false);
  const [isRunningPass, setIsRunningPass] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairFeedback, setRepairFeedback] = useState("");
  const [repairDiagnosis, setRepairDiagnosis] = useState<string | null>(null);

  const [failResult, setFailResult] = useState<TempScoringRunResponse | null>(null);
  const [passResult, setPassResult] = useState<TempScoringRunResponse | null>(null);
  const [passSolution, setPassSolution] = useState<PassSolutionResponse | null>(() => {
    if (labFormData?.solution && typeof labFormData.solution === "object" && Object.keys(labFormData.solution).length > 0) {
      return {
        summary: "Loaded reference solution files.",
        solution_files: labFormData.solution,
      };
    }
    return null;
  });
  const [activeSolutionFile, setActiveSolutionFile] = useState<string>("");

  const [inspectorTab, setInspectorTab] = useState<"fail" | "pass" | "solution" | "workspace">("fail");

  const tempWsIdRef = useRef<string | null>(null);
  useEffect(() => {
    tempWsIdRef.current = tempWorkspace?.temp_workspace_id || null;
  }, [tempWorkspace]);

  // Clean up temp workspace on unmount
  useEffect(() => {
    return () => {
      if (tempWsIdRef.current) {
        labTaskAIService.deleteTempWorkspace(tempWsIdRef.current);
      }
    };
  }, []);

  const repoFullName = useMemo(() => {
    const url = labFormData.git_repo_starter_url || "";
    if (!url) return "";
    return url
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
  }, [labFormData.git_repo_starter_url]);

  const branchName = labFormData.git_repo_starter_branch || "main";
  const tasks: any[] = labFormData.tasks || [];

  const ruleFileNames = useMemo(() => {
    if (!scoringRules?.files) return [];
    return Object.keys(scoringRules.files);
  }, [scoringRules]);

  useEffect(() => {
    if (ruleFileNames.length > 0 && (!activeRuleFile || !scoringRules?.files[activeRuleFile])) {
      const preferred = ruleFileNames.find((f) => f.includes("main_test")) || ruleFileNames[0];
      setActiveRuleFile(preferred);
    }
  }, [ruleFileNames, activeRuleFile, scoringRules]);

  const effectiveTestCommand =
    labFormData.test_command ||
    scoringRules?.test_command ||
    scoringRules?.runner_command ||
    "python yuvro_scoring_rules/main_test.py";

  const bestRepoFiles = useMemo(() => {
    return tempWorkspace?.key_files || repoInspection?.key_files || {};
  }, [tempWorkspace, repoInspection]);

  // 1. Generate Scoring Rules
  const handleGenerateRules = async (repoFilesOverride?: Record<string, string>) => {
    if (tasks.length === 0) {
      toast.error("Please add at least one task in Step 4 before generating scoring rules.");
      return null;
    }

    setIsGeneratingRules(true);
    setPushResult(null);
    setRepairDiagnosis(null);
    try {
      const ctx = getLabContext();
      const repoFilesToUse = repoFilesOverride || bestRepoFiles;
      const res = await labTaskAIService.generateScoringRules(ctx, tasks, repoFilesToUse, "deepseek");
      onScoringRulesChange(res);
      const cmd = res.test_command || res.runner_command;
      if (cmd) {
        onApplyTestCommand(cmd);
      }
      const names = Object.keys(res.files || {});
      if (names.length > 0) {
        setActiveRuleFile(names.find((f) => f.includes("main_test")) || names[0]);
      }

      // Automatically synthesize matching reference solution diff for pass case
      let passSol: PassSolutionResponse | null = null;
      try {
        passSol = await labTaskAIService.generatePassSolution({
          lab_context: ctx,
          tasks,
          scoring_files: res.files,
          repo_files: repoFilesToUse,
          provider: "deepseek",
        });
        setPassSolution(passSol);
        if (onApplySolution && passSol.solution_files) {
          onApplySolution(passSol.solution_files);
        }
        const solNames = Object.keys(passSol.solution_files || {});
        if (solNames.length > 0) {
          setActiveSolutionFile(solNames[0]);
        }
        toast.success(`Scoring rules & solution diff created (${solNames.length} solution files)`);
      } catch (solErr) {
        console.warn("Pass solution generation alongside scoring rules failed:", solErr);
        toast.success("Scoring rules generated. You can generate or customize the solution diff in the tab below.");
      }

      return res;
    } catch (err: any) {
      console.error("Failed to generate scoring rules", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to generate scoring rules.");
      return null;
    } finally {
      setIsGeneratingRules(false);
    }
  };

  const handleRuleContentChange = (content: string) => {
    if (!scoringRules || !activeRuleFile) return;
    onScoringRulesChange({
      ...scoringRules,
      files: {
        ...scoringRules.files,
        [activeRuleFile]: content,
      },
    });
  };

  const handleCopyActiveFile = () => {
    if (!scoringRules || !activeRuleFile) return;
    navigator.clipboard.writeText(scoringRules.files[activeRuleFile] || "");
    toast.success(`Copied ${activeRuleFile}`);
  };

  // 2. Push Scoring Rules to GitHub
  const handlePushToRepo = async () => {
    if (!repoFullName) {
      toast.error("No GitHub repository configured in Step 2.");
      return;
    }
    if (!scoringRules?.files || Object.keys(scoringRules.files).length === 0) {
      toast.error("Generate scoring rules first before pushing.");
      return;
    }

    setIsPushingRules(true);
    try {
      const res = await labTaskAIService.pushScoringRules({
        repo_identifier: repoFullName,
        branch: branchName,
        files: scoringRules.files,
        installation_id: labFormData.github_app_installation,
        commit_message: `feat(eval): add yuvro scoring rules for ${labFormData.title || "engineering lab"}`,
      });
      setPushResult({
        sha: res.commit_sha,
        url: res.commit_url,
        branch: res.branch || branchName,
      });
      if (effectiveTestCommand) {
        onApplyTestCommand(effectiveTestCommand);
      }
      toast.success(`Scoring rules pushed to ${repoFullName} (${res.branch || branchName})`);
    } catch (err: any) {
      console.error("Failed to push scoring rules", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to push scoring rules to GitHub.");
    } finally {
      setIsPushingRules(false);
    }
  };

  // 3. Create Temporary Verification Workspace
  const handleCreateTempWorkspace = async (
    rulesOverride?: ScoringRulesResponse | null
  ): Promise<TempWorkspaceCreateResponse | null> => {
    setIsCreatingWs(true);
    setFailResult(null);
    setPassResult(null);
    try {
      // Clean up previous temp workspace if recreating
      if (tempWorkspace?.temp_workspace_id) {
        await labTaskAIService.deleteTempWorkspace(tempWorkspace.temp_workspace_id);
        setTempWorkspace(null);
      }

      let authToken: string | undefined;
      if (repoFullName) {
        try {
          const inspected = await labTaskAIService.inspectRepo({
            repo_identifier: repoFullName,
            branch: branchName,
            installation_id: labFormData.github_app_installation,
            include_clone_token: true,
          });
          authToken = inspected.clone_token;
          onRepoInspected(inspected);
        } catch (inspectErr) {
          console.warn("Repo inspection before temp clone failed; attempting direct clone:", inspectErr);
        }
      }

      const activeRules = rulesOverride || scoringRules;
      const ws = await labTaskAIService.createTempWorkspace({
        repo_url: labFormData.git_repo_starter_url || undefined,
        branch: branchName,
        auth_token: authToken,
        scoring_files: activeRules?.files || {},
        setup_command: labFormData.startup_command || undefined,
      });

      setTempWorkspace(ws);
      setInspectorTab("workspace");
      toast.success(`Temp workspace created (${ws.file_count} files ready)`);
      return ws;
    } catch (err: any) {
      console.error("Temp workspace creation failed", err);
      toast.error(err?.message || "Failed to create temporary workspace.");
      return null;
    } finally {
      setIsCreatingWs(false);
    }
  };

  // 4. Run Fail Case (unmodified starter repo)
  const handleRunFailCase = async (
    wsOverride?: TempWorkspaceCreateResponse | null,
    rulesOverride?: ScoringRulesResponse | null
  ): Promise<TempScoringRunResponse | null> => {
    const ws = wsOverride || tempWorkspace;
    const rules = rulesOverride || scoringRules;
    if (!ws) {
      toast.error("Create a temporary workspace first.");
      return null;
    }
    if (!rules?.files || Object.keys(rules.files).length === 0) {
      toast.error("Generate scoring rules first.");
      return null;
    }

    const cmd =
      labFormData.test_command ||
      rules.test_command ||
      rules.runner_command ||
      "python yuvro_scoring_rules/main_test.py";

    setIsRunningFail(true);
    try {
      const res = await labTaskAIService.runTempScoring({
        temp_workspace_id: ws.temp_workspace_id,
        test_command: cmd,
        scoring_files: rules.files,
        mode: "fail_case",
        restore_after: true,
      });
      setFailResult(res);
      setInspectorTab("fail");
      if (res.verified) {
        toast.success("Fail case verified: starter code fails as expected");
      } else {
        toast.warning(res.verdict_reason || "Fail case needs review");
      }
      return res;
    } catch (err: any) {
      console.error("Fail case run error", err);
      toast.error(err?.message || "Failed to execute fail case.");
      return null;
    } finally {
      setIsRunningFail(false);
    }
  };

  // 5. Generate Reference Solution & Run Pass Case
  const handleRunPassCase = async (
    wsOverride?: TempWorkspaceCreateResponse | null,
    rulesOverride?: ScoringRulesResponse | null,
    forceRegenerateSolution: boolean = false
  ): Promise<TempScoringRunResponse | null> => {
    const ws = wsOverride || tempWorkspace;
    const rules = rulesOverride || scoringRules;
    if (!ws) {
      toast.error("Create a temporary workspace first.");
      return null;
    }
    if (!rules?.files || Object.keys(rules.files).length === 0) {
      toast.error("Generate scoring rules first.");
      return null;
    }

    const cmd =
      labFormData.test_command ||
      rules.test_command ||
      rules.runner_command ||
      "python yuvro_scoring_rules/main_test.py";

    setIsRunningPass(true);
    try {
      let solutionToUse = forceRegenerateSolution ? null : passSolution;
      if (!solutionToUse || Object.keys(solutionToUse.solution_files || {}).length === 0) {
        const gen = await labTaskAIService.generatePassSolution({
          lab_context: getLabContext(),
          tasks,
          scoring_files: rules.files,
          repo_files: ws.key_files || bestRepoFiles,
          provider: "deepseek",
        });
        solutionToUse = gen;
        setPassSolution(gen);
        const solNames = Object.keys(gen.solution_files || {});
        if (solNames.length > 0) setActiveSolutionFile(solNames[0]);
      }

      const res = await labTaskAIService.runTempScoring({
        temp_workspace_id: ws.temp_workspace_id,
        test_command: cmd,
        scoring_files: rules.files,
        mode: "pass_case",
        solution_files: solutionToUse.solution_files,
        restore_after: true,
      });
      setPassResult(res);
      setInspectorTab("pass");
      if (res.verified) {
        toast.success(`Pass case verified: ${res.total_score}/${res.max_possible_score} passed!`);
      } else {
        toast.warning(res.verdict_reason || "Pass case did not pass all tasks");
      }
      return res;
    } catch (err: any) {
      console.error("Pass case run error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to run pass case.");
      return null;
    } finally {
      setIsRunningPass(false);
    }
  };

  // One-Click Full Verification Pipeline
  const handleRunFullVerification = async () => {
    if (tasks.length === 0) {
      toast.error("Add at least one task in Step 4 first.");
      return;
    }
    setIsRunningAll(true);
    try {
      let ws = tempWorkspace;
      if (!ws) {
        ws = await handleCreateTempWorkspace(scoringRules);
        if (!ws) return;
      }

      let rules = scoringRules;
      if (!rules?.files || Object.keys(rules.files).length === 0) {
        rules = await handleGenerateRules(ws.key_files);
        if (!rules) return;
      }

      await handleRunFailCase(ws, rules);
      await handleRunPassCase(ws, rules, true);
    } finally {
      setIsRunningAll(false);
    }
  };

  // Auto-Repair Scoring Rules using live execution logs
  const handleRepairScoringRules = async () => {
    if (!scoringRules?.files) return;
    setIsRepairing(true);
    try {
      const repaired = await labTaskAIService.repairScoringRules({
        lab_context: getLabContext(),
        tasks,
        scoring_files: scoringRules.files,
        repo_files: tempWorkspace?.key_files || bestRepoFiles,
        fail_case_output: failResult,
        pass_case_output: passResult,
        feedback: repairFeedback,
        provider: "deepseek",
      });
      onScoringRulesChange(repaired);
      if (repaired.test_command || repaired.runner_command) {
        onApplyTestCommand(repaired.test_command || repaired.runner_command || "");
      }
      setRepairDiagnosis(repaired.diagnosis || "Scoring rules updated.");
      setRepairFeedback("");

      // Concurrently re-synthesize matching reference solution diff for repaired rules
      try {
        const passSol = await labTaskAIService.generatePassSolution({
          lab_context: getLabContext(),
          tasks,
          scoring_files: repaired.files,
          repo_files: tempWorkspace?.key_files || bestRepoFiles,
          provider: "deepseek",
        });
        setPassSolution(passSol);
        if (onApplySolution && passSol.solution_files) {
          onApplySolution(passSol.solution_files);
        }
        const solNames = Object.keys(passSol.solution_files || {});
        if (solNames.length > 0) setActiveSolutionFile(solNames[0]);
      } catch {
        // keep prior solution
      }

      toast.success("Scoring rules repaired — re-run Fail & Pass cases to verify");
    } catch (err: any) {
      console.error("Repair failed", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to repair scoring rules.");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleDestroyWorkspace = async () => {
    if (!tempWorkspace) return;
    const id = tempWorkspace.temp_workspace_id;
    await labTaskAIService.deleteTempWorkspace(id);
    setTempWorkspace(null);
    setFailResult(null);
    setPassResult(null);
    setPassSolution(null);
    toast.success("Temporary workspace destroyed");
  };

  const handleResetWorkspace = async () => {
    if (!tempWorkspace) return;
    try {
      await labTaskAIService.resetTempWorkspace(tempWorkspace.temp_workspace_id);
      toast.success("Temporary workspace reset to pristine starter code");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset workspace.");
    }
  };

  // Build per-task verification matrix rows
  const matrixRows = useMemo(() => {
    const failTasks = failResult?.data?.tasks || {};
    const passTasks = passResult?.data?.tasks || {};

    const keys = new Set<string>([
      ...tasks.map((_, i) => `task${i + 1}`),
      ...Object.keys(failTasks),
      ...Object.keys(passTasks),
    ]);

    return Array.from(keys).map((key, idx) => {
      const taskObj = tasks[idx];
      const fEntry = failTasks[key];
      const pEntry = passTasks[key];
      const failOk = fEntry ? String(fEntry.result).toLowerCase() === "failed" : null;
      const passOk = pEntry ? String(pEntry.result).toLowerCase() === "passed" : null;

      return {
        key,
        title: taskObj?.title || key,
        marks: taskObj?.marks ?? pEntry?.score ?? 0,
        failEntry: fEntry || null,
        passEntry: pEntry || null,
        failOk,
        passOk,
        bothVerified: failOk === true && passOk === true,
      };
    });
  }, [tasks, failResult, passResult]);

  const needsRepair =
    Boolean(scoringRules) &&
    ((failResult && !failResult.verified) || (passResult && !passResult.verified));

  const solutionFileNames = useMemo(
    () => Object.keys(passSolution?.solution_files || {}),
    [passSolution]
  );

  const busy =
    isGeneratingRules ||
    isCreatingWs ||
    isRunningFail ||
    isRunningPass ||
    isRunningAll ||
    isRepairing ||
    isGeneratingLifecycle;

  return (
    <div className="space-y-6">
      {/* ================================================================================= */}
      {/* SECTION 1: LIFECYCLE COMMANDS                                                     */}
      {/* ================================================================================= */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-base font-medium text-foreground">Lifecycle Commands</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Commands executed in the candidate container for startup and automated test grading.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateLifecycleCommands}
            disabled={isGeneratingLifecycle || busy}
            className="h-9 px-3.5 text-xs border-border bg-background text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            {isGeneratingLifecycle ? "Generating commands…" : "Generate lifecycle commands"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Startup Command</label>
            <input
              value={labFormData.startup_command || ""}
              onChange={(e) => onApplyStartupCommand?.(e.target.value)}
              placeholder="npm start or python main.py"
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Test Command</label>
            <input
              value={labFormData.test_command || ""}
              onChange={(e) => onApplyTestCommand(e.target.value)}
              placeholder="python yuvro_scoring_rules/main_test.py"
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <input
            type="checkbox"
            id="allow_task_selection_cb_step5"
            checked={labFormData.allow_task_selection !== false}
            onChange={(e) => onToggleTaskSelection?.(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="allow_task_selection_cb_step5" className="text-sm text-foreground cursor-pointer">
            Allow recruiters to select individual tasks when assigning this lab in an evaluation
          </label>
        </div>
      </div>

      {/* ================================================================================= */}
      {/* SECTION 2: SCORING RULES SYNTHESIS & EDITOR                                       */}
      {/* ================================================================================= */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-base font-medium text-foreground">
              Yuvro Scoring Rules
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate automated grading scripts (`yuvro_scoring_rules/`), test them live in a temporary sandbox, and push to your repository.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => handleGenerateRules()}
              disabled={busy || tasks.length === 0}
              className="rec-btn h-9 px-3.5 text-xs"
            >
              {isGeneratingRules
                ? "Generating rules…"
                : scoringRules
                ? "Regenerate rules"
                : "Generate scoring rules"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePushToRepo}
              disabled={isPushingRules || !scoringRules || !repoFullName}
              className="h-9 px-3.5 text-xs border-border bg-background text-foreground hover:bg-muted cursor-pointer"
            >
              {isPushingRules ? "Pushing…" : "Push to repository"}
            </Button>
          </div>
        </div>

        {/* Target Repo & Runner Test Command */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Repository</span>
            {repoFullName ? (
              <span className="font-mono font-medium text-foreground truncate">
                {repoFullName} ({branchName})
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                Not configured (set in Step 2)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <span className="text-muted-foreground shrink-0">Runner command</span>
            <span className="font-mono text-xs text-foreground truncate">
              {effectiveTestCommand}
            </span>
          </div>
        </div>

        {/* Push Confirmation */}
        {pushResult && (
          <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="text-foreground font-medium">
              Pushed `yuvro_scoring_rules/` to branch `{pushResult.branch}` · commit{" "}
              <span className="font-mono">{pushResult.sha.slice(0, 10)}</span>
            </span>
            {pushResult.url && (
              <a
                href={pushResult.url}
                target="_blank"
                rel="noreferrer"
                className="qb-action text-xs text-foreground"
              >
                View commit on GitHub →
              </a>
            )}
          </div>
        )}

        {/* Repair Diagnosis Banner */}
        {repairDiagnosis && (
          <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground">
            <span className="font-medium">AI Repair Applied: </span>
            <span className="text-muted-foreground">{repairDiagnosis}</span>
          </div>
        )}

        {/* Code Viewer / Editor Tabs */}
        {scoringRules && ruleFileNames.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1.5">
              <div className="flex flex-wrap gap-1">
                {ruleFileNames.map((fname) => {
                  const shortName = fname.replace(/^yuvro_scoring_rules\//, "");
                  const isActive = activeRuleFile === fname;
                  return (
                    <button
                      key={fname}
                      type="button"
                      onClick={() => setActiveRuleFile(fname)}
                      className={`px-2.5 py-1 text-xs rounded font-mono transition cursor-pointer ${
                        isActive
                          ? "bg-foreground/10 text-foreground font-medium border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {shortName}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleCopyActiveFile}
                className="qb-action text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Copy file
              </button>
            </div>
            <textarea
              rows={12}
              value={scoringRules.files[activeRuleFile] || ""}
              onChange={(e) => handleRuleContentChange(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No scoring rules generated yet</p>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Click <strong>Generate scoring rules</strong> or run <strong>Full Verification</strong> below to synthesize
              executable evaluation scripts in <code className="font-mono">yuvro_scoring_rules/</code> and verify them
              live against your starter repository.
            </p>
          </div>
        )}
      </div>

      {/* ================================================================================= */}
      {/* SECTION 2: LIVE TEMP WORKSPACE & FAIL/PASS VERIFICATION SANDBOX                   */}
      {/* ================================================================================= */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-base font-medium text-foreground">
              Live Sandbox Verification
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Spins up an isolated temporary workspace from the starter repo, verifies the <strong>Fail Case</strong> (unmodified starter code), and verifies the <strong>Pass Case</strong> (reference solution).
            </p>
          </div>
          <Button
            type="button"
            onClick={handleRunFullVerification}
            disabled={busy || tasks.length === 0}
            className="rec-btn h-9 px-4 text-xs"
          >
            {isRunningAll ? "Running full verification…" : "Run full verification"}
          </Button>
        </div>

        {/* Granular Step Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => handleCreateTempWorkspace()}
            className="h-8 px-3 text-xs border-border bg-background hover:bg-muted cursor-pointer"
          >
            {isCreatingWs
              ? "Creating workspace…"
              : tempWorkspace
              ? "1. Recreate temp workspace"
              : "1. Create temp workspace"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !tempWorkspace || !scoringRules}
            onClick={() => handleRunFailCase()}
            className="h-8 px-3 text-xs border-border bg-background hover:bg-muted cursor-pointer"
          >
            {isRunningFail ? "Running fail case…" : "2. Run fail case"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !tempWorkspace || !scoringRules}
            onClick={() => handleRunPassCase(null, null, false)}
            className="h-8 px-3 text-xs border-border bg-background hover:bg-muted cursor-pointer"
          >
            {isRunningPass ? "Running pass case…" : "3. Run pass case"}
          </Button>
          {passSolution && (
            <button
              type="button"
              disabled={busy || !tempWorkspace || !scoringRules}
              onClick={() => handleRunPassCase(null, null, true)}
              className="qb-action text-xs text-muted-foreground hover:text-foreground ml-1 disabled:opacity-50 cursor-pointer"
            >
              Regenerate pass solution
            </button>
          )}
          {tempWorkspace && (
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={handleResetWorkspace}
                className="qb-action text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Reset workspace
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDestroyWorkspace}
                className="qb-action text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              >
                Destroy workspace
              </button>
            </div>
          )}
        </div>

        {/* 3-Stage Live Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Stage 1: Temp Workspace */}
          <div className="rounded-lg border border-border bg-background p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">1. Temp Workspace</span>
              <span
                className={`text-[11px] font-medium ${
                  tempWorkspace
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isCreatingWs
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {isCreatingWs ? "Creating…" : tempWorkspace ? "Ready" : "Not created"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {tempWorkspace ? (
                <>
                  ID: <span className="font-mono text-foreground">{tempWorkspace.temp_workspace_id}</span>
                  <div>{tempWorkspace.file_count} starter files cloned</div>
                </>
              ) : (
                "Clones starter repo into an isolated sandbox directory."
              )}
            </div>
          </div>

          {/* Stage 2: Fail Case */}
          <div className="rounded-lg border border-border bg-background p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">2. Fail Case (Starter)</span>
              <span
                className={`text-[11px] font-medium ${
                  isRunningFail
                    ? "text-amber-600 dark:text-amber-400"
                    : failResult
                    ? failResult.verified
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {isRunningFail
                  ? "Running…"
                  : failResult
                  ? failResult.verified
                    ? `Verified (${failResult.total_score}/${failResult.max_possible_score})`
                    : `Needs review (${failResult.total_score}/${failResult.max_possible_score})`
                  : "Not run"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {failResult ? (
                <>
                  <div>{failResult.verdict_reason}</div>
                  <div className="text-[11px] mt-1 font-mono">
                    exit {failResult.exit_code} · {failResult.duration_ms}ms · JSON{" "}
                    {failResult.valid_json ? "valid" : "invalid"}
                  </div>
                </>
              ) : (
                "Runs tests on unmodified starter code. Expects 0 score & valid JSON."
              )}
            </div>
          </div>

          {/* Stage 3: Pass Case */}
          <div className="rounded-lg border border-border bg-background p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">3. Pass Case (Solution)</span>
              <span
                className={`text-[11px] font-medium ${
                  isRunningPass
                    ? "text-amber-600 dark:text-amber-400"
                    : passResult
                    ? passResult.verified
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {isRunningPass
                  ? "Generating & running…"
                  : passResult
                  ? passResult.verified
                    ? `Verified (${passResult.total_score}/${passResult.max_possible_score})`
                    : `Failed (${passResult.total_score}/${passResult.max_possible_score})`
                  : "Not run"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {passResult ? (
                <>
                  <div>{passResult.verdict_reason}</div>
                  <div className="text-[11px] mt-1 font-mono">
                    exit {passResult.exit_code} · {passResult.duration_ms}ms ·{" "}
                    {passResult.applied_files.length} file(s) patched
                  </div>
                </>
              ) : (
                "Applies reference solution patches in sandbox. Expects 100% pass."
              )}
            </div>
          </div>
        </div>

        {/* Per-Task Verification Matrix */}
        {(failResult || passResult) && matrixRows.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground">
              Per-Task Verification Breakdown
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium">Marks</th>
                    <th className="px-3 py-2 font-medium">Fail Case (Expect: Failed)</th>
                    <th className="px-3 py-2 font-medium">Pass Case (Expect: Passed)</th>
                    <th className="px-3 py-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {matrixRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <div>{row.title}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{row.key}</div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.marks}</td>
                      <td className="px-3 py-2.5">
                        {row.failEntry ? (
                          <div>
                            <span
                              className={`font-medium ${
                                row.failOk
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive"
                              }`}
                            >
                              {row.failEntry.result} ({row.failEntry.score})
                            </span>
                            {row.failEntry.message && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                                {row.failEntry.message}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.passEntry ? (
                          <div>
                            <span
                              className={`font-medium ${
                                row.passOk
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive"
                              }`}
                            >
                              {row.passEntry.result} ({row.passEntry.score})
                            </span>
                            {row.passEntry.message && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                                {row.passEntry.message}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {row.bothVerified ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Verified</span>
                        ) : row.failOk === false || row.passOk === false ? (
                          <span className="text-destructive">Needs fix</span>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Auto-Repair Bar when Fail Case or Pass Case Fails */}
        {needsRepair && (
          <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-foreground">
              Verification detected issues — repair scoring rules automatically with AI
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={repairFeedback}
                onChange={(e) => setRepairFeedback(e.target.value)}
                placeholder="Optional hint (e.g. 'Use Django APIClient' or 'Ensure Task 1 asserts 400 on invalid date')…"
                className="flex-1 min-w-[220px] h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground"
              />
              <Button
                type="button"
                onClick={handleRepairScoringRules}
                disabled={isRepairing}
                className="rec-btn h-9 px-3.5 text-xs shrink-0"
              >
                {isRepairing ? "Repairing…" : "Auto-fix scoring rules"}
              </Button>
            </div>
          </div>
        )}

        {/* Detailed Live Inspector Tabs */}
        {(tempWorkspace || failResult || passResult || passSolution) && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 border-b border-border pb-1.5">
              {(
                [
                  { id: "fail", label: "Fail Case Output" },
                  { id: "pass", label: "Pass Case Output" },
                  { id: "solution", label: `Pass Solution Files (${solutionFileNames.length})` },
                  {
                    id: "workspace",
                    label: `Temp Workspace Files (${tempWorkspace?.file_count ?? 0})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id)}
                  className={`px-3 py-1 text-xs rounded transition cursor-pointer ${
                    inspectorTab === tab.id
                      ? "bg-foreground/10 text-foreground font-medium border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Fail Case Console & JSON */}
            {inspectorTab === "fail" && (
              <div className="rounded-lg border border-border bg-background p-3.5 space-y-3 text-xs font-mono">
                {failResult ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground pb-2 border-b border-border">
                      <span>Command: {effectiveTestCommand}</span>
                      <span>
                        Exit: {failResult.exit_code} · Duration: {failResult.duration_ms}ms
                      </span>
                    </div>
                    {failResult.data && (
                      <div>
                        <div className="text-[11px] font-sans font-medium text-muted-foreground mb-1">
                          Parsed Yuvro JSON
                        </div>
                        <pre className="rounded bg-card border border-border p-2.5 overflow-x-auto max-h-56 text-[11px] text-foreground">
                          {JSON.stringify(failResult.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-sans font-medium text-muted-foreground mb-1">
                        stdout
                      </div>
                      <pre className="rounded bg-card border border-border p-2.5 overflow-x-auto max-h-48 text-[11px] text-foreground whitespace-pre-wrap">
                        {failResult.stdout || "(empty)"}
                      </pre>
                    </div>
                    {failResult.stderr && (
                      <div>
                        <div className="text-[11px] font-sans font-medium text-destructive mb-1">
                          stderr
                        </div>
                        <pre className="rounded bg-card border border-border p-2.5 overflow-x-auto max-h-48 text-[11px] text-destructive whitespace-pre-wrap">
                          {failResult.stderr}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-sans text-muted-foreground py-4 text-center">
                    Fail case has not been executed yet.
                  </div>
                )}
              </div>
            )}

            {/* Pass Case Console & JSON */}
            {inspectorTab === "pass" && (
              <div className="rounded-lg border border-border bg-background p-3.5 space-y-3 text-xs font-mono">
                {passResult ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground pb-2 border-b border-border">
                      <span>Command: {effectiveTestCommand}</span>
                      <span>
                        Exit: {passResult.exit_code} · Duration: {passResult.duration_ms}ms
                      </span>
                    </div>
                    {passResult.data && (
                      <div>
                        <div className="text-[11px] font-sans font-medium text-muted-foreground mb-1">
                          Parsed Yuvro JSON
                        </div>
                        <pre className="rounded bg-card border border-border p-2.5 overflow-x-auto max-h-56 text-[11px] text-foreground">
                          {JSON.stringify(passResult.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-sans font-medium text-muted-foreground mb-1">
                        stdout
                      </div>
                      <pre className="rounded bg-card border border-border p-2.5 overflow-x-auto max-h-48 text-[11px] text-foreground whitespace-pre-wrap">
                        {passResult.stdout || "(empty)"}
                      </pre>
                    </div>
                    {passResult.stderr && (
                      <div>
                        <div className="text-[11px] font-sans font-medium text-destructive mb-1">
                          stderr
                        </div>
                        <pre className="rounded bg-card border border-border p-2.5 overflow-x-auto max-h-48 text-[11px] text-destructive whitespace-pre-wrap">
                          {passResult.stderr}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-sans text-muted-foreground py-4 text-center">
                    Pass case has not been executed yet.
                  </div>
                )}
              </div>
            )}

            {/* Pass Solution Files */}
            {inspectorTab === "solution" && (
              <div className="rounded-lg border border-border bg-background p-3.5 space-y-2.5">
                {passSolution && solutionFileNames.length > 0 ? (
                  <>
                    {passSolution.summary && (
                      <p className="text-xs text-muted-foreground">{passSolution.summary}</p>
                    )}
                    <div className="flex flex-wrap gap-1 border-b border-border pb-1">
                      {solutionFileNames.map((sf) => (
                        <button
                          key={sf}
                          type="button"
                          onClick={() => setActiveSolutionFile(sf)}
                          className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer ${
                            (activeSolutionFile || solutionFileNames[0]) === sf
                              ? "bg-foreground/10 text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sf}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="font-mono text-foreground font-medium">{activeSolutionFile || solutionFileNames[0]}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const targetFile = activeSolutionFile || solutionFileNames[0];
                          const code = passSolution.solution_files[targetFile] || "";
                          navigator.clipboard.writeText(code);
                          toast.success(`Copied ${targetFile}`);
                        }}
                        className="qb-action text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Copy file
                      </button>
                    </div>
                    <textarea
                      rows={12}
                      value={passSolution.solution_files[activeSolutionFile || solutionFileNames[0]] || ""}
                      onChange={(e) => {
                        const targetFile = activeSolutionFile || solutionFileNames[0];
                        const updated = {
                          ...passSolution,
                          solution_files: {
                            ...passSolution.solution_files,
                            [targetFile]: e.target.value,
                          },
                        };
                        setPassSolution(updated);
                        if (onApplySolution) {
                          onApplySolution(updated.solution_files);
                        }
                      }}
                      className="w-full rounded-lg border border-input bg-card p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground py-4 text-center">
                    Run the Pass Case to generate and preview the reference solution patches applied in the sandbox.
                  </div>
                )}
              </div>
            )}

            {/* Temp Workspace Files */}
            {inspectorTab === "workspace" && (
              <div className="rounded-lg border border-border bg-background p-3.5 space-y-2.5 text-xs">
                {tempWorkspace ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between text-muted-foreground">
                      <span>
                        Workspace ID:{" "}
                        <span className="font-mono text-foreground">{tempWorkspace.temp_workspace_id}</span>
                      </span>
                      <span>Branch: {tempWorkspace.branch}</span>
                    </div>
                    {tempWorkspace.setup_log && (
                      <div className="rounded bg-card border border-border p-2 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">
                        {tempWorkspace.setup_log}
                      </div>
                    )}
                    <div className="max-h-52 overflow-y-auto rounded bg-card border border-border p-2.5 font-mono text-[11px] text-foreground grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {tempWorkspace.files.map((f) => (
                        <div key={f} className="truncate">
                          {f}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground py-4 text-center">
                    No temporary workspace active. Click &ldquo;1. Create temp workspace&rdquo; to clone the starter repo.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================================= */}
      {/* SECTION 3: FINAL REVIEW SUMMARY & PUBLISH                                         */}
      {/* ================================================================================= */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="text-xs text-muted-foreground">
              Engineering lab · {labFormData.difficulty} · {labFormData.marks} marks ·{" "}
              {labFormData.duration_minutes} min
            </div>
            <h3 className="text-base font-medium text-foreground mt-0.5">
              {labFormData.title || "Untitled question"}
            </h3>
          </div>
          <Button
            onClick={onSave}
            disabled={isSaving || !canSave}
            className="rec-btn"
          >
            {isSaving ? "Saving…" : editingId ? "Save changes" : "Publish question"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <div className="text-muted-foreground">Repository & Commands</div>
            <div className="font-mono text-foreground truncate">
              {repoFullName || "None configured"}
            </div>
            <div className="text-muted-foreground truncate">
              Test: <span className="font-mono text-foreground">{labFormData.test_command || "Not set"}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <div className="text-muted-foreground">Tasks Configured</div>
            <div className="font-medium text-foreground">{tasks.length} task(s)</div>
            <div className="text-muted-foreground truncate">
              {tasks.map((t, i) => t.title || `Task ${i + 1}`).join(", ") || "None"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <div className="text-muted-foreground">Scoring Verification</div>
            <div className="text-foreground">
              Rules: {scoringRules ? `${ruleFileNames.length} file(s)` : "Not generated"}
              {pushResult ? " · Pushed" : ""}
            </div>
            <div className="text-muted-foreground">
              Fail case: {failResult ? (failResult.verified ? "Verified" : "Needs review") : "Not run"} ·
              Pass case: {passResult ? (passResult.verified ? "Verified" : "Needs review") : "Not run"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LabScoringLiveTestStep;
