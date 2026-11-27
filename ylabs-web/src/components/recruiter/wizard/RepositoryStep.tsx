import React, { useState } from "react";
import { TYPES, QuestionCategory } from "./types";
import { useWizard } from "./WizardContext";
import { RepoCombobox } from "./RepoCombobox";
import { StackTags } from "./StackTags";
import { runScanRepository } from "./adapters/scanAdapter";

const STAGES = ["Cloning repository", "Indexing files", "Detecting dependencies"];

export function RepositoryStep() {
  const { state, setState, setType, setField } = useWizard();
  const f = state.f;
  const e = state.e;

  const [currentStage, setCurrentStage] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const isScanned = Array.isArray(state.scan.files);
  const isScanning = state.scan.scanning;
  const targetRepo = state.f.url || state.f.repo;

  const handleStartScan = async () => {
    if (!targetRepo.trim()) {
      setScanError("Please enter or select a starter repository first.");
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
        reached: Math.max(prev.reached, 2),
        scan: {
          ...prev.scan,
          scanning: false,
          stageIndex: 2,
          files: res.files,
          fileCount: res.fileCount,
          keyFiles: res.keyFiles,
          cloneToken: res.cloneToken || prev.scan.cloneToken,
        },
      }));
    } catch (err: any) {
      const msg =
        err?.message ||
        "Failed to scan repository. Please verify your repository URL, branch, and GitHub permissions.";
      setScanError(msg);
      setState((prev) => ({
        ...prev,
        scan: { ...prev.scan, scanning: false },
      }));
    }
  };

  return (
    <div className="sec2" style={{ marginTop: 28 }}>
      {/* Question Type Segmented Control */}
      <div className="fg" style={{ marginBottom: 28 }}>
        <div className="types" role="radiogroup" aria-label="Question type">
          {(["lab", "design", "know"] as QuestionCategory[]).map((cat) => {
            const info = TYPES[cat];
            const isSelected = state.type === cat;
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`ty ${isSelected ? "on" : ""}`}
                onClick={() => setType(cat)}
              >
                {info.t}
              </button>
            );
          })}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          {TYPES[state.type].d}
        </p>
      </div>

      {state.type === "lab" ? (
        <div className="split-grid">
          {/* Left Column: Repository & Scan */}
          <div className="split-col split-left">
            {/* 1. Starter code repository */}
            <div className="sec2" style={{ marginTop: 0 }}>
              <h3>Starter code repository</h3>
              <p className="sub">Candidates get a copy of this repository in their workspace</p>

              <div style={{ marginTop: 20, display: "grid", gap: 24 }}>
                <RepoCombobox />

                <div className="g21">
                  <div className="fg">
                    <label className="lab" htmlFor="f-url">
                      Starter repository URL
                    </label>
                    <input
                      id="f-url"
                      className="ctl"
                      value={f.url}
                      placeholder="https://github.com/org/repo"
                      onChange={(ev) => setField("url", ev.target.value)}
                    />
                    {e.url && <p className="er">{e.url}</p>}
                  </div>

                  <div className="fg">
                    <label className="lab" htmlFor="f-branch">
                      Branch
                    </label>
                    <input
                      id="f-branch"
                      className="ctl"
                      value={f.branch}
                      placeholder="main"
                      onChange={(ev) => setField("branch", ev.target.value)}
                    />
                    {e.branch && <p className="er">{e.branch}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Repository codebase scan */}
            <div className="sec2" style={{ marginTop: 0 }}>
              <h3>Scan starter repository</h3>
              <p className="sub">
                Index files and dependencies so AI task generation and scoring rules match the real codebase.
              </p>

              <p className="mut sm" style={{ margin: "14px 0 16px" }}>
                Target repository: {targetRepo ? `${targetRepo} (${state.f.branch || "main"})` : "None selected yet"}
              </p>

              {!isScanned && !isScanning && (
                <div style={{ marginTop: 16 }}>
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
                <div style={{ marginTop: 20 }}>
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
                <div style={{ marginTop: 16 }}>
                  <div className="lr" style={{ alignItems: "center" }}>
                    <p className="rp" style={{ margin: 0 }}>
                      {state.scan.fileCount > 0 ? (
                        <>
                          Indexed <b>{state.scan.fileCount} files</b> from {state.f.repo || state.f.url} ({state.f.branch || "main"}). Ready for task generation.
                        </>
                      ) : (
                        <>
                          Repository <b>{state.f.repo || state.f.url}</b> ({state.f.branch || "main"}) is empty (0 files). You can still continue to create tasks.
                        </>
                      )}
                    </p>
                    <button type="button" className="lk" onClick={handleStartScan}>
                      Scan again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Technology stack */}
          <div className="split-col split-right">
            <div className="sec2" style={{ marginTop: 0 }}>
              <h3>Technology stack</h3>
              <p className="sub">Select what candidates will work with. Add anything that is not listed.</p>
              <div style={{ marginTop: 16 }}>
                <StackTags variant="stacked" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <p className="sub">
            Starter code repositories and codebase scans are only required for Engineering labs. Continue to configure assessment details.
          </p>
        </div>
      )}
    </div>
  );
}
