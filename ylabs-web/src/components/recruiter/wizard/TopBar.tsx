import React, { useState, useEffect, useRef } from "react";
import { useWizard } from "./WizardContext";
import { useRecruiterSidebar } from "@/lib/recruiterSidebarContext";
import { ChatHistoryItem, getStepsForCategory } from "./types";

interface TopBarProps {
  onCancel?: () => void;
  onPublish?: () => void;
  isPublishing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onCancel, onPublish, isPublishing }) => {
  const { state, setState, setStep, lockMsg, warnMsg, nextStep, prevStep, canPublish, normalizeMarksAndTime } = useWizard();
  const { toggleDrawer } = useRecruiterSidebar();

  const [stepMenuOpen, setStepMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const stepMenuRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  const steps = getStepsForCategory(state.type);
  const isLastStep = state.step === steps.length;

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        stepMenuRef.current &&
        !stepMenuRef.current.contains(e.target as Node)
      ) {
        setStepMenuOpen(false);
      }
      if (
        historyMenuRef.current &&
        !historyMenuRef.current.contains(e.target as Node)
      ) {
        setHistoryOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStepMenuOpen(false);
        setHistoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const title = state.f.title.trim() || "New question";

  const handleNewChat = () => {
    setState((prev) => {
      const msgs = prev.t.msgs;
      const chats = [...prev.t.chats];
      if (msgs.length > 0) {
        const firstUserMsg = msgs.find((m) => m.r === "u")?.t.slice(0, 36) || `Chat ${chats.length + 1}`;
        chats.unshift({
          id: `chat_${Date.now()}`,
          title: firstUserMsg,
          when: "Just now",
          msgs: [...msgs],
          runs: [...prev.t.runs],
          tasks: [...prev.t.tasks],
        });
      }
      return {
        ...prev,
        t: {
          ...prev.t,
          busy: false,
          draft: "",
          msgs: [],
          runs: [],
          chats,
          sel: null,
          ed: null,
          editMsg: null,
          editDraft: "",
        },
      };
    });
    setHistoryOpen(false);
  };

  const handleOpenChat = (item: ChatHistoryItem) => {
    setState((prev) => {
      const msgs = prev.t.msgs;
      const chats = [...prev.t.chats];
      if (msgs.length > 0) {
        const firstUserMsg = msgs.find((m) => m.r === "u")?.t.slice(0, 36) || `Chat ${chats.length + 1}`;
        chats.unshift({
          id: `chat_${Date.now()}`,
          title: firstUserMsg,
          when: "Earlier",
          msgs: [...msgs],
          runs: [...prev.t.runs],
          tasks: [...prev.t.tasks],
        });
      }
      return {
        ...prev,
        t: {
          ...prev.t,
          busy: false,
          draft: "",
          msgs: [...item.msgs],
          runs: item.runs ? [...item.runs] : prev.t.runs,
          tasks: item.tasks ? [...item.tasks] : prev.t.tasks,
          sel: null,
          ed: null,
          editMsg: null,
          editDraft: "",
        },
      };
    });
    setHistoryOpen(false);
  };

  return (
    <div className="tbar">
      <div className="tl2">
        {/* Toggle sidebar drawer */}
        <button
          type="button"
          className="ib"
          onClick={toggleDrawer}
          aria-label="Show sidebar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M9 5v14" />
          </svg>
        </button>

        {/* Previous step */}
        <button
          type="button"
          className="ib"
          onClick={prevStep}
          aria-label="Previous step"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        {/* Next step */}
        <button
          type="button"
          className="ib"
          onClick={nextStep}
          disabled={state.reached <= state.step || !!lockMsg}
          aria-label="Next step"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        {/* Question Title & Step Switcher Menu */}
        <div className="ttw" ref={stepMenuRef}>
          <button
            type="button"
            className="ttb"
            onClick={() => setStepMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={stepMenuOpen}
          >
            <span>{title}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 10l5 5 5-5" />
            </svg>
          </button>

          {stepMenuOpen && (
            <div className="smenu" role="menu">
              {steps.map((name, i) => {
                const k = i + 1;
                const dis = k > state.reached;
                return (
                  <button
                    key={k}
                    type="button"
                    className={`smi${k === state.step ? " cur" : ""}`}
                    role="menuitem"
                    disabled={dis}
                    onClick={() => {
                      setStep(k);
                      setStepMenuOpen(false);
                    }}
                  >
                    {k} {name}
                  </button>
                );
              })}
              <div className="smsep" />
              <button
                type="button"
                className="smi"
                role="menuitem"
                onClick={() => {
                  setStepMenuOpen(false);
                  onCancel?.();
                }}
              >
                Exit to question bank
              </button>
            </div>
          )}
        </div>

        {/* Chat History Dropdown */}
        <div className="hw" ref={historyMenuRef}>
          <button
            type="button"
            className="lk"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={historyOpen}
          >
            Chat history
          </button>

          {historyOpen && (
            <div className="smenu hm" role="menu">
              <button
                type="button"
                className="smi"
                role="menuitem"
                onClick={handleNewChat}
              >
                New chat
              </button>
              <div className="smsep" />
              <p className="hl">
                {state.t.chats.length > 0 ? "Recent chats" : "No earlier chats"}
              </p>
              {state.t.chats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="smi hi2"
                  role="menuitem"
                  onClick={() => handleOpenChat(c)}
                >
                  <span className="hti">{c.title}</span>
                  <span className="mut sm">{c.when}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="tr2">
        <span className={`sm ${warnMsg ? "wr" : "mut"}`}>
          {lockMsg || warnMsg}
        </span>
        {warnMsg && (
          <button
            type="button"
            className="lk sm"
            onClick={normalizeMarksAndTime}
            style={{ textDecoration: "underline", fontWeight: 500 }}
          >
            Normalize
          </button>
        )}
        <button
          type="button"
          className="lk"
          onClick={onCancel}
        >
          Cancel
        </button>
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
            disabled={!!lockMsg}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};
