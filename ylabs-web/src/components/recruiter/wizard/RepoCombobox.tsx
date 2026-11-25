import React, { useState, useEffect, useRef, useMemo } from "react";
import { useWizard } from "./WizardContext";
import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";

export interface RepoItem {
  o: string;
  n: string;
  v: string;
  b: string;
  id: string;
  installation_id?: string;
  installation_db_id?: string;
}

export function RepoCombobox() {
  const { state, selectRepo, toggleRepoDropdown, setRepoDropdownOpen } = useWizard();
  const [q, setQ] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load real authorized repositories from connected GitHub App
  useEffect(() => {
    let isMounted = true;
    async function loadAuthorizedRepos() {
      setIsLoading(true);
      try {
        const instList: any = await restApiAuthUtil.get("/recruiter/github-app/installations/");
        if (!Array.isArray(instList) || instList.length === 0) {
          if (isMounted) {
            setRepos([]);
            setIsLoading(false);
          }
          return;
        }

        const results = await Promise.all(
          instList.map(async (inst: any) => {
            try {
              const data: any = await restApiAuthUtil.get(
                `/recruiter/github-app/installations/${inst.installation_id}/repositories/`
              );
              if (!Array.isArray(data)) return [];
              return data.map((r: any) => {
                const parts = (r.full_name || "").split("/");
                return {
                  o: parts[0] || inst.account_login || "repo",
                  n: parts[1] || r.name || "",
                  v: r.private ? "Private" : "Public",
                  b: r.default_branch || "main",
                  id: r.full_name || `${parts[0]}/${parts[1]}`,
                  installation_id: String(inst.installation_id),
                  installation_db_id: String(inst.id),
                };
              });
            } catch {
              return [];
            }
          })
        );

        if (isMounted) {
          const realRepos = results.flat();
          const seen = new Set<string>();
          const deduped: RepoItem[] = [];
          for (const r of realRepos) {
            if (!seen.has(r.id)) {
              seen.add(r.id);
              deduped.push(r);
            }
          }
          setRepos(deduped);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setRepos([]);
          setIsLoading(false);
        }
      }
    }
    loadAuthorizedRepos();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const clean = q.trim().toLowerCase();
    if (!clean) return repos;
    return repos.filter((r) => r.id.toLowerCase().includes(clean));
  }, [repos, q]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [filtered.length]);

  // Handle outside click
  useEffect(() => {
    if (!state.rp.open) return;
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setRepoDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [state.rp.open, setRepoDropdownOpen]);

  // Focus input when opened
  useEffect(() => {
    if (state.rp.open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ("");
    }
  }, [state.rp.open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.rp.open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        toggleRepoDropdown();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setRepoDropdownOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIdx]) {
        selectRepo(filtered[highlightIdx]);
      }
    }
  };

  let lastOwner = "";

  return (
    <div className="fg" ref={containerRef}>
      <div className="lr">
        <label className="lab" id="rp-l">
          Authorized GitHub repository
        </label>
        <span className="mut sm">
          {isLoading ? "Checking repositories…" : `${repos.length} ${repos.length === 1 ? "repository" : "repositories"} available`}
        </span>
      </div>

      <div className="cb">
        <button
          type="button"
          className={`ctl cbb ${state.f.repo ? "" : "ph"}`}
          id="rp-btn"
          aria-haspopup="listbox"
          aria-expanded={state.rp.open}
          aria-labelledby="rp-l"
          onClick={toggleRepoDropdown}
          onKeyDown={handleKeyDown}
        >
          <span className="v">{state.f.repo ? state.f.repo : "Select an authorized repository"}</span>
          <span className="mut sm">{state.f.repo ? "Change" : "Select"}</span>
        </button>

        {state.rp.open && (
          <div className="rpp" role="listbox">
            <input
              ref={inputRef}
              className="rpq"
              placeholder="Filter repositories"
              autoComplete="off"
              aria-label="Filter repositories"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div className="rpl">
              {repos.length === 0 ? (
                <p className="rpe">
                  No authorized repositories found. Connect your GitHub account under GitHub and repositories, or enter a repository URL below.
                </p>
              ) : filtered.length === 0 ? (
                <p className="rpe">No repositories match “{q.trim()}”</p>
              ) : (
                filtered.map((r, i) => {
                  const isNewGroup = r.o !== lastOwner;
                  if (isNewGroup) lastOwner = r.o;
                  const isCurrent = r.id === state.f.repo;
                  const isHighlighted = i === highlightIdx;

                  return (
                    <React.Fragment key={r.id}>
                      {isNewGroup && <div className="rpg">{r.o}</div>}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        className={`rpi ${isCurrent ? "cur" : ""} ${isHighlighted ? "act" : ""}`}
                        onClick={() => selectRepo(r)}
                        onMouseEnter={() => setHighlightIdx(i)}
                      >
                        <span className="rpn">{r.n}</span>
                        <span className="rpm">
                          {r.v} · {r.b}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
