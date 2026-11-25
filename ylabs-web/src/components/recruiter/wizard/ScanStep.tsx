import React, { useState } from "react";
import { useWizard } from "./WizardContext";
import { runScanRepository } from "./adapters/scanAdapter";

const STAGES = ["Cloning repository", "Indexing files", "Detecting dependencies"];

export function ScanStep() {
  const { state, setState } = useWizard();
  const [currentStage, setCurrentStage] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const isScanned = Boolean(state.scan.files && state.scan.files.length > 0);
  const isScanning = state.scan.scanning;
  const targetRepo = state.f.url || state.f.repo;

  const handleStartScan = async () => {
    if (!targetRepo.trim()) {
      setScanError("Please enter or select a starter repository in Step 2 first.");
      return;
    }

    setScanError(null);
    setState((prev) => ({
      ...prev,
      scan: { ...prev.scan, scanning: true, stageIndex: 0 },
    }));

    try {
      const res = await runScanRepository({
        repoIdentifier: targetRepo,
        branch: state.f.branch || "main",
        installationId: state.f.github_installation_id || state.f.github_app_installation || null,
        onProgress: (stageIdx) => {
          setCurrentStage(stageIdx);
        },
      });

      setState((prev) => ({
        ...prev,
        reached: Math.max(prev.reached, 4),
        scan: {
          scanning: false,
          stageIndex: 2,
          files: res.files,
          fileCount: res.fileCount,
          keyFiles: res.keyFiles,
        },
      }));
    } catch (err: any) {
      const msg = err?.message || "Failed to scan repository. Please verify your repository URL, branch, and GitHub permissions.";
      setScanError(msg);
      setState((prev) => ({
        ...prev,
        scan: { ...prev.scan, scanning: false },
      }));
    }
  };

  return (
    <div className="sec2">
      <h3>Scan starter repository</h3>
      <p className="sub">
        Index files and dependencies so AI task generation and scoring rules match the real codebase.
      </p>

      {/* Target repo indication */}
      <p className="mut sm" style={{ margin: "16px 0 20px" }}>
        Target repository: {targetRepo ? `${targetRepo} (${state.f.branch || "main"})` : "None selected (go to Step 2 to configure)"}
      </p>

      {!isScanned && !isScanning && (
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn"
            onClick={handleStartScan}
            disabled={!targetRepo.trim()}
          >
            Scan repository
          </button>
          {scanError && (
            <p className="er" style={{ marginTop: 12 }}>
              {scanError}
            </p>
          )}
        </div>
      )}

      {isScanning && (
        <div style={{ marginTop: 24 }}>
          <div className="stg">
            {STAGES.map((s, idx) => {
              const isPast = idx < currentStage;
              const isCurrent = idx === currentStage;
              return (
                <p key={s} className={!isPast && !isCurrent ? "dim" : ""}>
                  {s}
                  {isPast ? " · done" : isCurrent ? "…" : ""}
                </p>
              );
            })}
          </div>

          <div className="prog" role="progressbar" aria-label="Scanning repository">
            <i />
          </div>
        </div>
      )}

      {isScanned && !isScanning && (
        <div style={{ marginTop: 24 }}>
          <div className="lr" style={{ marginBottom: 12 }}>
            <p className="rp">
              Indexed <b>{state.scan.fileCount} files</b> from {state.f.repo || state.f.url} ({state.f.branch || "main"}). Ready for task generation.
            </p>
            <button type="button" className="lk" onClick={handleStartScan}>
              Scan again
            </button>
          </div>

          {/* One single list of all files */}
          <div className="fl">
            {(state.scan.files || []).map((p) => (
              <span key={p} title={p}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
