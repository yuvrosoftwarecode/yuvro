import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { StandardHeader } from "@/components/StandardHeader";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token) {
        const userStr = localStorage.getItem("user");
        let dest = "/student/dashboard";
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const role = user?.roles?.ylabs || user?.roles?.ycode || user?.role;
            const r = role?.toLowerCase();
            if (r === "admin") {
              dest = "/admin";
            } else if (r === "recruiter") {
              dest = "/recruiter/dashboard";
            }
          } catch {
            // ignore parsing error
          }
        }
        throw redirect({ to: dest });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Yuvro Labs — Built for the next era of development" },
      {
        name: "description",
        content:
          "Yuvro Labs is an AI-powered employability verification and software engineering education platform. Run real simulations, coding assessments and AI interviews.",
      },
      { property: "og:title", content: "Yuvro Labs — Built for the next era of development" },
      {
        property: "og:description",
        content:
          "Choose your side: hire people who can actually do the job, or practise like it's the real thing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const WORDS = ["THE NEXT ERA", "HUMAN + AI", "MODERN", "REAL-WORLD", "AI-FIRST"];

const COMPANY_ROWS = [
  {
    id: "simulation-labs",
    t: "Simulation Labs",
    d: "Test how candidates solve real-world technical problems, with AI follow-up questions to understand their approach.",
  },
  {
    id: "coding-assessments",
    t: "Coding Assessments",
    d: "Evaluate coding skills through structured programming challenges.",
  },
  {
    id: "ai-mock-interviews",
    t: "Vitarka AI Interviews",
    d: "Conduct realistic AI voice interviews with follow-up questions and detailed feedback.",
  },
  {
    id: "codebase-challenges",
    t: "Codebase Challenges",
    d: "Evaluate candidates by having them develop company-specific features in secure environments.",
  },
  {
    id: "work-trial",
    t: "Work Trial",
    d: "Give candidates a real on-the-job experience through 24–48-hour assignments using your actual codebase, without affecting production systems.",
  },
];

const DEV_ROWS = [
  {
    id: "practice-simulations",
    t: "Practice simulations",
    s: "Fix real tickets, sprint by sprint.",
    m: "term" as const,
  },
  {
    id: "mock-interviews",
    t: "Mock interviews",
    s: "Talk to an AI interviewer, get a report.",
    m: "wave" as const,
  },
  {
    id: "ai-research-papers",
    t: "AI research papers",
    s: "See what’s new in AI, explained simply.",
    m: "doc" as const,
  },
];

const TRIAL_TILES = [
  { b: "Simulation Labs", s: "Watch candidates solve real technical problems" },
  { b: "Coding Assessments", s: "Structured programming challenges" },
  { b: "Vitarka AI Interviews", s: "Voice interviews with smart follow-ups" },
  { b: "Work Trial", s: "Real assignments in a secure environment" },
];

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

function TermGlyph() {
  return (
    <div className="m term" aria-hidden="true">
      <span className="t1">$ npm test</span>
      <span className="t2">✓ 3 passed</span>
    </div>
  );
}

function WaveGlyph() {
  return (
    <div className="m wave" aria-hidden="true">
      {Array.from({ length: 12 }, (_, k) => (
        <i
          key={k}
          style={{
            ["--d" as string]: k,
            ["--h" as string]: `${8 + Math.round(Math.abs(Math.sin(k * 1.1)) * 28)}px`,
          }}
        />
      ))}
    </div>
  );
}

function DocGlyph() {
  return (
    <div className="m doc" aria-hidden="true">
      <span className="pg" />
      <span className="pf">
        <i className="t" />
        <i />
        <i />
        <i />
        <i />
      </span>
      <b className="sp" />
    </div>
  );
}

const GLYPHS = { term: TermGlyph, wave: WaveGlyph, doc: DocGlyph };

export function LandingPage() {
  const nav = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token || isAuthenticated || user) {
        let dest = "/student/dashboard";
        const role = user?.roles?.ylabs || user?.roles?.ycode || user?.role;
        const r = role?.toLowerCase();
        if (r === "admin") dest = "/admin";
        else if (r === "recruiter") dest = "/recruiter/dashboard";
        else {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            try {
              const u = JSON.parse(userStr);
              const r2 = (u?.roles?.ylabs || u?.roles?.ycode || u?.role)?.toLowerCase();
              if (r2 === "admin") dest = "/admin";
              else if (r2 === "recruiter") dest = "/recruiter/dashboard";
            } catch {
              // ignore
            }
          }
        }
        nav({ to: dest });
      }
    }
  }, [user, isAuthenticated, nav]);

  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  /* Navigation actions */
  const goCompany = () => nav({ to: "/recruiter-login" });
  const goDeveloper = () => {
    nav({ to: "/student/dashboard" });
  };

  /* Rotating headline word */
  const [wordIdx, setWordIdx] = useState(0);
  const [wordOut, setWordOut] = useState(false);
  const [wordPre, setWordPre] = useState(false);

  useEffect(() => {
    if (reducedMotion()) return;
    const iv = setInterval(() => {
      setWordOut(true);
      setTimeout(() => {
        setWordIdx((k) => (k + 1) % WORDS.length);
        setWordOut(false);
        setWordPre(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setWordPre(false)));
      }, 300);
    }, 2400);
    return () => clearInterval(iv);
  }, []);

  /* Company rows auto-cycle */
  const [openRow, setOpenRow] = useState(0);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const paused = useRef(false);
  const cycleIdx = useRef(0);

  useEffect(() => {
    if (reducedMotion()) return;
    const iv = setInterval(() => {
      if (paused.current) return;
      cycleIdx.current = (cycleIdx.current + 1) % COMPANY_ROWS.length;
      setOpenRow(cycleIdx.current);
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  const companyCardMouseEnter = () => {
    paused.current = true;
    setHoverRow(null);
  };
  const companyCardMouseLeave = () => {
    paused.current = false;
    setHoverRow(null);
    setOpenRow(cycleIdx.current);
  };
  const companyCardTouch = () => {
    paused.current = true;
  };

  const companyRowClick = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isTouch = window.matchMedia("(hover:none)").matches;
    if (isTouch && openRow !== i) {
      paused.current = true;
      setOpenRow(i);
      return;
    }
    goCompany();
  };

  const shownRow = hoverRow ?? openRow;

  return (
    <div className="yl">
      <style>{CSS}</style>
      <StandardHeader />

      <div className="wrap">
        <div className="head">
          <h1 className="hero">
            <span className="l1">Built for</span>
            <span className="w">
              <span className={`gold${wordOut ? " out" : ""}${wordPre ? " pre" : ""}`}>
                {WORDS[wordIdx]}
              </span>
            </span>
            <span className="l3">DEVELOPMENT.</span>
          </h1>
          <p className="sub">Choose your side and log in.</p>
        </div>

        <div className="cards">
          <div className="col">
            <span className="eye">FOR COMPANIES</span>
            <section
              className="big"
              style={{ ["--c" as string]: "#d9480f" }}
              aria-label="For companies"
              onClick={goCompany}
              onMouseEnter={companyCardMouseEnter}
              onMouseLeave={companyCardMouseLeave}
              onTouchStart={companyCardTouch}
            >
              <h2>Hire people who can actually do the job.</h2>
              <ul className="list">
                {COMPANY_ROWS.map((x, i) => (
                  <li
                    key={x.id}
                    className={`row${shownRow === i ? " open" : ""}`}
                    tabIndex={0}
                    style={{ ["--i" as string]: i }}
                    onClick={(e) => companyRowClick(i, e)}
                    onMouseEnter={() => {
                      if (paused.current) setHoverRow(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        goCompany();
                      }
                    }}
                  >
                    <div className="rh">
                      <span className="rt">
                        <b>{x.t}</b>
                      </span>
                    </div>
                    <div className="rd">
                      <div>
                        <p>{x.d}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                className="go"
                onClick={(e) => {
                  e.stopPropagation();
                  goCompany();
                }}
              >
                Log in as a company
              </button>
            </section>
          </div>

          <div className="col">
            <span className="eye">FOR DEVELOPERS</span>
            <section
              className="big"
              style={{ ["--c" as string]: "#3b6fd4" }}
              aria-label="For developers"
              onClick={goDeveloper}
            >
              <h2>Practise like it’s the real thing.</h2>
              <ul className="list">
                {DEV_ROWS.map((x, i) => {
                  const Glyph = GLYPHS[x.m];
                  return (
                    <li
                      key={x.id}
                      className="row"
                      tabIndex={0}
                      style={{ ["--i" as string]: i }}
                      onClick={(e) => {
                        e.stopPropagation();
                        goDeveloper();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          goDeveloper();
                        }
                      }}
                    >
                      <div className="rh">
                        <span className="rt">
                          <b>{x.t}</b>
                          <small>{x.s}</small>
                        </span>
                        <Glyph />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {/* Requirement 6: Developer Navigation: Remove 'Login as a Developer' and keep only 'Developer' */}
              <button
                className="go"
                onClick={(e) => {
                  e.stopPropagation();
                  goDeveloper();
                }}
              >
                Developer
              </button>
            </section>
          </div>
        </div>

        <section className="trial" aria-label="Free trial">
          <div className="tl">
            <h3>
              Don’t take our word for it. <em>See it work.</em>
            </h3>
            <p>
              Skip the long product tour. Run real simulations, coding assessments and AI interviews
              with your own hiring team for 14 days, and see how candidates actually perform.
            </p>
            <button
              className="tbtn"
              onClick={() => nav({ to: "/auth", search: { tab: "signup" } })}
            >
              Start your free 14-day trial
            </button>
          </div>
          <ul className="tr">
            {TRIAL_TILES.map((t) => (
              <li key={t.b}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" />
                  <path d="M7 12.5l3.2 3.2L17 9" />
                </svg>
                <div>
                  <b>{t.b}</b>
                  <span>{t.s}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="foot">
        <div className="fwrap">
          <span className="fcopy">© {new Date().getFullYear()} Yuvro Labs. All rights reserved.</span>
          <a className="fmail" href="mailto:contact@yuvrolabs.com">
            contact@yuvrolabs.com
          </a>
          <nav className="fsocial" aria-label="Social media">
            <a
              href="https://www.linkedin.com/company/yuvrolabs"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9z" />
              </svg>
            </a>
            <a
              href="https://www.reddit.com/r/yuvrolabs"
              target="_blank"
              rel="noreferrer"
              aria-label="Reddit"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12a2.2 2.2 0 0 0-3.7-1.6c-1-.7-2.4-1.2-3.9-1.3l.8-3.6 2.5.5a1.8 1.8 0 1 0 .2-.9l-3.1-.6a.5.5 0 0 0-.6.4l-.9 4.1c-1.5.1-2.9.6-3.9 1.3A2.2 2.2 0 1 0 4.4 14c-.05.3-.05.7 0 1 0 2.8 3.4 5 7.6 5s7.6-2.2 7.6-5c.05-.3.05-.7 0-1A2.2 2.2 0 0 0 22 12zm-13.5 1.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm7 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm-6.7 3.4a.5.5 0 0 1 .7-.1c.4.3 1.4.9 2.5.9s2.1-.6 2.5-.9a.5.5 0 1 1 .6.8c-.6.5-1.8 1.1-3.1 1.1s-2.5-.6-3.1-1.1a.5.5 0 0 1-.1-.7z" />
              </svg>
            </a>
            <a
              href="https://discord.gg/yuvrolabs"
              target="_blank"
              rel="noreferrer"
              aria-label="Discord"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3a.5.5 0 0 0-.5.2c-.2.4-.5.9-.6 1.3a18.3 18.3 0 0 0-4.6 0A12.6 12.6 0 0 0 9 3.2a.5.5 0 0 0-.5-.2 19.8 19.8 0 0 0-4.9 1.5.5.5 0 0 0-.2.2A20.4 20.4 0 0 0 .1 18.1a.5.5 0 0 0 .2.3 19.9 19.9 0 0 0 6 3 .5.5 0 0 0 .6-.2c.5-.6.9-1.3 1.2-2a.5.5 0 0 0-.3-.7 13.1 13.1 0 0 1-1.9-.9.5.5 0 0 1 0-.8l.9-.7a.5.5 0 0 1 .5 0 14.2 14.2 0 0 0 12 0 .5.5 0 0 1 .5 0l.9.7a.5.5 0 0 1 0 .8c-.6.4-1.2.7-1.9.9a.5.5 0 0 0-.3.7c.4.7.8 1.4 1.2 2a.5.5 0 0 0 .6.2 19.8 19.8 0 0 0 6-3 .5.5 0 0 0 .2-.3c.5-5.2-.8-9.7-3.5-13.7a.4.4 0 0 0-.2-.2zM8.7 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4zm6.6 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4z" />
              </svg>
            </a>
            <a
              href="https://twitter.com/yuvrolabs"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.5 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z" />
              </svg>
            </a>
          </nav>
        </div>
      </footer>

      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}

const CSS = `
.yl{--page:#f8f9fb;--ink:#14192b;--muted:#646d84;--brand:#4a7bdc;
  box-sizing:border-box;min-height:100vh;display:flex;flex-direction:column;
  background:var(--page);color:var(--ink);
  font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  line-height:1.5;}
.dark .yl{--page:#0d1120;--ink:#f1f4fc;--muted:#a1abc4}
.yl *,.yl *::before,.yl *::after{box-sizing:border-box}
.yl button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.yl :focus-visible{outline:3px solid #fff;outline-offset:2px;border-radius:14px}
.yl .wrap{width:100%;max-width:1120px;margin:0 auto;flex:1;display:flex;flex-direction:column;padding:32px 20px 48px}
.yl .head{text-align:center;margin:clamp(36px,6vw,72px) 0 clamp(40px,6vw,68px);animation:yl-fade .6s ease}
@keyframes yl-fade{from{opacity:0;transform:translateY(10px)}}
.yl .sub{margin:0;color:var(--muted);font-size:clamp(14px,1.3vw,16px);font-weight:500}
.yl h1.hero{font-family:"Inter",ui-sans-serif,system-ui,sans-serif;font-weight:800;font-size:clamp(40px,6.2vw,76px);line-height:1.06;letter-spacing:-.025em;margin:0 0 20px}
.yl h1.hero>span{display:block}
.yl h1.hero .w{height:1.15em;overflow:hidden}
.yl .gold{display:inline-block;color:#a8782a;transition:opacity .3s ease,transform .3s ease}
.yl .gold.out{opacity:0;transform:translateY(-35%)}
.yl .gold.pre{opacity:0;transform:translateY(35%);transition:none}
.dark .yl .gold{color:#dcc48e}
.yl .cards{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:stretch}
@media(max-width:900px){.yl .cards{grid-template-columns:1fr}}
.yl .big{position:relative;overflow:hidden;border-radius:34px;background:var(--c);color:#fff;padding:36px 32px 32px;min-height:640px;display:flex;flex-direction:column;cursor:pointer;box-shadow:0 14px 28px -18px rgba(0,0,0,.5);transition:transform .45s cubic-bezier(.3,.9,.3,1),box-shadow .45s;animation:yl-rise .75s cubic-bezier(.2,.8,.2,1) backwards}
.yl .col:nth-child(2) .big{animation-delay:.12s}
@keyframes yl-rise{from{opacity:0;transform:translateY(30px) scale(.97)}}
.yl .big:hover{transform:translateY(-6px);box-shadow:0 34px 50px -24px color-mix(in srgb,var(--c) 75%,#000)}
.yl .big>*{position:relative;z-index:1}
.yl .col{display:flex;flex-direction:column;gap:16px}
.yl .col>.big{flex:1}
.yl .eye{font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--muted);padding-left:10px}
.yl .big h2{font-family:"Fraunces","Instrument Serif",Georgia,serif;font-weight:600;font-size:clamp(22px,2.5vw,30px);line-height:1.1;letter-spacing:-.025em;margin:0;max-width:15ch}
.yl .list{list-style:none;margin:24px 0 auto;padding:0;display:grid;gap:6px}
.yl .row{border-radius:18px;padding:14px 18px;cursor:pointer;transition:background .25s;animation:yl-rise .6s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(var(--i) * 80ms + .3s)}
.yl .row:hover,.yl .row.open,.yl .row:focus-visible{background:rgba(255,255,255,.17)}
.yl .rh{display:flex;align-items:center;gap:14px}
.yl .rt{flex:1;min-width:0}
.yl .rt b{display:block;font-family:"Fraunces","Instrument Serif",Georgia,serif;font-weight:600;font-size:clamp(16px,1.6vw,19px);line-height:1.2}
.yl .rt small{display:block;font-size:12.5px;opacity:.9;margin-top:2px}
.yl .rd{display:grid;grid-template-rows:0fr;transition:grid-template-rows .42s cubic-bezier(.3,.9,.3,1)}
.yl .rd>div{overflow:hidden}
.yl .rd p{margin:8px 0 2px 0;font-size:13.5px;line-height:1.5;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .4s}
.yl .row:hover .rd,.yl .row.open .rd,.yl .row:focus-visible .rd{grid-template-rows:1fr}
.yl .row:hover .rd p,.yl .row.open .rd p,.yl .row:focus-visible .rd p{opacity:.96;transform:none;transition-delay:.12s}
.yl .go{margin-top:24px;align-self:flex-start;display:inline-flex;gap:8px;align-items:center;background:#fff;color:var(--c);font-weight:700;font-size:14px;padding:12px 22px;border-radius:12px;box-shadow:0 4px 0 rgba(10,20,60,.28);transition:transform .15s,box-shadow .15s}
.yl .go:hover{transform:translateY(2px);box-shadow:0 2px 0 rgba(10,20,60,.28)}
.yl .go:active{transform:translateY(4px);box-shadow:none}
.yl .m{width:74px;height:40px;display:flex;flex-direction:column;gap:7px;justify-content:center;flex:none}
.yl .m.term{width:86px;height:52px;padding:7px 9px;gap:4px;justify-content:center;background:rgba(10,20,60,.38);border-radius:9px;font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#fff}
.yl .term .t1{display:block;white-space:nowrap;overflow:hidden;width:0;border-right:2px solid #fff;animation:yl-ty 4.5s steps(10,end) infinite,yl-bc .8s steps(1) infinite}
.yl .term .t2{display:block;white-space:nowrap;color:#7cf29a;opacity:0;animation:yl-ok 4.5s ease infinite}
@keyframes yl-ty{0%{width:0}26%,92%{width:calc(10ch + 2px)}100%{width:0}}
@keyframes yl-bc{50%{border-right-color:transparent}}
@keyframes yl-ok{0%,32%{opacity:0;transform:translateY(3px)}40%,90%{opacity:1;transform:none}100%{opacity:0}}
.yl .m.wave{flex-direction:row;align-items:center;gap:3px}
.yl .wave i{width:4px;height:6px;border-radius:2px;background:#fff;animation:yl-wv .9s ease-in-out infinite alternate;animation-delay:calc(var(--d) * -.11s)}
@keyframes yl-wv{to{height:var(--h)}}
.yl .m.doc{position:relative;width:78px;height:52px;flex-direction:row;align-items:center;justify-content:center;gap:0}
.yl .doc .pg{position:absolute;width:34px;height:44px;border-radius:5px;background:rgba(255,255,255,.3);transform:translateX(-10px) rotate(-9deg)}
.yl .doc .pf{position:relative;width:36px;height:46px;border-radius:5px;background:#fff;padding:8px 6px;display:flex;flex-direction:column;gap:5px;box-shadow:0 3px 0 rgba(10,20,60,.22);transform:translateX(4px)}
.yl .doc .pf i{display:block;height:3px;border-radius:2px;background:#c9d6f5;position:relative;overflow:hidden}
.yl .doc .pf i.t{height:4px;width:58%;background:#3b6fd4}
.yl .doc .pf i:nth-child(3){width:86%}.yl .doc .pf i:nth-child(4){width:70%}.yl .doc .pf i:nth-child(5){width:80%}
.yl .doc .pf i:not(.t)::after{content:"";position:absolute;inset:0;background:#ffd54a;transform-origin:left;transform:scaleX(0);animation:yl-hlp 5s ease-in-out infinite}
.yl .doc .pf i:nth-child(3)::after{animation-delay:.7s}.yl .doc .pf i:nth-child(4)::after{animation-delay:1.5s}.yl .doc .pf i:nth-child(5)::after{animation-delay:2.3s}
.yl .doc .sp{position:absolute;right:6px;top:0;width:12px;height:12px;background:#ffd54a;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);animation:yl-spk 2.4s ease-in-out infinite}
@keyframes yl-spk{50%{transform:scale(1.35) rotate(20deg);opacity:.7}}
.yl .trial{margin-top:54px;border-radius:34px;background:#14192b;color:#fff;padding:48px 44px;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;position:relative;overflow:hidden;animation:yl-rise .75s .3s cubic-bezier(.2,.8,.2,1) backwards;box-shadow:0 20px 40px -20px rgba(0,0,0,.4)}
.yl .trial::before{content:"";position:absolute;right:-120px;top:-140px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(247,147,30,.28),transparent 68%);pointer-events:none}
.yl .trial>*{position:relative}
.dark .yl .trial{background:#171d38;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.yl .trial h3{font-family:"Fraunces","Instrument Serif",Georgia,serif;font-weight:600;font-size:clamp(20px,2.4vw,28px);line-height:1.12;letter-spacing:-.02em;margin:0 0 12px}
.yl .trial h3 em{display:block;font-style:italic;font-weight:500;color:#f7931e}
.yl .trial p{margin:0 0 24px;font-size:14px;color:rgba(255,255,255,.8);max-width:52ch;line-height:1.6}
.yl .tbtn{background:#f7931e;color:#14192b;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;box-shadow:0 4px 0 rgba(0,0,0,.35);transition:transform .15s,box-shadow .15s}
.yl .tbtn:hover{transform:translateY(2px);box-shadow:0 2px 0 rgba(0,0,0,.35)}
.yl .tbtn:active{transform:translateY(4px);box-shadow:none}
.yl .tr{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.yl .tr li{display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.07);border-radius:18px;padding:16px 20px}
.yl .tr svg{width:26px;height:26px;flex:none;margin-top:1px;fill:rgba(247,147,30,.18);stroke:#f7931e;stroke-width:1.6}
.yl .tr svg path{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.yl .tr b{display:block;font-size:14px;font-weight:600}
.yl .tr span{display:block;font-size:12.5px;color:rgba(255,255,255,.7);margin-top:2px}
@media(max-width:900px){.yl .trial{grid-template-columns:1fr;padding:36px 26px;gap:30px}}
.yl .toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px);background:var(--ink);color:var(--page);padding:10px 18px;border-radius:12px;font-weight:600;font-size:13px;opacity:0;pointer-events:none;transition:.3s;z-index:100;box-shadow:0 8px 16px rgba(0,0,0,0.2)}
.yl .toast.show{opacity:1;transform:translate(-50%,0)}
.yl .foot{margin-top:auto;border-top:1px solid rgba(100,109,132,.18);background:var(--page)}
.yl .fwrap{max-width:1120px;margin:0 auto;padding:24px 20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.yl .fcopy{font-size:13px;color:var(--muted)}
.yl .fmail{font-size:13px;color:var(--muted);text-decoration:none;margin-right:auto;transition:color .15s}
.yl .fmail:hover{color:var(--ink)}
.yl .fsocial{display:flex;gap:8px}
.yl .fsocial a{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;color:var(--muted);transition:color .15s,background .15s}
.yl .fsocial a:hover{color:#f7931e;background:rgba(247,147,30,.1)}
.yl .fsocial svg{width:17px;height:17px;fill:currentColor}
@media(max-width:600px){.yl .fwrap{flex-direction:column;gap:12px;text-align:center}.yl .fmail{margin-right:0}}
@media(prefers-reduced-motion:reduce){.yl *{animation:none!important;transition:none!important}}
`;

export default LandingPage;
