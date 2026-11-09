import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { labTaskAIService } from "@/services/labTaskAIService";

interface ScoringRulesModalProps {
  open: boolean;
  onClose: () => void;
  labFormData: any;
  onApplyTestCommand: (cmd: string) => void;
}

export function ScoringRulesModal({
  open,
  onClose,
  labFormData,
  onApplyTestCommand,
}: ScoringRulesModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [generatedRules, setGeneratedRules] = useState<{
    language: string;
    test_command: string;
    files: Record<string, string>;
    execution_notes?: string;
  } | null>(null);
  const [activeFile, setActiveFile] = useState<string>("");
  const [pushSuccessSha, setPushSuccessSha] = useState<string | null>(null);

  // Extract repo full name from git starter URL
  const repoFullName = useMemo(() => {
    const url = labFormData.git_repo_starter_url || "";
    if (!url) return "";
    const clean = url
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
    return clean;
  }, [labFormData.git_repo_starter_url]);

  const branchName = labFormData.git_repo_starter_branch || "main";

  // Build lab context for AI
  const buildLabContext = () => {
    return {
      title: labFormData.title || "Engineering Lab Challenge",
      description: labFormData.description || "",
      difficulty: labFormData.difficulty || "EASY",
      domain: labFormData.domain || "BACKEND",
      type: labFormData.type || "BACKEND",
      scenario: labFormData.scenario || "FEATURE_DEVELOPMENT",
      tech_stack: [
        ...(labFormData.programming_languages || []),
        ...(labFormData.databases || []),
        ...(labFormData.backend_frameworks || []),
        ...(labFormData.frontend_frameworks || []),
      ],
      repo_name: repoFullName,
      repo_description: labFormData.description || "",
    };
  };

  const handleGenerate = async () => {
    if (!labFormData.tasks || labFormData.tasks.length === 0) {
      toast.error("Please add at least one task in Step 3 before generating scoring rules.");
      return;
    }

    setIsGenerating(true);
    setPushSuccessSha(null);
    try {
      const context = buildLabContext();
      const res = await labTaskAIService.generateScoringRules(context, labFormData.tasks, undefined, "deepseek");
      setGeneratedRules(res);
      const fileNames = Object.keys(res.files || {});
      if (fileNames.length > 0) {
        // Prefer main_test or readme or first file
        const preferred = fileNames.find((f) => f.includes("main_test")) || fileNames[0];
        setActiveFile(preferred);
      }
      toast.success("Scoring rules generated successfully");
    } catch (err: any) {
      console.error("Failed to generate scoring rules", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to generate scoring rules.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileContentChange = (content: string) => {
    if (!generatedRules || !activeFile) return;
    setGeneratedRules({
      ...generatedRules,
      files: {
        ...generatedRules.files,
        [activeFile]: content,
      },
    });
  };

  const handleCopyCode = () => {
    if (!generatedRules || !activeFile) return;
    const code = generatedRules.files[activeFile] || "";
    navigator.clipboard.writeText(code);
    toast.success("Copied file contents to clipboard");
  };

  const handlePush = async () => {
    if (!repoFullName) {
      toast.error("No starter GitHub repository configured. Set a repository in Step 2: Configuration.");
      return;
    }
    if (!generatedRules || !generatedRules.files || Object.keys(generatedRules.files).length === 0) {
      toast.error("No rules generated to push. Click 'Generate rules' first.");
      return;
    }

    setIsPushing(true);
    try {
      const res = await labTaskAIService.pushScoringRules({
        repo_identifier: repoFullName,
        branch: branchName,
        files: generatedRules.files,
        installation_id: labFormData.github_installation_id || labFormData.github_app_installation,
        commit_message: `feat(eval): add yuvro scoring rules for ${labFormData.title || "candidate evaluation"}`,
      });

      setPushSuccessSha(res.commit_sha);
      toast.success("Scoring rules pushed to repository branch!");

      // Auto-populate test command
      if (generatedRules.test_command) {
        onApplyTestCommand(generatedRules.test_command);
        toast.success(`Lifecycle test command updated to: ${generatedRules.test_command}`);
      }
    } catch (err: any) {
      console.error("Failed to push scoring rules", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to push rules to GitHub repository.");
    } finally {
      setIsPushing(false);
    }
  };

  const fileNames = useMemo(() => {
    if (!generatedRules?.files) return [];
    return Object.keys(generatedRules.files);
  }, [generatedRules]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="recruiter-theme qb-theme qb-dialog sm:max-w-[760px] w-full bg-background border-border text-foreground p-6 rounded-xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <DialogHeader className="space-y-1 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Yuvro Scoring Rules
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="qb-action text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Automated grading scripts for candidate code evaluations. Rules adhere to the Yuvro evaluation contract.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-3 flex-1 overflow-y-auto">
          {/* Target Repo Info */}
          <div className="rounded-lg border border-border bg-card/60 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Target repository: </span>
              {repoFullName ? (
                <span className="font-mono font-medium text-foreground">
                  {repoFullName} ({branchName})
                </span>
              ) : (
                <span className="text-amber-500 font-medium">
                  Not configured (set in Step 2: Configuration)
                </span>
              )}
            </div>
            {generatedRules?.test_command && (
              <div>
                <span className="text-muted-foreground">Test command: </span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">
                  {generatedRules.test_command}
                </code>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="rec-btn text-xs py-1.5 px-3 h-8"
              >
                {isGenerating ? "Generating rules..." : generatedRules ? "Regenerate rules" : "Generate rules"}
              </Button>
            </div>

            {generatedRules && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="h-8 px-2.5 text-xs border-border bg-background hover:bg-muted"
                >
                  Copy code
                </Button>
                <Button
                  type="button"
                  onClick={handlePush}
                  disabled={isPushing || !repoFullName}
                  className="rec-btn text-xs py-1.5 px-3 h-8"
                >
                  {isPushing ? "Pushing to repo..." : "Push to repository"}
                </Button>
              </div>
            )}
          </div>

          {/* Push Confirmation */}
          {pushSuccessSha && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground space-y-1">
              <div className="font-medium text-foreground">
                Successfully committed scoring rules to branch: {branchName}
              </div>
              <div className="text-muted-foreground font-mono">
                Commit: {pushSuccessSha.slice(0, 10)}
              </div>
            </div>
          )}

          {/* Rules Editor / Viewer */}
          {generatedRules && fileNames.length > 0 ? (
            <div className="space-y-2">
              {/* File Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-border pb-1">
                {fileNames.map((fileName) => {
                  const label = fileName.replace("yuvro_scoring_rules/", "");
                  const isActive = activeFile === fileName;
                  return (
                    <button
                      key={fileName}
                      type="button"
                      onClick={() => setActiveFile(fileName)}
                      className={`px-2.5 py-1 text-xs rounded transition cursor-pointer font-mono ${
                        isActive
                          ? "bg-foreground/10 text-foreground font-medium border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Code Textarea */}
              <div className="relative">
                <textarea
                  rows={14}
                  value={generatedRules.files[activeFile] || ""}
                  onChange={(e) => handleFileContentChange(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  spellCheck={false}
                />
              </div>
            </div>
          ) : !isGenerating ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">No scoring rules generated yet</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                AI will inspect your lab description, tech stack, and tasks to synthesize compliant unit tests
                and grading logic in <code className="font-mono">yuvro_scoring_rules/</code>.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground">
              Analyzing lab tasks and synthesizing evaluation test suite...
            </div>
          )}

          {/* Architecture / Yuvro Grading Contract Note */}
          <div className="rounded-lg border border-border p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Yuvro Evaluation Specification</div>
            <p>
              Evaluation scripts execute via <code className="font-mono">main_test</code> and return structured
              JSON: <code className="font-mono">{`{"tasks": {"task1": {"result": "passed", "score": N}}, "total_score": N, "max_possible_score": 100}`}</code>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScoringRulesModal;
