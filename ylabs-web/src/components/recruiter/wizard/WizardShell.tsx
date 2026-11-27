import React from "react";
import { useWizard } from "./WizardContext";
import { StepTabs } from "./StepTabs";
import { BottomBar } from "./BottomBar";
import { RepositoryStep } from "./RepositoryStep";
import { BasicsStep } from "./BasicsStep";
import { TasksWorkspace } from "./TasksWorkspace";
import { ScoringStep } from "./ScoringStep";
import { TopBar } from "./TopBar";
import "./wizard.css";

interface WizardShellProps {
  onCancel: () => void;
  onPublish: (state: any) => void;
  isPublishing?: boolean;
}

export const WizardShell: React.FC<WizardShellProps> = ({
  onCancel,
  onPublish,
  isPublishing = false,
}) => {
  const { state, markPublished, cleanupWorkspace, cleanupDraft } = useWizard();

  const handleCancel = () => {
    cleanupWorkspace();
    cleanupDraft();
    onCancel();
  };

  const handlePublish = () => {
    markPublished();
    cleanupDraft();
    onPublish(state);
  };

  // Full-screen chat workspace for tasks (Step 3 for Lab, Step 2 for System Design)
  const isTasksWorkspace =
    (state.type === "lab" && state.step === 3) ||
    (state.type === "design" && state.step === 2);

  const isScoringIDE = state.type === "lab" && state.step === 4;

  if (isTasksWorkspace) {
    return (
      <div
        className="wizard-scope"
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <TasksWorkspace
          onCancel={handleCancel}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      </div>
    );
  }

  if (isScoringIDE) {
    return (
      <div
        className="wizard-scope"
        style={{
          height: "100vh",
          maxHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <TopBar
          onCancel={handleCancel}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <ScoringStep isIDE onPublish={handlePublish} isPublishing={isPublishing} />
        </div>
      </div>
    );
  }

  // Centered 840px column shell for standard steps (expands to 1120px for Step 1 split-screen experiment)
  const isSplitStep = state.type === "lab" && state.step === 1;

  return (
    <div
      className={`wizard-scope ${isSplitStep ? "split-step" : ""}`}
      style={{
        minHeight: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="main">
        <div className="scroll">
          <div className="wrap">
            {/* Header row */}
            <div className="hdr">
              <div className="crumb">
                <button
                  type="button"
                  className="lk"
                  onClick={handleCancel}
                  style={{ textDecoration: "underline", fontSize: "15px" }}
                >
                  Question bank
                </button>
                <span className="mut" style={{ margin: "0 6px" }}>
                  /
                </span>
                <h1>New question</h1>
              </div>
              <button
                type="button"
                className="lk"
                onClick={handleCancel}
                style={{ textDecoration: "underline", fontSize: "15px" }}
              >
                Cancel
              </button>
            </div>

            {/* Dynamic Step Tabs based on question category */}
            <StepTabs />

            {/* Active Step Content */}
            <div style={{ marginTop: "28px" }}>
              {state.type === "lab" && state.step === 1 && <RepositoryStep />}
              {((state.type === "lab" && state.step === 2) ||
                (state.type !== "lab" && state.step === 1)) && <BasicsStep />}
              {state.type === "lab" && state.step === 4 && <ScoringStep />}
            </div>
          </div>
        </div>

        {/* Bottom Bar: hint on left, Back link & Continue/Publish on right */}
        <BottomBar onPublish={handlePublish} isPublishing={isPublishing} />
      </div>
    </div>
  );
};
