import React, { useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Composer } from "./Composer";
import { useWizard } from "./WizardContext";

function parseErrorMessage(raw: string): { title: string; summary: string; technical?: string } {
  if (!raw) return { title: "Generation Error", summary: "An unexpected error occurred while generating tasks." };

  if (raw.includes("Insufficient Balance") || raw.includes("402")) {
    return {
      title: "DeepSeek API: Insufficient Balance",
      summary:
        "The DeepSeek account has run out of balance (Error 402: Insufficient Balance). Please recharge credits on the DeepSeek platform or configure an active API key to generate tasks.",
      technical: raw,
    };
  }

  if (
    raw.includes("401") ||
    raw.includes("UNAUTHENTICATED") ||
    raw.includes("invalid x-api-key") ||
    raw.includes("Incorrect API key")
  ) {
    return {
      title: "AI Service: Authentication Error",
      summary:
        "The configured AI provider API key is invalid or unauthenticated (Error 401). Please check the API key configuration.",
      technical: raw,
    };
  }

  if (raw.includes("RateLimitError") || raw.includes("429") || raw.includes("quota")) {
    return {
      title: "AI Service: Rate Limit Exceeded",
      summary: "The AI service rate limit has been exceeded. Please wait a moment and try again.",
      technical: raw,
    };
  }

  if (raw.includes("Timeout") || raw.includes("timed out") || raw.includes("504")) {
    return {
      title: "AI Service: Request Timed Out",
      summary: "The request took too long to generate. Please try again with a simpler or shorter instruction.",
      technical: raw,
    };
  }

  if (raw.length > 180 || raw.includes("Details:") || raw.includes("Traceback") || raw.includes("{'error':")) {
    return {
      title: "AI Task Generation Failed",
      summary: "The AI task architect encountered an error while processing your request.",
      technical: raw,
    };
  }

  return {
    title: "AI Task Generation Failed",
    summary: raw,
  };
}

export function ChatColumn({
  onSendMessage,
  onStopMessage,
}: {
  onSendMessage: (text: string) => void;
  onStopMessage: () => void;
}) {
  const { state, setState } = useWizard();
  const t = state.t;
  const chatRef = useRef<HTMLDivElement>(null);

  const isEmpty = t.msgs.length === 0;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [t.msgs.length, t.busy]);

  const handleEditClick = (idx: number) => {
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        editMsg: idx,
        editDraft: prev.t.msgs[idx]?.t || "",
      },
    }));
  };

  const handleEditCancel = () => {
    setState((prev) => ({
      ...prev,
      t: { ...prev.t, editMsg: null, editDraft: "" },
    }));
  };

  const handleEditSave = (idx: number) => {
    const newText = t.editDraft.trim();
    if (!newText) return;

    // Rewind conversation to this message
    const sliced = t.msgs.slice(0, idx);
    setState((prev) => ({
      ...prev,
      t: {
        ...prev.t,
        msgs: sliced,
        editMsg: null,
        editDraft: "",
      },
    }));

    onSendMessage(newText);
  };

  let placeholder = "Describe what candidates should build...";
  if (!isEmpty) {
    if (t.tasks.length > 0) {
      placeholder = "Ask to standardize wording, adjust difficulty or rebalance marks...";
    } else {
      placeholder = "Ask for changes to the generated tasks...";
    }
  }

  return (
    <div className={`tc ${isEmpty ? "empty" : ""}`}>
      {isEmpty ? (
        <h2 className="greet">What should candidates build?</h2>
      ) : (
        <div className="chat" ref={chatRef} id="chat">
          <div className="cin2">
            {t.msgs.map((m, i) => {
              if (m.r === "u") {
                if (t.editMsg === i) {
                  return (
                    <div key={i} className="msg u">
                      <div className="medit">
                        <textarea
                          className="cta"
                          id="me-in"
                          rows={2}
                          value={t.editDraft}
                          aria-label="Edit your message"
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              t: { ...prev.t, editDraft: e.target.value },
                            }))
                          }
                        />
                        <div className="mer">
                          <button
                            type="button"
                            className="lk"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="lk strong"
                            onClick={() => handleEditSave(i)}
                          >
                            Save and send
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="msg u">
                    <div className="ubw">
                      <p>{m.t}</p>
                      {m.snap && !t.busy && (
                        <button
                          type="button"
                          className="lk me"
                          onClick={() => handleEditClick(i)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const isErr =
                m.isError ||
                (m.r === "a" &&
                  (m.t.includes("All LLM scoring providers failed") ||
                    m.t.includes("Insufficient Balance") ||
                    m.t.includes("Error code: 402") ||
                    m.t.includes("UNAUTHENTICATED") ||
                    m.t.includes("Error code: 401") ||
                    m.t.startsWith("Sorry, an error occurred")));

              if (isErr) {
                const parsed = parseErrorMessage(m.t);
                return (
                  <div key={i} className="msg msg-error">
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/25 bg-red-500/5 dark:bg-red-500/10 text-foreground max-w-full overflow-hidden">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="font-semibold text-sm text-red-600 dark:text-red-400">
                          {parsed.title}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                          {parsed.summary}
                        </p>
                        {parsed.technical && (
                          <details className="mt-2.5 text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium select-none">
                              View technical error details
                            </summary>
                            <pre className="mt-2 p-2.5 rounded-lg bg-black/5 dark:bg-black/40 border border-border text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                              {parsed.technical}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="msg">
                  <p className={m.muted ? "mut" : ""}>{m.t}</p>
                </div>
              );
            })}

            {t.busy && (
              <div className="msg">
                <p className="mut think">Writing the tasks…</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Composer
        draft={t.draft}
        busy={t.busy}
        placeholder={placeholder}
        onChangeDraft={(val) =>
          setState((prev) => ({
            ...prev,
            t: { ...prev.t, draft: val },
          }))
        }
        onSend={() => onSendMessage(t.draft)}
        onStop={onStopMessage}
      />
    </div>
  );
}
