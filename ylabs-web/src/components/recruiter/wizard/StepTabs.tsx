import React from "react";
import { getStepsForCategory } from "./types";
import { useWizard } from "./WizardContext";

export function StepTabs() {
  const { state, setStep } = useWizard();
  const steps = getStepsForCategory(state.type);

  const catParam =
    state.type === "design"
      ? "SYSTEM_DESIGN"
      : state.type === "know"
      ? "KNOWLEDGE"
      : "LAB";

  return (
    <nav className="steps" role="tablist" aria-label="Creation steps">
      {steps.map((name, index) => {
        const stepNum = index + 1;
        const isActive = state.step === stepNum;
        const isReached = stepNum <= state.reached;

        let href = `/recruiter/questions/new?category=${catParam}&step=${stepNum}`;
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          const editId = sp.get("edit");
          if (editId) {
            href = `/recruiter/questions/new?category=${catParam}&edit=${encodeURIComponent(editId)}&step=${stepNum}`;
          }
        }

        return (
          <a
            key={name}
            href={href}
            role="tab"
            aria-selected={isActive}
            aria-disabled={!isReached}
            tabIndex={isReached ? 0 : -1}
            onClick={(e) => {
              e.preventDefault();
              if (isReached && !isActive) {
                setStep(stepNum);
              }
            }}
            className={`st ${isActive ? "on" : ""} ${!isReached ? "disabled" : ""}`}
            style={{
              textDecoration: "none",
              cursor: isReached ? "pointer" : "default",
              opacity: isReached ? 1 : 0.5,
              display: "inline-block",
            }}
          >
            {stepNum} {name}
          </a>
        );
      })}
    </nav>
  );
}
