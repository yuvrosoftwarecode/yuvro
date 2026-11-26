import React, { useState } from "react";
import { LabsSection, LabItem, getLabCalculatedStats } from "@/lib/recruiter";

export interface EngineeringLabsSectionCardProps {
  section: LabsSection;
  index: number;
  totalSections: number;
  onChange: (next: LabsSection) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: "up" | "down") => void;
  onOpenLibrary: () => void;
}

export function EngineeringLabsSectionCard({
  section,
  index,
  totalSections,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
  onOpenLibrary,
}: EngineeringLabsSectionCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const minutes = section.labs.reduce((a, l) => a + getLabCalculatedStats(l).minutes, 0);
  const marks = section.labs.reduce((a, l) => a + getLabCalculatedStats(l).marks, 0);

  const isProctoringEnabled = section.proctoring?.enableProctoring !== false;
  const enableCopyPaste = section.proctoring?.enableCopyPaste ?? false;
  const tabSwitchAllowed = section.proctoring?.tabSwitchAllowed ?? false;
  const tabSwitchLimit = section.proctoring?.tabSwitchLimit ?? 3;

  return (
    <div className={`card sec ${collapsed ? "collapsed" : ""}`} id={`sec${index + 1}`}>
      {/* Section Header */}
      <div className="sh">
        <svg
          className="grip"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="9" cy="6" r="1.4" />
          <circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" />
          <circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" />
          <circle cx="15" cy="18" r="1.4" />
        </svg>

        <div className="oi">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3" />
          </svg>
        </div>

        <div className="t">
          <small>Section {index + 1}</small>
          <b>{section.title}</b>
        </div>

        <div className="ic">
          <button
            className={`ib ${index === 0 ? "dim" : ""}`}
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>

          <button
            className={`ib ${index === totalSections - 1 ? "dim" : ""}`}
            type="button"
            aria-label="Move down"
            disabled={index === totalSections - 1}
            onClick={() => onMove("down")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>

          <button
            className="ib"
            type="button"
            aria-label="Duplicate"
            onClick={onDuplicate}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
            </svg>
          </button>

          <button
            className="ib"
            type="button"
            aria-label={collapsed ? "Expand section" : "Collapse section"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 10l5 5 5-5" />
            </svg>
          </button>

          <button
            className="ib"
            type="button"
            aria-label="Delete section"
            onClick={onDelete}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Section Body */}
      <div className="body">
        {/* Stats */}
        <div className="stats" id="stats">
          <div>
            <small>Labs</small>
            <b>{section.labs.length}</b>
          </div>
          <div>
            <small>Time</small>
            <b>{minutes} min</b>
          </div>
          <div>
            <small>Marks</small>
            <b>{marks}</b>
          </div>
        </div>

        {/* Rows of Added Labs */}
        <div className="lrows" id="lrows">
          {section.labs.map((l, i) => {
            const stats = getLabCalculatedStats(l);
            const allTasksCount = l.tasks?.length || 9;
            const selectedCount = stats.selectedTasks.length;

            return (
              <div className="lrow" key={l.id + `-${i}`}>
                <div>
                  <b>{l.title}</b>
                  <span>
                    {l.difficulty} · {selectedCount} of {allTasksCount} tasks ·{" "}
                    {stats.minutes} min · {stats.marks} marks
                  </span>
                </div>
                <button
                  className="ib"
                  type="button"
                  onClick={() => {
                    const nextLabs = section.labs.filter((_, idx) => idx !== i);
                    onChange({ ...section, labs: nextLabs });
                  }}
                  aria-label={`Remove ${l.title}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Question Button */}
        <button className="add" type="button" onClick={onOpenLibrary}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Question
        </button>

        <hr className="hr" />

        {/* Proctoring Card */}
        <div className="pc">
          <div className="ph">
            <div className="ibx">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
              </svg>
            </div>
            <div className="tx">
              <b>Proctoring</b>
              <span>Exam integrity monitoring</span>
            </div>
            <div className="en">
              <span id="pst">{isProctoringEnabled ? "Enabled" : "Disabled"}</span>
              <button
                className="sw"
                role="switch"
                aria-checked={isProctoringEnabled}
                aria-label="Proctoring"
                type="button"
                onClick={() => {
                  onChange({
                    ...section,
                    proctoring: {
                      ...section.proctoring,
                      enableProctoring: !isProctoringEnabled,
                    },
                  });
                }}
              />
            </div>
          </div>

          <div className="info">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            <span>
              When enabled, standard monitoring (tab switches, webcam, full screen, AI face
              detection) applies. Customize further rules below.
            </span>
          </div>

          <div className="line" />

          <div className="opt">
            <div>
              <b>Enable Copy &amp; Paste</b>
              <span>Allow copying text into or out of the editor</span>
            </div>
            <button
              className="sw"
              role="switch"
              aria-checked={enableCopyPaste}
              aria-label="Enable Copy and Paste"
              type="button"
              onClick={() => {
                onChange({
                  ...section,
                  proctoring: {
                    ...section.proctoring,
                    enableCopyPaste: !enableCopyPaste,
                  },
                });
              }}
            />
          </div>

          <div className="opt">
            <div>
              <b>Tab Switch Allowed</b>
              <span>Allow candidates to switch browser tabs freely</span>
            </div>
            <button
              className="sw"
              role="switch"
              aria-checked={tabSwitchAllowed}
              aria-label="Tab Switch Allowed"
              type="button"
              onClick={() => {
                onChange({
                  ...section,
                  proctoring: {
                    ...section.proctoring,
                    tabSwitchAllowed: !tabSwitchAllowed,
                  },
                });
              }}
            />
          </div>

          <div className="opt">
            <div>
              <b>Tab Switch Limit</b>
              <span>Max allowed tab switches before auto-submit</span>
            </div>
            <div className="num">
              <input
                type="number"
                id="lim"
                min="0"
                value={tabSwitchLimit}
                aria-label="Tab switch limit"
                onChange={(e) => {
                  onChange({
                    ...section,
                    proctoring: {
                      ...section.proctoring,
                      tabSwitchLimit: Math.max(0, parseInt(e.target.value, 10) || 0),
                    },
                  });
                }}
              />
              <div className="st">
                <button
                  type="button"
                  aria-label="Increase"
                  onClick={() => {
                    onChange({
                      ...section,
                      proctoring: {
                        ...section.proctoring,
                        tabSwitchLimit: tabSwitchLimit + 1,
                      },
                    });
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 15l6-6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Decrease"
                  onClick={() => {
                    onChange({
                      ...section,
                      proctoring: {
                        ...section.proctoring,
                        tabSwitchLimit: Math.max(0, tabSwitchLimit - 1),
                      },
                    });
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
