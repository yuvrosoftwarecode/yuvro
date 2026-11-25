import React from "react";
import { STEPS } from "./types";
import { useWizard } from "./WizardContext";

export function StepTabs() {
  const { state, setStep } = useWizard();

  return (
    <nav className="steps" role="tablist" aria-label="Creation steps">
      {STEPS.map((name, index) => {
        const stepNum = index + 1;
        const isActive = state.step === stepNum;
        const isReached = stepNum <= state.reached;

        return (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={!isReached}
            onClick={() => isReached && setStep(stepNum)}
            className={`st ${isActive ? "on" : ""}`}
          >
            {stepNum} {name}
          </button>
        );
      })}
    </nav>
  );
}
