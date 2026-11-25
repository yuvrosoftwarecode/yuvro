import React from "react";
import { useWizard } from "./WizardContext";
import { TaskItem } from "./types";

export function TasksPanel({
  onSelectTask,
  onNewTask,
}: {
  onSelectTask: (id: string) => void;
  onNewTask: () => void;
}) {
  const { state, tsum, tmin, normalizeMarksAndTime } = useWizard();
  const t = state.t;
  const targetMarks = Number(state.f.marks);
  const targetMin = Number(state.f.dur);

  const marksMismatch = t.tasks.length > 0 && tsum !== targetMarks;
  const minMismatch = t.tasks.length > 0 && tmin !== targetMin;

  if (!t.tasks.length) {
    return (
      <div className="emp">
        <p className="et">No tasks yet</p>
        <p className="mut" style={{ margin: "6px 0 0" }}>
          Add generated tasks here once you are happy with them. Or{" "}
          <button type="button" className="lk" onClick={onNewTask}>
            write one manually
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="lr" style={{ margin: "0 0 10px", alignItems: "center" }}>
        <p className="mut sm" id="t-tot" style={{ margin: 0 }}>
          <span style={marksMismatch ? { color: "var(--red)" } : undefined}>
            {tsum} of {state.f.marks} marks
          </span>{" "}
          ·{" "}
          <span style={minMismatch ? { color: "var(--red)" } : undefined}>
            {tmin} of {state.f.dur} min
          </span>
        </p>
        {(marksMismatch || minMismatch) && (
          <button
            type="button"
            className="lk sm"
            onClick={normalizeMarksAndTime}
            style={{ textDecoration: "underline", fontWeight: 500 }}
          >
            Normalize
          </button>
        )}
      </div>

      {t.tasks.map((x) => {
        const isSelected = t.sel === x.id;

        return (
          <div key={x.id} className={`tr ${isSelected ? "on" : ""} ${x.fresh ? "fi" : ""}`}>
            <button
              type="button"
              className="tsb"
              onClick={() => onSelectTask(x.id)}
            >
              <span className="trt">{x.title || "Untitled task"}</span>
              <span className="trm">
                {x.diff} · {x.marks} {x.marks === 1 ? "mark" : "marks"} · {x.min} min
              </span>
            </button>
          </div>
        );
      })}
    </>
  );
}
