import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import {
  searchLabs,
  getLab,
  LabLibraryItem,
  LabTask,
  LAB_FILTER_OPTIONS,
  LAB_FILTER_LABELS,
  ALL_LABS,
} from "@/services/labLibraryAdapter";

const SC = 0.9;

function clampW(w: number) {
  const max = window.innerWidth / SC - 500;
  return Math.max(440, Math.min(w, max));
}

function pl(n: number, w: string) {
  return `${n} ${w}${n === 1 ? "" : "s"}`;
}

export interface QuestionLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  addedLabIds: string[];
  onAddLab: (lab: LabLibraryItem, selectedIndices: Set<number>) => void;
  onRemoveLab: (labId: string) => void;
  selectedTasksMap: Record<string, Set<number>>;
  onToggleTask: (labId: string, taskIndex: number, checked: boolean) => void;
  onSelectAllTasks: (labId: string, allCount: number) => void;
  onClearTasks: (labId: string) => void;
  addedTotals: { minutes: number; marks: number };
  libraryWidth: number | null;
  onResizeWidth: (w: number) => void;
  previewLabId: string | null;
  onSetPreviewLabId: (id: string | null) => void;
}

export function QuestionLibraryPanel({
  isOpen,
  onClose,
  addedLabIds,
  onAddLab,
  onRemoveLab,
  selectedTasksMap,
  onToggleTask,
  onSelectAllTasks,
  onClearTasks,
  addedTotals,
  libraryWidth,
  onResizeWidth,
  previewLabId,
  onSetPreviewLabId,
}: QuestionLibraryPanelProps) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<{
    dom: string;
    lang: string;
    type: string;
    sc: string;
    df: string;
  }>({
    dom: "",
    lang: "",
    type: "",
    sc: "",
    df: "",
  });
  const [sort, setSort] = useState<"" | "easy" | "short" | "marks">("");
  const [pageSize, setPageSize] = useState(20);

  const [items, setItems] = useState<LabLibraryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const [previewLab, setPreviewLab] = useState<LabLibraryItem | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch paginated labs via adapter
  const loadLabs = useCallback(
    async (currentLimit: number) => {
      const res = await searchLabs({
        q,
        filters,
        sort,
        offset: 0,
        limit: currentLimit,
      });
      setItems(res.items);
      setTotalCount(res.total);
      if (res.totalAvailable !== undefined) {
        setTotalAvailable(res.totalAvailable);
      }
    },
    [q, filters, sort]
  );

  useEffect(() => {
    if (isOpen) {
      loadLabs(pageSize);
    }
  }, [isOpen, loadLabs, pageSize]);

  // Load preview lab details
  useEffect(() => {
    if (previewLabId) {
      getLab(previewLabId).then((l) => setPreviewLab(l));
    } else {
      setPreviewLab(null);
    }
  }, [previewLabId]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewLabId) {
          onSetPreviewLabId(null);
          setTimeout(() => {
            if (listRef.current) listRef.current.scrollTop = savedScrollTop.current;
          }, 0);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, previewLabId, onClose, onSetPreviewLabId]);

  // Resizing divider mouse drag
  useEffect(() => {
    if (!isDragging) return;
    document.body.classList.add("dragging");

    const onPointerMove = (e: PointerEvent) => {
      const w = (window.innerWidth - e.clientX) / SC;
      onResizeWidth(clampW(w));
    };

    const onPointerUp = () => {
      setIsDragging(false);
      document.body.classList.remove("dragging");
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      document.body.classList.remove("dragging");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDragging, onResizeWidth]);

  const handleDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const currentW = libraryWidth ?? Math.max(620, (window.innerWidth * 0.54) / SC);
      const delta = e.key === "ArrowLeft" ? 24 : -24;
      onResizeWidth(clampW(currentW + delta));
    }
  };

  const getLabSelected = (l: LabLibraryItem): Set<number> => {
    if (selectedTasksMap[l.id]) return selectedTasksMap[l.id];
    return new Set(l.tasks.map((_, i) => i));
  };

  const getLabMetrics = (l: LabLibraryItem) => {
    const s = getLabSelected(l);
    let m = 0;
    let d = 0;
    l.tasks.forEach((t, i) => {
      if (s.has(i)) {
        m += t.m;
        d += t.d;
      }
    });
    return { m, d, n: s.size };
  };

  const anyFilterActive = Boolean(
    q || filters.dom || filters.lang || filters.type || filters.sc || filters.df
  );

  const clearAllFilters = () => {
    setQ("");
    setFilters({ dom: "", lang: "", type: "", sc: "", df: "" });
    setPageSize(20);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const handleOpenPreview = (l: LabLibraryItem) => {
    if (listRef.current) {
      savedScrollTop.current = listRef.current.scrollTop;
    }
    onSetPreviewLabId(l.id);
  };

  const handleBackToLibrary = () => {
    onSetPreviewLabId(null);
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = savedScrollTop.current;
      }
    }, 0);
  };

  const toggleTaskExpand = (labId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [labId]: !prev[labId] }));
  };

  if (!isOpen) return null;

  return (
    <aside className="libp" id="lib" aria-label="Engineering lab library">
      {/* Draggable Divider */}
      <div
        className={`rz ${isDragging ? "drag" : ""}`}
        id="rz"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the question library"
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onKeyDown={handleDividerKeyDown}
      />

      {previewLab ? (
        /* Preview Detail View */
        (() => {
          const l = previewLab;
          const x = getLabMetrics(l);
          const isAdded = addedLabIds.includes(l.id);
          const s = getLabSelected(l);

          return (
            <>
              <div className="lh">
                <div>
                  <button className="tl" type="button" onClick={handleBackToLibrary}>
                    Back to library
                  </button>
                  <h3 style={{ marginTop: 10 }}>{l.title}</h3>
                </div>
                <button
                  className="ib"
                  type="button"
                  onClick={handleBackToLibrary}
                  aria-label="Close preview and return to the library"
                >
                  <X className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </div>

              <div className="dv" id="dv">
                <p className="dd">{l.description}</p>
                <dl className="facts">
                  <div>
                    <dt>Domain</dt>
                    <dd>{l.domain}</dd>
                  </div>
                  <div>
                    <dt>Scenario</dt>
                    <dd>{l.scenario}</dd>
                  </div>
                  <div>
                    <dt>Difficulty</dt>
                    <dd>{l.difficulty}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{l.duration_minutes} min</dd>
                  </div>
                  <div>
                    <dt>Marks</dt>
                    <dd>{l.marks}</dd>
                  </div>
                  <div>
                    <dt>Tasks</dt>
                    <dd>{l.tasks.length}</dd>
                  </div>
                </dl>

                {l.type && (
                  <div className="lang">
                    <span className="mut">Lab type</span>
                    <div>{l.type}</div>
                  </div>
                )}

                <div className="lang">
                  <span className="mut">Programming languages</span>
                  <div>{l.programming_languages.join(", ")}</div>
                </div>

                {l.databases.length > 0 && (
                  <div className="lang">
                    <span className="mut">Databases</span>
                    <div>{l.databases.join(", ")}</div>
                  </div>
                )}

                <div className="tkhd">
                  <h3>Tasks in this lab ({l.tasks.length})</h3>
                  <span>
                    <button
                      className="tl"
                      type="button"
                      onClick={() => onSelectAllTasks(l.id, l.tasks.length)}
                    >
                      Select all
                    </button>{" "}
                    ·{" "}
                    <button
                      className="tl"
                      type="button"
                      onClick={() => onClearTasks(l.id)}
                    >
                      Clear
                    </button>
                  </span>
                </div>
                <p className="sub" style={{ margin: "2px 0 8px", color: "var(--mut)", fontSize: 13 }}>
                  Recruiters can choose which tasks candidates get. {x.n} of {l.tasks.length} selected.
                </p>

                <div className="tkl">
                  {l.tasks.map((t, i) => (
                    <label key={t.id || i} className="tkr2">
                      <input
                        type="checkbox"
                        checked={s.has(i)}
                        onChange={(e) => onToggleTask(l.id, i, e.target.checked)}
                      />
                      <span className="tkm">
                        <b>
                          {i + 1}. Test case {i + 1}
                          {t.hid ? " (hidden)" : ""}
                        </b>
                        <span className="mut">{t.description}</span>
                      </span>
                      <span className="mut tkn">
                        {t.m} marks · {t.d} min
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="lfoot">
                <span>
                  {x.n} of {l.tasks.length} tasks · {x.d} min · {x.m} marks
                </span>
                <span className="la">
                  {isAdded ? (
                    <>
                      <span className="addd">Added</span>
                      <button
                        className="tl red"
                        type="button"
                        onClick={() => onRemoveLab(l.id)}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      className="db"
                      type="button"
                      disabled={x.n === 0}
                      onClick={() => onAddLab(l, s)}
                    >
                      Add question
                    </button>
                  )}
                </span>
              </div>
            </>
          );
        })()
      ) : (
        /* Library List View */
        <>
          <div className="lh">
            <div>
              <h3>Engineering lab library</h3>
              <p>Real labs, not textbook questions.</p>
            </div>
            <button
              className="ib"
              type="button"
              onClick={onClose}
              aria-label="Close library"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>

          <div className="lf">
            {/* Search */}
            <div className="srch">
              <SearchIcon className="h-4 w-4" aria-hidden="true" />
              <input
                id="q"
                type="search"
                placeholder={
                  totalAvailable > 0
                    ? `Search ${totalAvailable} labs by title or topic`
                    : "Search labs by title or topic"
                }
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPageSize(20);
                }}
                aria-label="Search labs"
              />
            </div>

            {/* Always visible 5 filters */}
            <div className="fgrid">
              {(Object.keys(LAB_FILTER_OPTIONS) as (keyof typeof LAB_FILTER_OPTIONS)[]).map(
                (k) => (
                  <div key={k} className="fsel">
                    <label htmlFor={`f-${k}`}>{LAB_FILTER_LABELS[k]}</label>
                    <select
                      id={`f-${k}`}
                      value={filters[k]}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, [k]: e.target.value }));
                        setPageSize(20);
                        if (listRef.current) listRef.current.scrollTop = 0;
                      }}
                    >
                      <option value="">All</option>
                      {LAB_FILTER_OPTIONS[k].map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Result Count and Sort Row */}
          <div className="cnt">
            <span>
              {pl(totalCount, "lab")}
              {totalAvailable > 0 && totalCount !== totalAvailable
                ? ` of ${totalAvailable}`
                : ""}
              {anyFilterActive && (
                <>
                  {" · "}
                  <button className="tl" type="button" onClick={clearAllFilters}>
                    Clear all filters
                  </button>
                </>
              )}
            </span>
            <span className="sortw">
              <label htmlFor="srt" className="mut">
                Sort
              </label>
              <select
                id="srt"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as any);
                  setPageSize(20);
                  if (listRef.current) listRef.current.scrollTop = 0;
                }}
              >
                <option value="">Relevance</option>
                <option value="easy">Easiest first</option>
                <option value="short">Shortest first</option>
                <option value="marks">Most marks</option>
              </select>
            </span>
          </div>

          {/* List of Labs */}
          <div className="ll" id="ll" ref={listRef}>
            {items.length === 0 ? (
              <p className="none">No labs match. Try fewer filters or a different search.</p>
            ) : (
              <>
                {items.map((l) => {
                  const isAdded = addedLabIds.includes(l.id);
                  const x = getLabMetrics(l);
                  const isExpanded = !!expandedTasks[l.id];
                  const s = getLabSelected(l);

                  return (
                    <div key={l.id} className="li">
                      <div className="lit">
                        <div>
                          <b>{l.title}</b>
                          <div className="lm">
                            {l.difficulty} · {x.d} min · {x.m} marks ·{" "}
                            <button
                              className="tl"
                              type="button"
                              onClick={() => toggleTaskExpand(l.id)}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? "Hide tasks" : "Select tasks"} ({l.tasks.length})
                            </button>
                          </div>
                        </div>
                        <div className="la">
                          {isAdded ? (
                            <>
                              <span className="addd">Added</span>
                              <button
                                className="tl red"
                                type="button"
                                onClick={() => onRemoveLab(l.id)}
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="tl"
                                type="button"
                                onClick={() => handleOpenPreview(l)}
                              >
                                Preview
                              </button>
                              <button
                                className="ad"
                                type="button"
                                disabled={x.n === 0}
                                onClick={() => onAddLab(l, s)}
                              >
                                Add
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="lm">
                        {l.type ? `${l.type} · ` : ""}
                        {l.programming_languages.concat(l.databases).join(", ")} · {l.scenario} ·{" "}
                        {l.domain}
                      </div>

                      {/* Inline Expanded Tasks Checklist */}
                      {isExpanded && (
                        <div className="tk">
                          <div className="tkh">
                            <span>
                              {x.n} of {l.tasks.length} tasks selected
                            </span>
                            <span>
                              <button
                                className="tl"
                                type="button"
                                onClick={() => onSelectAllTasks(l.id, l.tasks.length)}
                              >
                                Select all
                              </button>{" "}
                              ·{" "}
                              <button
                                className="tl"
                                type="button"
                                onClick={() => onClearTasks(l.id)}
                              >
                                Clear
                              </button>
                            </span>
                          </div>
                          {l.tasks.map((t, i) => (
                            <label key={t.id || i} className="tkr">
                              <input
                                type="checkbox"
                                checked={s.has(i)}
                                onChange={(e) => onToggleTask(l.id, i, e.target.checked)}
                              />
                              <span>{t.title}</span>
                              <span className="mut">
                                {t.m} marks · {t.d} min
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Show 20 More Button */}
                {totalCount > items.length ? (
                  <div className="more">
                    <span className="mut">
                      Showing {items.length} of {totalCount}
                    </span>
                    <button
                      className="ad"
                      type="button"
                      onClick={() => setPageSize((prev) => prev + 20)}
                    >
                      Show {Math.min(20, totalCount - items.length)} more
                    </button>
                  </div>
                ) : (
                  totalCount > 0 && (
                    <div className="more">
                      <span className="mut">Showing all {totalCount}</span>
                    </div>
                  )
                )}
              </>
            )}
          </div>

          {/* Sticky Library Footer */}
          <div className="lfoot">
            <span id="lft">
              {pl(addedLabIds.length, "lab")} added · {addedTotals.minutes} min ·{" "}
              {addedTotals.marks} marks
            </span>
            <button className="db" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
