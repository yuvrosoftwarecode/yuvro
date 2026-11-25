import React from "react";
import { useWizard } from "./WizardContext";

export function BottomBar({
  onPublish,
  isPublishing,
}: {
  onPublish?: () => void;
  isPublishing?: boolean;
}) {
  const { state, prevStep, nextStep, lockMsg, warnMsg, canPublish, publishBlockReason } = useWizard();

  const isLastStep = state.step === 5;
  const isFirstStep = state.step === 1;

  // Bottom hint text
  let hint = `Step ${state.step} of 5`;
  if (isLastStep) {
    hint = publishBlockReason || "Ready to publish";
  } else if (lockMsg) {
    hint = lockMsg;
  } else if (warnMsg) {
    hint = warnMsg;
  }

  const isContinueDisabled = Boolean(lockMsg) || (isLastStep && !canPublish) || isPublishing;

  return (
    <footer className="bar" id="bar">
      <span className={`sm ${isLastStep && !canPublish ? "mut" : "mut"}`}>{hint}</span>
      <div className="row">
        {!isFirstStep && (
          <button type="button" className="lk" onClick={prevStep} disabled={isPublishing}>
            Back
          </button>
        )}
        {isLastStep ? (
          <button
            type="button"
            className="btn"
            onClick={onPublish}
            disabled={!canPublish || isPublishing}
          >
            {isPublishing ? "Publishing..." : "Publish question"}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={nextStep}
            disabled={isContinueDisabled}
          >
            Continue
          </button>
        )}
      </div>
    </footer>
  );
}
