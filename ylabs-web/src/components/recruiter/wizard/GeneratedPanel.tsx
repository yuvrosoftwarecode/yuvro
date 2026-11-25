import React from "react";
import { useWizard } from "./WizardContext";
import { TaskItem, RunItem } from "./types";

export function GeneratedPanel({
  onSelectTask,
  onAddOne,
  onAddRun,
}: {
  onSelectTask: (id: string) => void;
  onAddOne: (item: TaskItem) => void;
  onAddRun: (run: RunItem) => void;
}) {
  const { state } = useWizard();
  const t = state.t;

  if (!t.runs.length) {
    return (
      <div className="emp">
        <p className="et">Nothing generated yet</p>
        <p className="mut" style={{ margin: "6px 0 0" }}>
          Ask the task architect to write tasks. They appear here, and every run is kept as a history.
        </p>
      </div>
    );
  }

  const inLab = (id: string) => t.tasks.some((x) => x.id === id);

  return (
    <>
      {[...t.runs].reverse().map((r) => {
        const pendingCount = r.items.filter((x) => !inLab(x.id)).length;

        return (
          <div key={r.id} className="run">
            <div className="rh">
              <div className="rt">
                <span className="rn" title={r.prompt}>
                  {r.prompt}
                </span>
                <span className="mut sm">
                  {r.items.length} {r.items.length === 1 ? "task" : "tasks"} · {r.time}
                  {r.v > 1 ? ` · Version ${r.v}` : ""}
                </span>
              </div>

              {pendingCount > 0 ? (
                <button
                  type="button"
                  className="lk sm"
                  onClick={() => onAddRun(r)}
                >
                  Add {pendingCount === r.items.length && pendingCount > 1 ? "all" : pendingCount}
                </button>
              ) : (
                <span className="mut sm">All added</span>
              )}
            </div>

            {r.items.map((x) => {
              const isAdded = inLab(x.id);
              const isSelected = t.sel === x.id;

              return (
                <div key={x.id} className={`tr ${isSelected ? "on" : ""}`}>
                  <button
                    type="button"
                    className="tsb"
                    onClick={() => onSelectTask(x.id)}
                  >
                    <span className="trt">{x.title || "Untitled task"}</span>
                    <span className="trm">
                      {x.diff} · {x.marks} {x.marks === 1 ? "mark" : "marks"} · {x.min} min
                      {x.upd ? " · Updated" : ""}
                    </span>
                  </button>

                  {isAdded ? (
                    <span className="mut sm">Added</span>
                  ) : (
                    <button
                      type="button"
                      className="lk sm"
                      onClick={() => onAddOne(x)}
                    >
                      Add to tasks
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
