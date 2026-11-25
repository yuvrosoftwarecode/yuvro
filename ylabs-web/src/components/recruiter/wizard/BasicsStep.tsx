import React from "react";
import { TYPES, OPT, QuestionCategory } from "./types";
import { useWizard } from "./WizardContext";

export function BasicsStep() {
  const { state, setType, setField } = useWizard();
  const f = state.f;
  const e = state.e;

  return (
    <div className="sec2" style={{ marginTop: 28 }}>
      {/* Question Type Segmented Control */}
      <div className="fg" style={{ marginBottom: 28 }}>
        <div className="types" role="radiogroup" aria-label="Question type">
          {(["lab", "design", "know"] as QuestionCategory[]).map((cat) => {
            const info = TYPES[cat];
            const isSelected = state.type === cat;
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`ty ${isSelected ? "on" : ""}`}
                onClick={() => setType(cat)}
              >
                {info.t}
              </button>
            );
          })}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          {TYPES[state.type].d}
        </p>
      </div>

      <div className="sec2" style={{ marginTop: 0 }}>
        <h3>Challenge details</h3>
        <p className="sub">Provide context, scope and scoring configuration for candidates.</p>

        <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
          {/* Title (Auto-filled with repo name from Step 1 if lab, completely editable) */}
          <div className="fg">
            <label className="lab" htmlFor="f-title">
              Title
            </label>
            <input
              id="f-title"
              className="ctl"
              value={f.title}
              placeholder="e.g. Build a High-Throughput Order Queue"
              onChange={(ev) => setField("title", ev.target.value)}
            />
            {e.title && <p className="er">{e.title}</p>}
          </div>

          {/* Description */}
          <div className="fg">
            <label className="lab" htmlFor="f-desc">
              Description
            </label>
            <textarea
              id="f-desc"
              className="ctl"
              rows={4}
              value={f.desc}
              placeholder="Problem overview, background, expectations, and evaluation criteria..."
              onChange={(ev) => setField("desc", ev.target.value)}
            />
            {e.desc && <p className="er">{e.desc}</p>}
          </div>

          {/* Domain, Difficulty, Marks, Duration */}
          <div className="g4">
            <div className="fg">
              <label className="lab" htmlFor="f-domain">
                Domain
              </label>
              <select
                id="f-domain"
                className="ctl"
                value={f.domain}
                onChange={(ev) => setField("domain", ev.target.value)}
              >
                {OPT.domain.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="lab" htmlFor="f-diff">
                Difficulty
              </label>
              <select
                id="f-diff"
                className="ctl"
                value={f.difficulty}
                onChange={(ev) => setField("difficulty", ev.target.value)}
              >
                {OPT.difficulty.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="lab" htmlFor="f-marks">
                Marks
              </label>
              <input
                id="f-marks"
                type="number"
                min={1}
                className="ctl"
                value={f.marks}
                onChange={(ev) => setField("marks", Number(ev.target.value) || 0)}
              />
              {e.marks && <p className="er">{e.marks}</p>}
            </div>

            <div className="fg">
              <label className="lab" htmlFor="f-dur">
                Duration (minutes)
              </label>
              <input
                id="f-dur"
                type="number"
                min={1}
                className="ctl"
                value={f.dur}
                onChange={(ev) => setField("dur", Number(ev.target.value) || 0)}
              />
              {e.dur && <p className="er">{e.dur}</p>}
            </div>
          </div>

          {/* Scenario & Role */}
          <div className="g2e">
            <div className="fg">
              <label className="lab" htmlFor="f-scenario">
                Scenario
              </label>
              <select
                id="f-scenario"
                className="ctl"
                value={f.scenario}
                onChange={(ev) => setField("scenario", ev.target.value)}
              >
                {OPT.scenario.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="lab" htmlFor="f-role">
                Role
              </label>
              <select
                id="f-role"
                className="ctl"
                value={f.role}
                onChange={(ev) => setField("role", ev.target.value)}
              >
                {OPT.role.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
