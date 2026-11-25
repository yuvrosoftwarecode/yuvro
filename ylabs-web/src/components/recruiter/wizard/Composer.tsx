import React, { useRef, useEffect } from "react";

export function Composer({
  draft,
  onChangeDraft,
  onSend,
  onStop,
  busy,
  placeholder,
}: {
  draft: string;
  onChangeDraft: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy && draft.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="cwrap">
      <div className="cbox">
        <textarea
          ref={textareaRef}
          className="cta"
          id="t-in"
          rows={1}
          placeholder={
            placeholder ||
            "Describe the tasks, for example: plan 3 progressive tasks for a mid-level backend engineer"
          }
          aria-label="Message the task architect"
          value={draft}
          disabled={busy}
          onChange={(e) => onChangeDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="cbr">
          {busy ? (
            <button
              type="button"
              className="snd"
              id="t-send"
              aria-label="Stop generating"
              onClick={onStop}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="snd"
              id="t-send"
              aria-label="Send"
              disabled={!draft.trim()}
              onClick={onSend}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
