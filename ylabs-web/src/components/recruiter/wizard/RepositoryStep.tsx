import React from "react";
import { RepoCombobox } from "./RepoCombobox";
import { StackTags } from "./StackTags";
import { useWizard } from "./WizardContext";

export function RepositoryStep() {
  const { state, setField } = useWizard();
  const f = state.f;
  const e = state.e;

  return (
    <>
      <div className="sec2">
        <h3>Starter code repository</h3>
        <p className="sub">Candidates get a copy of this repository in their workspace</p>

        <div style={{ marginTop: 22, display: "grid", gap: 28 }}>
          <RepoCombobox />

          <div className="g21">
            <div className="fg">
              <label className="lab" htmlFor="f-url">
                Starter repository URL
              </label>
              <input
                id="f-url"
                className="ctl"
                value={f.url}
                placeholder="https://github.com/org/repo"
                onChange={(ev) => setField("url", ev.target.value)}
              />
              {e.url && <p className="er">{e.url}</p>}
            </div>

            <div className="fg">
              <label className="lab" htmlFor="f-branch">
                Branch
              </label>
              <input
                id="f-branch"
                className="ctl"
                value={f.branch}
                placeholder="main"
                onChange={(ev) => setField("branch", ev.target.value)}
              />
              {e.branch && <p className="er">{e.branch}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="sec2">
        <h3>Technology stack</h3>
        <p className="sub">Select what candidates will work with. Add anything that is not listed.</p>
        <StackTags />
      </div>
    </>
  );
}
