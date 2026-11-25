import React from "react";
import { useWizard } from "./WizardContext";
import { StepTabs } from "./StepTabs";
import { BottomBar } from "./BottomBar";
import { BasicsStep } from "./BasicsStep";
import { RepositoryStep } from "./RepositoryStep";
import { ScanStep } from "./ScanStep";
import { TasksWorkspace } from "./TasksWorkspace";
import { ScoringStep } from "./ScoringStep";
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
  const { state } = useWizard();

  // Step 4 uses full-screen chat workspace
  if (state.step === 4) {
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
        <TasksWorkspace onCancel={onCancel} />
      </div>
    );
  }

  // Steps 1, 2, 3, and 5 use the centered 840px column shell
  return (
    <div
      className="wizard-scope"
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
                  onClick={onCancel}
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
                onClick={onCancel}
                style={{ textDecoration: "underline", fontSize: "15px" }}
              >
                Cancel
              </button>
            </div>

            {/* Step Tabs: 1 Basics, 2 Repository and stack, 3 Codebase scan, 4 Tasks, 5 Scoring and testing */}
            <StepTabs />

            {/* Active Step Content */}
            <div style={{ marginTop: "28px" }}>
              {state.step === 1 && <BasicsStep />}
              {state.step === 2 && <RepositoryStep />}
              {state.step === 3 && <ScanStep />}
              {state.step === 5 && <ScoringStep />}
            </div>
          </div>
        </div>

        {/* Bottom Bar: hint on left, Back link & Continue/Publish on right */}
        <BottomBar onPublish={() => onPublish(state)} isPublishing={isPublishing} />
      </div>
    </div>
  );
};
