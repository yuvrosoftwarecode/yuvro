import React, { useRef, useEffect } from "react";
import { Composer } from "./Composer";
import { useWizard } from "./WizardContext";

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
