import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Evaluation } from "@/lib/recruiter";
import {
  Candidate,
  PublishSummary,
  getPublishSummary,
  getPublicLink,
  publishEvaluation,
  parseCsv,
  EMAIL_REGEX,
} from "@/services/publishAdapter";
import "./ready-to-publish.css";

interface ReadyToPublishPageProps {
  evaluationId: string;
  initialEv?: Evaluation;
  initialPublished?: boolean;
  onCancel: () => void;
  onBackToEvaluations: () => void;
  onPublished?: (ev?: Evaluation) => void;
}

const RocketIcon = () => (
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
    <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9-.8-.8-2.1-.8-2.9-.1z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z" />
    <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
  </svg>
);

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const DEFAULT_BODY = `Hi {{name}},

You've been invited to take the {{evaluation}} assessment by {{company}}.

Click the button below to get started:

{{link}}

Good luck!`;

export const ReadyToPublishPage: React.FC<ReadyToPublishPageProps> = ({
  evaluationId,
  initialEv,
  initialPublished = false,
  onCancel,
  onBackToEvaluations,
  onPublished,
}) => {
  const [summaryData, setSummaryData] = useState<PublishSummary>({
    title: initialEv?.title || "Untitled Evaluation",
    sections: Math.max(1, initialEv?.sections?.length || 1),
    minutes: 30,
    marks: 100,
    vitarkaEnabled: true,
    companyName: initialEv?.company || "Your Company",
  });

  const [delivery, setDelivery] = useState<"email" | "link" | "csv" | "ats">(
    initialEv?.invite?.type === "link" ? "link" : "email",
  );
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    if (initialEv?.invite?.emails && Array.isArray(initialEv.invite.emails)) {
      return initialEv.invite.emails.map((e: any) =>
        typeof e === "string" ? { name: "", email: e } : { name: e.name || "", email: e.email || "" },
      );
    }
    return [];
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [isOk, setIsOk] = useState(false);
  const [subj, setSubj] = useState(`Invitation: ${initialEv?.title || "Untitled Evaluation"}`);
  const [body, setBody] = useState(initialEv?.invite?.body || DEFAULT_BODY);
  const [sch, setSch] = useState<"none" | "dates">(
    initialEv?.start_datetime || initialEv?.expiry_datetime ? "dates" : "none",
  );
  const [from, setFrom] = useState(() => {
    if (!initialEv?.start_datetime) return "";
    try {
      const d = new Date(initialEv.start_datetime);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  });
  const [to, setTo] = useState(() => {
    if (!initialEv?.expiry_datetime) return "";
    try {
      const d = new Date(initialEv.expiry_datetime);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  });
  const [csv, setCsv] = useState<{ name: string; rows: number } | null>(null);
  const [publicLink, setPublicLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [pub, setPub] = useState(initialPublished);
  const [q, setQ] = useState("");
  const [editIndex, setEditIndex] = useState(-1);
  const [ed, setEd] = useState({ n: "", e: "", err: "" });
  const [pvi, setPvi] = useState(0);
  const [clr, setClr] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const clrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const candidateListRef = useRef<HTMLDivElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editEmailInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [candidateScrollTop, setCandidateScrollTop] = useState(0);

  // Load summary and public link
  useEffect(() => {
    let active = true;
    getPublishSummary(evaluationId, initialEv).then((res) => {
      if (active) {
        setSummaryData(res);
        setSubj((prev) =>
          prev === "Invitation: Untitled Evaluation"
            ? `Invitation: ${res.title}`
            : prev,
        );
      }
    });
    getPublicLink(evaluationId).then((l) => {
      if (active) setPublicLink(l);
    });
    return () => {
      active = false;
    };
  }, [evaluationId, initialEv]);

  // Clean clr timeout on unmount
  useEffect(() => {
    return () => {
      if (clrTimerRef.current) clearTimeout(clrTimerRef.current);
    };
  }, []);

  const mailish = delivery !== "link";
  const msgOk = Boolean(subj.trim());
  const schOk = sch === "none" || (Boolean(from) && Boolean(to) && to > from);

  const blockMessage = useMemo(() => {
    if (delivery === "email" && candidates.length === 0) {
      return "Add at least one candidate email to publish";
    }
    if (delivery === "csv" && (!csv || !csv.rows)) {
      return "Upload a CSV with candidate emails to publish";
    }
    if (mailish && !msgOk) {
      return "Add an email subject to publish";
    }
    if (sch === "dates") {
      if (!from || !to) return "Choose when the evaluation opens and closes";
      if (to <= from) return "The closing date must be after the opening date";
    }
    return "";
  }, [delivery, candidates.length, csv, mailish, msgOk, sch, from, to]);

  const summaryText = useMemo(() => {
    if (delivery === "email") {
      return `${plural(candidates.length, "candidate")} will be invited by email`;
    }
    if (delivery === "csv") {
      return `${plural(csv?.rows || 0, "candidate")} from ${csv?.name || "file"}`;
    }
    return "Anyone with the link can start";
  }, [delivery, candidates.length, csv]);

  // Add single candidate
  const addCand = () => {
    const rawEmail = email.trim();
    if (!EMAIL_REGEX.test(rawEmail)) {
      setErr("Enter a valid email address");
      setIsOk(false);
      return;
    }
    if (
      candidates.some((c) => c.email.toLowerCase() === rawEmail.toLowerCase())
    ) {
      setErr("This email is already added");
      setIsOk(false);
      return;
    }
    const newCand: Candidate = { name: name.trim(), email: rawEmail };
    setCandidates((prev) => [...prev, newCand]);
    setName("");
    setEmail("");
    setErr("");
    setIsOk(false);
    setTimeout(() => {
      if (candidateListRef.current) {
        candidateListRef.current.scrollTop = candidateListRef.current.scrollHeight;
      }
      nameInputRef.current?.focus();
    }, 10);
  };

  // Add multiple candidates (from paste or multi-string enter)
  const addMany = (txt: string) => {
    const toks = txt.split(/[\s,;]+/).filter(Boolean);
    let addCount = 0;
    let dupCount = 0;
    let badCount = 0;
    const newItems: Candidate[] = [];

    const currentEmails = new Set(candidates.map((c) => c.email.toLowerCase()));

    toks.forEach((t) => {
      const m = t.match(/<?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,})>?/);
      if (!m) {
        badCount++;
        return;
      }
      const e = m[1];
      const lower = e.toLowerCase();
      if (currentEmails.has(lower)) {
        dupCount++;
        return;
      }
      currentEmails.add(lower);
      newItems.push({ name: "", email: e });
      addCount++;
    });

    if (newItems.length > 0) {
      setCandidates((prev) => [...prev, ...newItems]);
    }
    setIsOk(addCount > 0);
    setErr(
      `Added ${addCount}` +
        (dupCount ? `, ${dupCount} already in the list` : "") +
        (badCount ? `, ${badCount} skipped as not valid` : ""),
    );
    setEmail("");
    setName("");
    setTimeout(() => {
      if (candidateListRef.current) {
        candidateListRef.current.scrollTop = candidateListRef.current.scrollHeight;
      }
    }, 10);
  };

  // Save edit
  const saveEdit = () => {
    const rawEmail = ed.e.trim();
    if (!EMAIL_REGEX.test(rawEmail)) {
      setEd((prev) => ({ ...prev, err: "Enter a valid email address" }));
      editEmailInputRef.current?.focus();
      return;
    }
    const isDup = candidates.some(
      (c, idx) =>
        idx !== editIndex && c.email.toLowerCase() === rawEmail.toLowerCase(),
    );
    if (isDup) {
      setEd((prev) => ({ ...prev, err: "This email is already in the list" }));
      editEmailInputRef.current?.focus();
      return;
    }
    setCandidates((prev) => {
      const next = [...prev];
      next[editIndex] = { name: ed.n.trim(), email: rawEmail };
      return next;
    });
    setEditIndex(-1);
  };

  // Insert token at textarea cursor
  const insertToken = (token: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const s = textarea.selectionStart ?? textarea.value.length;
    const en = textarea.selectionEnd ?? s;
    const nextBody =
      body.slice(0, s) + token + body.slice(en);
    setBody(nextBody);
    setTimeout(() => {
      textarea.focus();
      const p = s + token.length;
      textarea.setSelectionRange(p, p);
    }, 0);
  };

  // Copy public link
  const handleCopyLink = () => {
    const onDone = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(publicLink).then(onDone, () => {
        const input = document.getElementById("pl") as HTMLInputElement;
        input?.select();
      });
    } else {
      const input = document.getElementById("pl") as HTMLInputElement;
      input?.select();
    }
  };

  // CSV file change
  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedCandidates = await parseCsv(file);
      setCandidates(parsedCandidates);
      setCsv({
        name: file.name,
        rows: parsedCandidates.length,
      });
    } catch {
      setCsv({
        name: file.name,
        rows: 0,
      });
    }
  };

  // Publish submit
  const handlePublish = async () => {
    if (blockMessage || isPublishing) return;
    setIsPublishing(true);
    try {
      const res = await publishEvaluation(
        {
          evaluationId,
          delivery: delivery === "ats" ? "email" : delivery,
          candidates,
          invitation: { subject: subj, body },
          window: {
            opensAt: sch === "dates" && from ? from : null,
            closesAt: sch === "dates" && to ? to : null,
          },
        },
        initialEv,
      );
      if (res.evaluation?.id) {
        const link = await getPublicLink(res.evaluation.id);
        setPublicLink(link);
      }
      setPub(true);
      onPublished?.(res.evaluation);
    } catch (err: any) {
      alert("Failed to publish evaluation: " + (err.message || "Unknown error"));
    } finally {
      setIsPublishing(false);
    }
  };

  // Filtered candidates for list
  const filteredCandidates = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return candidates.map((c, i) => ({ ...c, originalIndex: i }));
    return candidates
      .map((c, i) => ({ ...c, originalIndex: i }))
      .filter((c) =>
        (c.name + " " + c.email).toLowerCase().includes(query),
      );
  }, [candidates, q]);

  // Windowed virtual list rendering for performance with 500+ items
  const ROW_HEIGHT = 40;
  const CONTAINER_HEIGHT = 330;
  const totalRows = filteredCandidates.length;
  const startIndex = Math.max(
    0,
    Math.floor(candidateScrollTop / ROW_HEIGHT) - 8,
  );
  const endIndex = Math.min(
    totalRows,
    Math.ceil((candidateScrollTop + CONTAINER_HEIGHT) / ROW_HEIGHT) + 8,
  );
  const visibleCandidates = filteredCandidates.slice(startIndex, endIndex);
  const topPadding = startIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  // Render preview body html with highlights
  const renderPreviewBody = () => {
    const cand = candidates[pvi] || candidates[0];
    const candidateName = cand?.name || (cand ? cand.email.split("@")[0] : "Candidate");
    const escapedName = candidateName;
    const escapedEval = summaryData.title;
    const escapedCompany = summaryData.companyName;

    // Split text into lines
    const lines = body.split("\n");
    return lines.map((line, lIdx) => {
      // Replace tokens in line
      const parts = line.split(/(\{\{name\}\}|\{\{evaluation\}\}|\{\{company\}\}|\{\{link\}\})/g);
      return (
        <React.Fragment key={lIdx}>
          {parts.map((part, pIdx) => {
            if (part === "{{name}}") {
              return (
                <span key={pIdx} className="tk">
                  {escapedName}
                </span>
              );
            }
            if (part === "{{evaluation}}") {
              return (
                <span key={pIdx} className="tk">
                  {escapedEval}
                </span>
              );
            }
            if (part === "{{company}}") {
              return (
                <span key={pIdx} className="tk">
                  {escapedCompany}
                </span>
              );
            }
            if (part === "{{link}}") {
              return (
                <span key={pIdx} className="go">
                  Start evaluation
                </span>
              );
            }
            return part;
          })}
          {lIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // Preview "To" field
  const previewTo = () => {
    if (delivery === "csv") {
      return csv ? `${plural(csv.rows, "candidate")} from file` : "Candidates from your file";
    }
    const cand = candidates[pvi] || candidates[0];
    return cand ? cand.email : <span className="mut">candidate@example.com</span>;
  };

  // Availability string in preview
  const previewAvailability = () => {
    if (sch === "dates" && from && to) {
      return `${from.replace("T", " ")} to ${to.replace("T", " ")}`;
    }
    return "Always open";
  };

  if (pub) {
    return (
      <div className="pub-scope">
        <div className="scroll" ref={scrollRef}>
          <div className="page">
            <div className="okp">
              <p className="eyebrow">Published</p>
              <h1>{summaryData.title} is live</h1>
              <p className="sub">
                {delivery === "link"
                  ? "Share the public link to invite candidates."
                  : "The invitations are on their way."}
              </p>
              <p className="note">{summaryText}</p>
              {delivery === "link" && (
                <div className="linkbox" style={{ marginTop: "20px" }}>
                  <input
                    className="ctl"
                    readOnly
                    value={publicLink}
                    id="pl"
                    aria-label="Public link"
                  />
                  <button className="ob" onClick={handleCopyLink}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              )}
              <p style={{ marginTop: "24px" }}>
                <button className="lk" onClick={() => setPub(false)}>
                  Edit delivery settings
                </button>
              </p>
            </div>
          </div>
        </div>
        <div className="foot">
          <div className="in">
            <span className="mut sm">Published</span>
            <button className="ob" onClick={onBackToEvaluations}>
              Back to evaluations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pub-scope">
      <div className="scroll" ref={scrollRef}>
        <div className="page">
          <p className="eyebrow">Ready to publish</p>
          <h1>{summaryData.title}</h1>
          <p className="sub">
            Choose who gets this evaluation, what they receive and when it opens.
          </p>

          {/* Stats strip */}
          <div className="stats">
            <div className="st">
              <b>{summaryData.sections}</b>
              <span>{summaryData.sections === 1 ? "Section" : "Sections"}</span>
            </div>
            <div className="st">
              <b>{summaryData.minutes} min</b>
              <span>Duration</span>
            </div>
            <div className="st">
              <b>{summaryData.marks}</b>
              <span>Marks</span>
            </div>
            <div className="st">
              <b className={summaryData.vitarkaEnabled ? "on" : ""}>
                {summaryData.vitarkaEnabled ? "On" : "Off"}
              </b>
              <span>Vitarka AI discussion</span>
            </div>
          </div>

          <div className="grid">
            {/* Left Form Column */}
            <div>
              {/* Step 1: Who takes it */}
              <section className="step">
                <h3>Who takes it</h3>
                <p className="hint">Choose how candidates get access.</p>

                <div className="tabs" role="tablist" aria-label="Delivery method">
                  <button
                    className="tab"
                    role="tab"
                    aria-selected={delivery === "email"}
                    onClick={() => {
                      setDelivery("email");
                      setErr("");
                    }}
                  >
                    Email
                  </button>
                  <button
                    className="tab"
                    role="tab"
                    aria-selected={delivery === "link"}
                    onClick={() => {
                      setDelivery("link");
                      setErr("");
                    }}
                  >
                    Public link
                  </button>
                  <button
                    className="tab"
                    role="tab"
                    aria-selected={delivery === "csv"}
                    onClick={() => {
                      setDelivery("csv");
                      setErr("");
                    }}
                  >
                    Bulk CSV
                  </button>
                  <button className="tab" role="tab" disabled>
                    ATS<i>Soon</i>
                  </button>
                </div>

                <div className="body">
                  {delivery === "email" && (
                    <>
                      <div className="addrow">
                        <input
                          className="ctl"
                          ref={nameInputRef}
                          placeholder="Name (optional)"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          aria-label="Candidate name"
                        />
                        <input
                          className="ctl"
                          type="email"
                          placeholder="candidate@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (err) setErr("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (/[\s,;]\S/.test(email.trim())) {
                                addMany(email);
                              } else {
                                addCand();
                              }
                            }
                          }}
                          onPaste={(e) => {
                            const txt = (
                              e.clipboardData || (window as any).clipboardData
                            )?.getData("text");
                            if (txt && /[\s,;]\S/.test(txt.trim())) {
                              e.preventDefault();
                              addMany(txt);
                            }
                          }}
                          aria-label="Candidate email"
                        />
                        <button className="ob" onClick={addCand}>
                          Add
                        </button>
                      </div>

                      <p className={`err${isOk ? " ok2" : ""}`}>{err}</p>
                      <p className="note" style={{ margin: 0 }}>
                        Have a long list? Paste many addresses into the email field,
                        separated by commas, spaces or new lines.
                      </p>

                      {candidates.length > 0 && (
                        <div style={{ marginTop: "16px" }}>
                          <div className="ch">
                            <span className="sm">
                              <b>{plural(candidates.length, "candidate")}</b>
                            </span>
                            <span className="cht">
                              {candidates.length > 6 && (
                                <input
                                  className="ctl sq"
                                  ref={searchInputRef}
                                  type="search"
                                  placeholder="Search"
                                  value={q}
                                  onChange={(e) => setQ(e.target.value)}
                                  aria-label="Search candidates"
                                />
                              )}
                              <button
                                className="lk del"
                                onClick={() => {
                                  if (clr) {
                                    setCandidates([]);
                                    setClr(false);
                                    setQ("");
                                    setEditIndex(-1);
                                    if (clrTimerRef.current) clearTimeout(clrTimerRef.current);
                                  } else {
                                    setClr(true);
                                    if (clrTimerRef.current) clearTimeout(clrTimerRef.current);
                                    clrTimerRef.current = setTimeout(() => {
                                      setClr(false);
                                    }, 3000);
                                  }
                                }}
                              >
                                {clr ? "Click again to confirm" : "Remove all"}
                              </button>
                            </span>
                          </div>

                          <div
                            className="cl"
                            ref={candidateListRef}
                            onScroll={(e) =>
                              setCandidateScrollTop(e.currentTarget.scrollTop)
                            }
                          >
                            {filteredCandidates.length === 0 ? (
                              <p className="note" style={{ padding: "10px 0" }}>
                                No candidates match your search.
                              </p>
                            ) : (
                              <div
                                style={{
                                  paddingTop: `${topPadding}px`,
                                  paddingBottom: `${bottomPadding}px`,
                                }}
                              >
                                {visibleCandidates.map((c) => {
                                  const origIdx = c.originalIndex;
                                  const isEditing = editIndex === origIdx;
                                  if (isEditing) {
                                    return (
                                      <div key={origIdx} className="cr ed">
                                        <input
                                          className="ctl s"
                                          placeholder="Name"
                                          value={ed.n}
                                          onChange={(e) =>
                                            setEd((prev) => ({
                                              ...prev,
                                              n: e.target.value,
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              saveEdit();
                                            } else if (e.key === "Escape") {
                                              setEditIndex(-1);
                                            }
                                          }}
                                          aria-label="Name"
                                        />
                                        <input
                                          className="ctl s"
                                          ref={editEmailInputRef}
                                          value={ed.e}
                                          onChange={(e) =>
                                            setEd((prev) => ({
                                              ...prev,
                                              e: e.target.value,
                                              err: "",
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              saveEdit();
                                            } else if (e.key === "Escape") {
                                              setEditIndex(-1);
                                            }
                                          }}
                                          aria-label="Email"
                                        />
                                        <button className="ob s" onClick={saveEdit}>
                                          Save
                                        </button>
                                        <button
                                          className="lk"
                                          onClick={() => setEditIndex(-1)}
                                        >
                                          Cancel
                                        </button>
                                        {ed.err && <p className="eerr">{ed.err}</p>}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={origIdx} className="cr">
                                      <span className="ct">
                                        <b>{c.name || c.email.split("@")[0]}</b>
                                        <span className="mut">{c.email}</span>
                                      </span>
                                      <span className="ca">
                                        <button
                                          className="lk"
                                          onClick={() => {
                                            setEditIndex(origIdx);
                                            setEd({
                                              n: c.name,
                                              e: c.email,
                                              err: "",
                                            });
                                            setTimeout(() => {
                                              editEmailInputRef.current?.focus();
                                            }, 10);
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          className="lk del"
                                          onClick={() => {
                                            setCandidates((prev) =>
                                              prev.filter((_, i) => i !== origIdx),
                                            );
                                            if (editIndex === origIdx) {
                                              setEditIndex(-1);
                                            }
                                            setClr(false);
                                          }}
                                        >
                                          Remove
                                        </button>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {delivery === "link" && (
                    <>
                      <p className="note" style={{ margin: "0 0 14px" }}>
                        Anyone who has this link can take the evaluation. Share it
                        on a job post, a community page or in a message.
                      </p>
                      <div className="linkbox">
                        <input
                          className="ctl"
                          readOnly
                          value={publicLink}
                          aria-label="Public link"
                          id="pl"
                        />
                        <button className="ob" onClick={handleCopyLink}>
                          {copied ? "Copied" : "Copy link"}
                        </button>
                      </div>
                    </>
                  )}

                  {delivery === "csv" && (
                    <>
                      <p className="note" style={{ margin: "0 0 14px" }}>
                        Upload a CSV with the columns name and email. Each row gets
                        an invitation.
                      </p>
                      <div className="drop">
                        <label className="ob">
                          Choose CSV file
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleCsvChange}
                          />
                        </label>
                        <span className={csv && !csv.rows ? "wr" : "mut"}>
                          {csv
                            ? csv.rows
                              ? `${csv.name} · ${plural(csv.rows, "candidate")}`
                              : `${csv.name} · no valid emails found`
                            : "No file chosen"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Step 2: Invitation (Shown only for Email and CSV) */}
              {mailish && (
                <section className="step">
                  <h3>Invitation</h3>
                  <p className="hint">Write what candidates receive.</p>
                  <div className="body">
                    <div>
                      <label className="lab" htmlFor="sj">
                        Subject
                      </label>
                      <input
                        className="ctl"
                        id="sj"
                        value={subj}
                        onChange={(e) => setSubj(e.target.value)}
                      />
                    </div>
                    <div style={{ marginTop: "22px" }}>
                      <div className="lh">
                        <label className="lab" htmlFor="bd" style={{ margin: 0 }}>
                          Message
                        </label>
                        <span className="toks">
                          <button
                            className="lk"
                            onClick={() => insertToken("{{name}}")}
                          >
                            + Name
                          </button>
                          <button
                            className="lk"
                            onClick={() => insertToken("{{evaluation}}")}
                          >
                            + Evaluation
                          </button>
                          <button
                            className="lk"
                            onClick={() => insertToken("{{company}}")}
                          >
                            + Company
                          </button>
                          <button
                            className="lk"
                            onClick={() => insertToken("{{link}}")}
                          >
                            + Link
                          </button>
                        </span>
                      </div>
                      <textarea
                        className="ta"
                        id="bd"
                        rows={9}
                        ref={bodyTextareaRef}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                      <p className="note">
                        Placeholders are filled in for each candidate. The
                        preview on the right updates as you type.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3: Availability */}
              <section className="step">
                <h3>Availability</h3>
                <p className="hint">Decide when the evaluation is open.</p>
                <div className="body">
                  <div className="seg" role="radiogroup" aria-label="Schedule">
                    <button
                      className="sg"
                      role="radio"
                      aria-checked={sch === "none"}
                      onClick={() => setSch("none")}
                    >
                      No time limit
                    </button>
                    <button
                      className="sg"
                      role="radio"
                      aria-checked={sch === "dates"}
                      onClick={() => setSch("dates")}
                    >
                      Set dates
                    </button>
                  </div>

                  {sch === "dates" ? (
                    <div className="dates">
                      <div>
                        <label className="lab" htmlFor="df">
                          Opens
                        </label>
                        <input
                          className="ctl"
                          id="df"
                          type="datetime-local"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="lab" htmlFor="dt">
                          Closes
                        </label>
                        <input
                          className="ctl"
                          id="dt"
                          type="datetime-local"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="note" style={{ margin: "14px 0 0" }}>
                      Candidates can start whenever they receive the invitation.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Right Live Preview Column */}
            <aside className="side">
              <div className="pvh">
                <b>{delivery === "link" ? "Start page" : "Candidate preview"}</b>
                {delivery === "email" && candidates.length > 1 ? (
                  <select
                    value={pvi}
                    onChange={(e) => setPvi(Number(e.target.value))}
                    aria-label="Preview as"
                  >
                    {candidates.map((c, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {c.name || c.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="mut sm">What candidates see</span>
                )}
              </div>

              {delivery === "link" ? (
                <div className="mail">
                  <div className="land">
                    <p>{summaryData.companyName} invites you to</p>
                    <h4>{summaryData.title}</h4>
                    <p>
                      {plural(summaryData.sections, "section")} ·{" "}
                      {summaryData.minutes} min · {summaryData.marks} marks
                    </p>
                    <span className="go">Start evaluation</span>
                  </div>
                </div>
              ) : (
                <div className="mail">
                  <div className="mh">
                    <div>
                      <span>From</span>
                      <span>Yuvro · {summaryData.companyName}</span>
                    </div>
                    <div>
                      <span>To</span>
                      <span>{previewTo()}</span>
                    </div>
                    <div>
                      <span>Subject</span>
                      <span className="sb">
                        {subj || <span className="mut">No subject</span>}
                      </span>
                    </div>
                  </div>
                  <div className="mb">{renderPreviewBody()}</div>
                </div>
              )}

              <dl className="kv">
                <dt>Delivery</dt>
                <dd>
                  {delivery === "email"
                    ? "Email"
                    : delivery === "link"
                      ? "Public link"
                      : "Bulk CSV"}
                </dd>
                <dt>Candidates</dt>
                <dd>
                  {delivery === "link"
                    ? "Anyone with the link"
                    : delivery === "email"
                      ? candidates.length
                      : csv
                        ? csv.rows
                        : 0}
                </dd>
                <dt>Availability</dt>
                <dd>{previewAvailability()}</dd>
                <dt>Time per candidate</dt>
                <dd>{summaryData.minutes} min</dd>
              </dl>
            </aside>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="foot">
        <div className="in">
          <span className="mut sm" aria-live="polite">
            {blockMessage || summaryText}
          </span>
          <span style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <button className="lk" onClick={onCancel} disabled={isPublishing}>
              Cancel
            </button>
            <button
              className="btn"
              disabled={Boolean(blockMessage) || isPublishing}
              onClick={handlePublish}
            >
              <RocketIcon />
              {isPublishing ? "Publishing..." : "Publish Evaluation"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};
