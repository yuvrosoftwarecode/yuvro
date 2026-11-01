import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, History } from "lucide-react";

export const IR_CSS = `
.ir{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif !important;--page:#f3f5fa;--card:#ffffff;--ink:#14192b;--body:#3f475c;--muted:#6f7890;--soft:#eef2fb;--brand:#4a7bdc;--bar:#e6eaf4;--bad:#c9372c;--bad-bg:#fdeae7;--warn:#9a5b00;--warn-bg:#fdf1d6;--good:#17744d;--good-bg:#e1f4ea;background:var(--page);color:var(--ink);font-family:inherit;line-height:1.5;padding:32px 20px 60px}
@media (prefers-color-scheme:dark){.ir{--page:#0b1020;--card:#141b33;--ink:#f1f4fc;--body:#c3cbe0;--muted:#97a2bf;--soft:#1b2546;--bar:#232d4f;--bad:#ff8a7e;--bad-bg:#3a1f26;--warn:#f5c26b;--warn-bg:#3a3017;--good:#6fd9a4;--good-bg:#173528}}
.dark .ir{--page:#0b1020;--card:#141b33;--ink:#f1f4fc;--body:#c3cbe0;--muted:#97a2bf;--soft:#1b2546;--bar:#232d4f;--bad:#ff8a7e;--bad-bg:#3a1f26;--warn:#f5c26b;--warn-bg:#3a3017;--good:#6fd9a4;--good-bg:#173528}
.ir,.ir *{box-sizing:border-box}
:where(.ir) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.ir :focus-visible{outline:3px solid var(--brand);outline-offset:3px;border-radius:8px}
.ir-wrap{max-width:1080px;margin:0 auto}
.ir-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
.ir-back{font-size:14px;font-weight:500;color:var(--muted);display:inline-block;margin-bottom:10px}
.ir-back:hover{color:var(--ink)}
.ir-h1{font-family:inherit;font-weight:600;font-size:24px;letter-spacing:-.01em;line-height:1.05;margin:0 0 6px;color:var(--ink)}
.ir-meta{margin:0;color:var(--muted);font-size:14px}
.ir-acts{display:flex;align-items:center;gap:22px}
.ir-link{font-size:14px;font-weight:500;color:var(--muted)}
.ir-link:hover{color:var(--ink)}
.ir-dl{background:var(--brand);color:#fff;font-weight:500;font-size:14px;padding:10px 18px;border-radius:10px;transition:transform .15s}
.ir-dl:hover{transform:translateY(-2px)}
.ir-msg{position:relative;overflow:hidden;display:flex;gap:22px;align-items:flex-start;border-radius:20px;padding:30px 34px;margin-bottom:22px}
.ir-msg .ir-em{font-size:46px;line-height:1.1;flex:none}
.ir-msg h3{margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:-.01em;color:var(--ink)}
.ir-msg p{margin:0 0 14px;font-size:15px;line-height:1.65;color:var(--body);max-width:640px}
.ir-msg .ir-macts{display:flex;gap:26px;flex-wrap:wrap}
.ir-msg .ir-macts button{font-size:15px;font-weight:600;color:var(--brand)}
.ir-msg .ir-macts button:hover{text-decoration:underline}
.ir-msg.low{background:#edf1f9}
.ir-msg.mid{background:#fdf6e0}
.ir-msg.high{background:#e6f4ec}
@media (prefers-color-scheme:dark){.ir-msg.low{background:#1b2546}.ir-msg.mid{background:#3a3017}.ir-msg.high{background:#173528}}
.dark .ir-msg.low{background:#1b2546}
.dark .ir-msg.mid{background:#3a3017}
.dark .ir-msg.high{background:#173528}
.ir-cf{position:absolute;top:-14px;width:8px;height:12px;border-radius:2px;opacity:.9;animation:irfall linear infinite}
@keyframes irfall{to{transform:translateY(150px) rotate(260deg)}}
.ir-hero{display:grid;grid-template-columns:340px 1fr;gap:20px;margin-bottom:34px}
@media(max-width:860px){.ir-hero{grid-template-columns:1fr}}
.ir-score{border-radius:24px;padding:28px 30px;background:var(--b-bg);color:var(--b-fg);display:flex;flex-direction:column}
.ir-lab{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin:0 0 12px;color:var(--muted)}
.ir-score .ir-lab{color:inherit;margin:0}
.ir-band{font-size:14px;font-weight:500;margin-top:4px}
.ir-big{font-family:inherit;font-weight:600;font-size:72px;line-height:1;letter-spacing:-.03em;margin:22px 0 4px;display:flex;align-items:baseline;gap:8px}
.ir-big span{font-family:inherit;font-size:16px;font-weight:500;letter-spacing:0;opacity:.7}
.ir-meter{height:8px;border-radius:4px;background:color-mix(in srgb,var(--b-fg) 18%,transparent);overflow:hidden;margin:14px 0}
.ir-meter i{display:block;height:100%;background:var(--b-fg);border-radius:4px;transition:width .8s cubic-bezier(.3,.9,.3,1)}
.ir-sum{background:var(--card);border:1px solid var(--bar);border-radius:16px;padding:28px 32px}
.ir-sum>p.ir-text{margin:0 0 22px;color:var(--body);font-size:14.5px;line-height:1.7}
.ir-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:620px){.ir-two{grid-template-columns:1fr}}
.ir-two div{border-radius:12px;padding:16px 18px}
.ir-s{background:var(--good-bg);color:var(--good)}
.ir-f{background:var(--warn-bg);color:var(--warn)}
.ir-two b{display:block;font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}
.ir-two p{margin:0;font-size:14.5px;font-weight:400;color:var(--ink);line-height:1.45}
.ir-tabs{display:flex;gap:30px;margin-bottom:22px;flex-wrap:wrap}
.ir-tabs button{font-size:14.5px;font-weight:500;color:var(--muted);padding:6px 0 10px;position:relative}
.ir-tabs button.on{color:var(--ink)}
.ir-tabs button.on::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:3px;background:var(--brand)}
.ir-tabs button:not(.on):hover{color:var(--ink)}
.ir-sg{display:grid;grid-template-columns:380px 1fr;gap:16px;align-items:start}
.ir-sk{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ir-map{background:var(--card);border:1px solid var(--bar);border-radius:12px;padding:22px 20px 20px}
.ir-map .ir-lab{margin:0 0 6px 4px}
.ir-map svg{display:block;width:100%;height:auto}
.ir-map text{font-family:inherit}
.ir-poly{transform-origin:190px 158px;animation:ir-grow .9s cubic-bezier(.3,.9,.3,1)}
@keyframes ir-grow{from{transform:scale(0);opacity:0}}
.ir-mapnote{margin:4px 0 0;font-size:13px;color:var(--muted);text-align:center}
@media(max-width:980px){.ir-sg{grid-template-columns:1fr}.ir-map{max-width:460px}}
@media(max-width:620px){.ir-sk{grid-template-columns:1fr}.ir-map{max-width:none}}
.ir-skill{background:var(--card);border:1px solid var(--bar);border-radius:12px;padding:22px 24px}
.ir-skill .r{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.ir-skill h3{margin:0;font-size:15px;font-weight:500;color:var(--ink)}
.ir-skill .n{font-family:inherit;font-weight:600;font-size:18px}
.ir-skill .n small{font-family:inherit;font-size:13px;color:var(--muted);font-weight:500}
.ir-track{height:6px;border-radius:3px;background:var(--bar);margin-bottom:14px;overflow:hidden}
.ir-track i{display:block;height:100%;border-radius:3px}
.ir-skill p{margin:0 0 12px;font-size:14px;color:var(--body);line-height:1.55}
.ir-learn{font-size:14px;font-weight:700;color:var(--brand)}
.ir-learn:hover{text-decoration:underline;text-underline-offset:4px}
.ir-qa{background:var(--card);border:1px solid var(--bar);border-radius:12px;margin-bottom:10px;overflow:hidden}
.ir-qh{display:flex;align-items:center;gap:16px;width:100%;padding:16px 20px}
.ir-qh .no{font-family:inherit;font-weight:600;font-size:18px;color:var(--muted);width:26px}
.ir-qh .t{flex:1}
.ir-qh .t b{display:block;font-size:15px;font-weight:500;color:var(--ink)}
.ir-qh .t span{font-size:13px;color:var(--muted)}
.ir-qh .sc{font-weight:500;font-size:14px;padding:4px 12px;border-radius:999px}
.ir-qh .tg{font-size:13px;font-weight:500;color:var(--brand);min-width:90px;text-align:right}
.ir-qb{padding:0 20px 20px 62px;border-top:1px solid var(--bar)}
.ir-qb .ir-lab{margin:18px 0 6px}
.ir-qb p{margin:0;color:var(--body);font-size:14px;line-height:1.65}
.ir-qb p.you{background:var(--soft);border-radius:8px;padding:14px 16px}
@media(max-width:620px){.ir-qb{padding-left:24px}.ir-qh .tg{display:none}}
.ir-tr{max-width:740px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.ir-m{max-width:82%}
.ir-m.me{align-self:flex-end;text-align:right}
.ir-m .w{font-size:12.5px;color:var(--muted);margin-bottom:4px}
.ir-m .b{display:inline-block;text-align:left;padding:12px 16px;border:1px solid var(--bar);border-radius:14px 14px 14px 4px;background:var(--card);color:var(--ink);font-size:14.5px;line-height:1.55}
.ir-m.me .b{background:var(--brand);border-color:var(--brand);color:#fff;border-radius:14px 14px 4px 14px}
.ir-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,0);background:var(--ink);color:var(--page);padding:11px 18px;border-radius:12px;font-weight:600;font-size:14px;z-index:50}
.ir-attempts{display:flex;flex-direction:column;gap:16px}
.ir-att-summary{background:var(--card);border:1px solid var(--bar);border-radius:16px;padding:22px 26px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.ir-att-sum-item b{display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.ir-att-sum-item span{font-size:22px;font-weight:700;color:var(--ink)}
.ir-attempt-card{background:var(--card);border:1px solid var(--bar);border-radius:16px;padding:24px 28px;transition:border-color .15s,box-shadow .15s,transform .15s}
.ir-attempt-card:hover{border-color:color-mix(in srgb,var(--brand) 50%,var(--bar));transform:translateY(-1px)}
.ir-attempt-card.active{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand)}
.ir-att-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.ir-att-title{font-size:17px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:10px}
.ir-att-pill{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;padding:3px 9px;border-radius:999px;background:var(--soft);color:var(--muted)}
.ir-att-pill.active{background:var(--good-bg);color:var(--good)}
.ir-att-pill.latest{background:var(--warn-bg);color:var(--warn)}
.ir-att-pill.best{background:#e8f0fe;color:#1a73e8}
.ir-att-meta{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:14px;margin-top:6px;flex-wrap:wrap}
.ir-att-body{display:grid;grid-template-columns:190px 1fr auto;gap:24px;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--bar)}
@media(max-width:768px){.ir-att-body{grid-template-columns:1fr;gap:16px}}
.ir-att-score{font-size:36px;font-weight:700;color:var(--ink);line-height:1;display:flex;align-items:baseline;gap:6px}
.ir-att-score small{font-size:14px;font-weight:500;color:var(--muted)}
.ir-att-badge{display:inline-block;font-size:12px;font-weight:600;padding:3px 9px;border-radius:6px;margin-top:6px}
.ir-att-desc{font-size:14px;color:var(--body);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ir-att-btn{font-size:13.5px;font-weight:600;padding:9px 18px;border-radius:9px;background:var(--soft);color:var(--brand);transition:background .15s,color .15s;cursor:pointer}
.ir-att-btn:hover{background:var(--brand);color:#fff}
.ir-att-btn.active{background:var(--good-bg);color:var(--good);cursor:default}
.ir-att-dropdown-root{position:relative;display:inline-flex;align-items:center}
.ir-att-trigger-btn{display:inline-flex;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;border:1px solid var(--bar);background:var(--card);color:var(--ink);font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s ease;box-shadow:0 1px 3px rgba(0,0,0,0.04);line-height:1.2}
.ir-att-trigger-btn:hover{border-color:var(--brand);background:var(--soft);transform:translateY(-1px)}
.ir-att-trigger-btn.open{border-color:var(--brand);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 25%,transparent)}
.ir-att-trigger-left{display:flex;align-items:center;gap:6px}
.ir-att-trigger-name{font-weight:600;color:var(--ink)}
.ir-att-trigger-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:1.5px 7px;border-radius:999px;line-height:1.2}
.ir-att-trigger-chevron{color:var(--muted);transition:transform .2s ease}
.ir-att-trigger-chevron.rotate-180{transform:rotate(180deg)}
.ir-att-menu{position:absolute;top:calc(100% + 8px);left:0;width:340px;background:var(--card);border:1px solid var(--bar);border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,0.14),0 4px 10px rgba(0,0,0,0.06);z-index:60;overflow:hidden;animation:irFadeIn .15s ease}
@keyframes irFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.dark .ir-att-menu{box-shadow:0 16px 36px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.3)}
.ir-att-menu-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--bar);background:var(--soft);font-size:11.5px;font-weight:600;color:var(--muted);letter-spacing:.02em;text-transform:uppercase}
.ir-att-menu-hint{font-size:11px;font-weight:500;text-transform:none;opacity:.8}
.ir-att-menu-list{max-height:260px;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:3px}
.ir-att-menu-list::-webkit-scrollbar{width:5px}
.ir-att-menu-list::-webkit-scrollbar-thumb{background:var(--bar);border-radius:999px}
.ir-att-menu-item{display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 12px;border-radius:8px;border:none;background:transparent;text-align:left;cursor:pointer;transition:background .15s;gap:12px}
.ir-att-menu-item:hover{background:var(--soft)}
.ir-att-menu-item.selected{background:color-mix(in srgb,var(--brand) 10%,var(--soft));position:relative}
.ir-att-menu-item.selected::before{content:"";position:absolute;left:3px;top:8px;bottom:8px;width:3px;border-radius:999px;background:var(--brand)}
.ir-att-item-main{display:flex;flex-direction:column;gap:3px;flex:1}
.ir-att-item-title{display:flex;align-items:center;gap:6px;font-size:13.5px;color:var(--ink)}
.ir-att-item-title b{font-weight:600}
.ir-att-item-sub{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted)}
.ir-att-item-score{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.ir-att-score-chip{font-size:12px;font-weight:700;padding:2px 7px;border-radius:6px;line-height:1.2}
.ir-att-score-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.ir-att-menu-footer{padding:8px;border-top:1px solid var(--bar);background:var(--card)}
.ir-att-view-all-btn{width:100%;padding:8px 12px;border-radius:8px;background:var(--soft);color:var(--brand);font-size:12.5px;font-weight:600;text-align:center;cursor:pointer;transition:background .15s,color .15s}
.ir-att-view-all-btn:hover{background:var(--brand);color:#fff}
@media(prefers-reduced-motion:reduce){.ir *{transition:none!important;animation:none!important}}
`;

/* ---------- data shape: map your API response to this ---------- */
export type Report = {
  id?: string;
  role: string;            // "Machine Learning Engineer"
  duration: string;        // "0m 11s"
  date: string;            // "30 Oct 2026"
  score: number;           // 0 to 100
  summary: string;
  strength: string;
  focus: string;
  competencies: { name: string; value: number }[]; // value 0 to 10, 3 or more items
  skills: { name: string; score: number; description: string }[]; // score 0 to 10
  questions: { question: string; category: string; score: number; answer: string; missing: string; tip: string }[]; // score 0 to 100
  transcript: { from: "ai" | "me"; text: string; time: string }[];
};

export type AttemptItem = {
  id: string;
  attemptNumber: number;
  date: string;
  duration: string;
  score: number;
  status: string;
  summary?: string;
  strength?: string;
  focus?: string;
  report?: Report;
};

export const SAMPLE: Report = {
  role: "Machine Learning Engineer",
  duration: "0m 11s",
  date: "30 Oct 2026",
  score: 5,
  summary:
    "The candidate did not answer the opening question. Instead of giving a professional introduction, they repeated the interviewer’s question back word for word. That points to a gap in interview preparation and communication, and the response gave no information about background, experience or fit for the Machine Learning Engineer role. The candidate would benefit from practising the basics of an interview before taking another one.",
  strength: "Communicated technical concepts clearly.",
  focus: "Practise basic interview answers, starting with a professional self-introduction.",
  competencies: [
    { name: "Technical Proficiency", value: 3 },
    { name: "Communication", value: 2 },
    { name: "Problem Solving", value: 1 },
    { name: "Adaptability", value: 2 },
  ],
  skills: [
    { name: "Active Listening", score: 1, description: "The candidate repeated the interviewer’s words instead of answering the question that was asked." },
    { name: "Self-Presentation", score: 0, description: "No self-introduction was given. A short introduction is the foundation of every interview." },
    { name: "Interview Preparedness", score: 0, description: "The response suggests no preparation. A short, rehearsed introduction would have helped." },
    { name: "Professional Communication", score: 0, description: "No professional communication was shown. The answer did not include background, skills or goals." },
  ],
  questions: [
    {
      question: "Could you please introduce yourself?",
      category: "Behavioral",
      score: 5,
      answer: "Because see I will find your AI interviewer today we’ll be discussing the machine learning engineer role to start could you please introduce yourself",
      missing: "The answer repeated the question. It had no name, background, experience or reason for applying.",
      tip: "Use three short parts: who you are, what you have built, and what you want next. For example: your name, one project you are proud of, and why this role.",
    },
  ],
  transcript: [
    { from: "ai", text: "Hello! I’m your AI interviewer today. We’ll be discussing the Machine Learning Engineer role. To start, could you please introduce yourself?", time: "16:12" },
    { from: "me", text: "Because see I will find your AI interviewer today we’ll be discussing the machine learning engineer role to start could you please introduce yourself", time: "16:12" },
    { from: "ai", text: "May I know who I’m speaking with?", time: "16:12" },
    { from: "me", text: "So that’s for the reference report right I was just trying", time: "16:12" },
    { from: "ai", text: "Sorry, I missed your name. What should I call you?", time: "16:12" },
  ],
};

const band = (s: number) =>
  s < 40
    ? { label: "Needs work", bg: "var(--bad-bg)", fg: "var(--bad)" }
    : s < 70
    ? { label: "Getting there", bg: "var(--warn-bg)", fg: "var(--warn)" }
    : { label: "Strong", bg: "var(--good-bg)", fg: "var(--good)" };

const tone = (n: number) => (n < 4 ? "bad" : n < 7 ? "warn" : "good");

/* ---------- score-based result message ---------- */
const CF_COLORS = ["#4a7bdc", "#f7931e", "#e05d8f", "#3aa76d", "#8b5cf6"];
function Confetti() {
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          className="ir-cf"
          style={{
            left: `${(i * 53) % 100}%`,
            background: CF_COLORS[i % CF_COLORS.length],
            animationDuration: `${2.4 + (i % 5) * 0.5}s`,
            animationDelay: `${(i % 7) * 0.35}s`,
            transform: `rotate(${(i * 47) % 360}deg)`,
          }}
        />
      ))}
    </>
  );
}

function ResultMessage({ r, onTryAgain, onShare, onCopy }: { r: Report; onTryAgain?: () => void; onShare: () => void; onCopy: () => void }) {
  if (r.score < 40)
    return (
      <div className="ir-msg low">
        <span className="ir-em">🤗</span>
        <div>
          <h3>Every expert started right here, buddy.</h3>
          <p>This round didn’t go your way, and that’s okay. Practice is the safest place to stumble. Pick one focus area and go again.</p>
          <div className="ir-macts">
            <button onClick={onTryAgain}>Try again →</button>
          </div>
        </div>
      </div>
    );
  if (r.score < 80)
    return (
      <div className="ir-msg mid">
        <span className="ir-em">💪</span>
        <div>
          <h3>Good progress, buddy! You’re closer than you think.</h3>
          <p>You’re building the right habits. {80 - r.score} more points and you’re in the strong zone. Your next step: {r.focus.charAt(0).toLowerCase() + r.focus.slice(1)}</p>
          <div className="ir-macts">
            <button onClick={onTryAgain}>Practise again →</button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="ir-msg high">
      <Confetti />
      <span className="ir-em">🎉</span>
      <div>
        <h3>You nailed it, buddy! Time to celebrate.</h3>
        <p>You scored {r.score} out of 100. Share it with your connections and let them cheer for you.</p>
        <div className="ir-macts">
          <button onClick={onShare}>Share with your connections →</button>
          <button onClick={onCopy}>Copy link →</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- competency map (radar) ---------- */
function Radar({ items }: { items: { name: string; value: number }[] }) {
  const n = items.length, cx = 190, cy = 158, R = 92, st = (2 * Math.PI) / n;
  const ang = (i: number) => -Math.PI / 2 + (i + 0.5) * st;
  const pt = (i: number, f: number) => [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f];
  const ring = (f: number) => items.map((_, i) => pt(i, f).map((v) => v.toFixed(1)).join(",")).join(" ");
  const data = items.map((c, i) => pt(i, Math.max(c.value, 0.3) / 10));
  return (
    <svg viewBox="0 0 380 300" role="img" aria-label="Competency map">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="var(--bar)" strokeWidth={1.5} />
      ))}
      {items.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--bar)" strokeWidth={1.5} />;
      })}
      <g className="ir-poly">
        <polygon
          points={data.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="var(--brand)" fillOpacity={0.2} stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round"
        />
        {data.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill="var(--brand)" />)}
      </g>
      {items.map((c, i) => {
        const p = pt(i, 1.14);
        const up = Math.sin(ang(i)) < 0;
        const y = up ? p[1] - 20 : p[1] + 15;
        return (
          <g key={c.name}>
            <text x={p[0]} y={y} textAnchor="middle" fontSize={13} fill="var(--muted)">{c.name}</text>
            <text x={p[0]} y={y + 17} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--ink)">{c.value} / 10</text>
          </g>
        );
      })}
    </svg>
  );
}

function AttemptDropdown({
  attempts,
  currentAttemptId,
  currentReport,
  onSelectAttempt,
  onViewAllAttempts,
}: {
  attempts: AttemptItem[];
  currentAttemptId?: string;
  currentReport: Report;
  onSelectAttempt?: (id: string) => void;
  onViewAllAttempts?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const activeAttempt =
    (currentAttemptId ? attempts.find((a) => a.id === currentAttemptId) : null) ||
    attempts.find(
      (a) =>
        a.report?.id === currentReport.id ||
        (a.score === currentReport.score && a.duration === currentReport.duration)
    ) ||
    attempts[0];

  const currentScore = activeAttempt ? activeAttempt.score : currentReport.score;
  const currentBand = band(currentScore);
  const currentNum = activeAttempt ? activeAttempt.attemptNumber : attempts.length;

  if (attempts.length <= 1) {
    return (
      <span className="ir-att-pill active" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <History style={{ width: 12, height: 12 }} />
        <span>Attempt #{currentNum}</span>
        <span>•</span>
        <span>{currentScore}/100</span>
      </span>
    );
  }

  return (
    <div className="ir-att-dropdown-root" ref={containerRef}>
      <button
        type="button"
        className={`ir-att-trigger-btn ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="ir-att-trigger-left">
          <History style={{ width: 13, height: 13, opacity: 0.7 }} />
          <span className="ir-att-trigger-name">Attempt #{currentNum}</span>
          <span
            className="ir-att-trigger-badge"
            style={{ background: currentBand.bg, color: currentBand.fg }}
          >
            {currentScore}/100
          </span>
        </span>
        <ChevronDown
          className={`ir-att-trigger-chevron ${isOpen ? "rotate-180" : ""}`}
          style={{ width: 13, height: 13 }}
        />
      </button>

      {isOpen && (
        <div className="ir-att-menu">
          <div className="ir-att-menu-header">
            <span>Interview history ({attempts.length})</span>
            <span className="ir-att-menu-hint">Click to switch</span>
          </div>

          <div className="ir-att-menu-list">
            {attempts.map((att) => {
              const bnd = band(att.score);
              const isSelected = activeAttempt ? att.id === activeAttempt.id : false;
              const isBest =
                att.score === Math.max(...attempts.map((a) => a.score)) && att.score > 0;

              return (
                <button
                  key={att.id}
                  type="button"
                  className={`ir-att-menu-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelectAttempt?.(att.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="ir-att-item-main">
                    <div className="ir-att-item-title">
                      <b>Attempt #{att.attemptNumber}</b>
                      {isSelected && <span className="ir-att-pill active">Active</span>}
                      {isBest && <span className="ir-att-pill best">Best</span>}
                    </div>
                    <div className="ir-att-item-sub">
                      <span>⏱️ {att.duration}</span>
                      <span>•</span>
                      <span>📅 {att.date}</span>
                    </div>
                  </div>

                  <div className="ir-att-item-score">
                    <span
                      className="ir-att-score-chip"
                      style={{ background: bnd.bg, color: bnd.fg }}
                    >
                      {att.score}/100
                    </span>
                    <span className="ir-att-score-label" style={{ color: bnd.fg }}>
                      {bnd.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="ir-att-menu-footer">
            <button
              type="button"
              className="ir-att-view-all-btn"
              onClick={() => {
                setIsOpen(false);
                onViewAllAttempts?.();
              }}
            >
              View all {attempts.length} attempts & statistics →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- component ---------- */
export default function InterviewReport({
  report = SAMPLE,
  attempts = [],
  currentAttemptId,
  onSelectAttempt,
  onBack,
  onTryAgain,
  onCopyLink,
  onDownload,
  onLearn,
}: {
  report?: Report;
  attempts?: AttemptItem[];
  currentAttemptId?: string;
  onSelectAttempt?: (attemptId: string) => void;
  onBack?: () => void;
  onTryAgain?: () => void;
  onCopyLink?: () => void;
  onDownload?: () => void;
  onLearn?: (skillName: string) => void;
}) {
  const r = report;
  const b = band(r.score);
  const [tab, setTab] = useState<"skills" | "qs" | "tr" | "attempts">("skills");
  const [open, setOpen] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMeter(Math.max(r.score, 2)), 80);
    return () => clearTimeout(t);
  }, [r.score]);

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };
  const copy = () => {
    if (onCopyLink) return onCopyLink();
    navigator.clipboard?.writeText(window.location.href).then(() => say("Link copied"), () => say("Copy not allowed here"));
  };
  const share = () => {
    const data = { title: `${r.role} interview report`, text: `I scored ${r.score} out of 100 in my ${r.role} mock interview on Yuvro!`, url: window.location.href };
    if (navigator.share) navigator.share(data).catch(() => {});
    else copy();
  };

  const tabs: [typeof tab, string][] = [
    ["skills", "Skills & growth"],
    ["qs", "Question analysis"],
    ["tr", "Transcript"],
    ["attempts", attempts && attempts.length > 0 ? `All attempts (${attempts.length})` : "Previous attempts"],
  ];

  return (
    <div className="ir">
      <style>{IR_CSS}</style>
      <div className="ir-wrap">
        <header className="ir-top">
          <div>
            <button className="ir-back" onClick={onBack}>← Back to interviews</button>
            <h1 className="ir-h1">{r.role}</h1>
            <div className="ir-meta" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span>Interview report · {r.duration} · {r.date}</span>
              {attempts && attempts.length > 0 && (
                <>
                  <span style={{ color: "var(--muted)", opacity: 0.6 }}>·</span>
                  <AttemptDropdown
                    attempts={attempts}
                    currentAttemptId={currentAttemptId}
                    currentReport={r}
                    onSelectAttempt={onSelectAttempt}
                    onViewAllAttempts={() => setTab("attempts")}
                  />
                </>
              )}
            </div>
          </div>
          <div className="ir-acts">
            <button className="ir-link" onClick={onTryAgain}>Try again</button>
            <button className="ir-link" onClick={copy}>Copy link</button>
            <button className="ir-dl" onClick={() => (onDownload ? onDownload() : window.print())}>Download PDF</button>
          </div>
        </header>

        <ResultMessage r={r} onTryAgain={onTryAgain} onShare={share} onCopy={copy} />

        <section className="ir-hero">
          <div className="ir-score" style={{ ["--b-bg" as string]: b.bg, ["--b-fg" as string]: b.fg } as CSSProperties}>
            <p className="ir-lab">Overall score</p>
            <div className="ir-band">{b.label}</div>
            <div className="ir-big">{r.score}<span>/ 100</span></div>
            <div className="ir-meter"><i style={{ width: meter + "%" }} /></div>
          </div>
          <div className="ir-sum">
            <p className="ir-lab">AI summary</p>
            <p className="ir-text">{r.summary}</p>
            <div className="ir-two">
              <div className="ir-s"><b>Top strength</b><p>{r.strength}</p></div>
              <div className="ir-f"><b>Focus next</b><p>{r.focus}</p></div>
            </div>
          </div>
        </section>

        <div className="ir-tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "skills" && (
          <div className="ir-sg">
            <div className="ir-map">
              <p className="ir-lab">Competency map</p>
              <Radar items={r.competencies} />
              <p className="ir-mapnote">Scored out of 10 for each core area of this role.</p>
            </div>
            <div className="ir-sk">
              {r.skills.map((k) => {
                const t = tone(k.score);
                return (
                  <div className="ir-skill" key={k.name}>
                    <div className="r">
                      <h3>{k.name}</h3>
                      <span className="n" style={{ color: `var(--${t})` }}>{k.score}<small> / 10</small></span>
                    </div>
                    <div className="ir-track"><i style={{ width: Math.max(k.score * 10, 2) + "%", background: `var(--${t})` }} /></div>
                    <p>{k.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "qs" &&
          r.questions.map((q, i) => {
            const t = band(q.score);
            const isOpen = open === i;
            return (
              <div className="ir-qa" key={i}>
                <button className="ir-qh" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                  <span className="no">{i + 1}</span>
                  <span className="t"><b>{q.question}</b><span>{q.category}</span></span>
                  <span className="sc" style={{ background: t.bg, color: t.fg }}>{q.score}%</span>
                  <span className="tg">{isOpen ? "Hide" : "Show details"}</span>
                </button>
                {isOpen && (
                  <div className="ir-qb">
                    <p className="ir-lab">Your answer</p>
                    <p className="you">{q.answer}</p>
                    <p className="ir-lab">What was missing</p>
                    <p>{q.missing}</p>
                    <p className="ir-lab">Try this next time</p>
                    <p>{q.tip}</p>
                  </div>
                )}
              </div>
            );
          })}

        {tab === "tr" && (
          <div className="ir-tr">
            {r.transcript.map((m, i) => (
              <div className={"ir-m " + m.from} key={i}>
                <div className="w">{m.from === "ai" ? "Interviewer" : "You"} · {m.time}</div>
                <div className="b">{m.text}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "attempts" && (
          <div className="ir-attempts">
            {attempts.length > 0 && (() => {
              const scores = attempts.map((a) => a.score);
              const bestScore = Math.max(...scores);
              const latestAttempt = attempts[0];
              const completedCount = attempts.filter((a) => a.status === "completed" || a.score > 0).length;

              return (
                <div className="ir-att-summary">
                  <div className="ir-att-sum-item">
                    <b>Total attempts</b>
                    <span>{attempts.length}</span>
                  </div>
                  <div className="ir-att-sum-item">
                    <b>Best score</b>
                    <span style={{ color: "var(--good)" }}>
                      {bestScore} <small style={{ fontSize: "14px", fontWeight: 500, color: "var(--muted)" }}>/ 100</small>
                    </span>
                  </div>
                  <div className="ir-att-sum-item">
                    <b>Latest score</b>
                    <span>
                      {latestAttempt?.score ?? 0} <small style={{ fontSize: "14px", fontWeight: 500, color: "var(--muted)" }}>/ 100</small>
                    </span>
                  </div>
                  <div className="ir-att-sum-item">
                    <b>Completed rounds</b>
                    <span>{completedCount}</span>
                  </div>
                  <div>
                    <button className="ir-dl" onClick={onTryAgain}>
                      + Take new attempt
                    </button>
                  </div>
                </div>
              );
            })()}

            {attempts.length === 0 ? (
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--bar)",
                  borderRadius: "16px",
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--muted)",
                }}
              >
                <p style={{ margin: 0, fontSize: "15px" }}>No previous attempts found for this interview.</p>
                <button
                  className="ir-dl"
                  style={{ marginTop: "16px", display: "inline-block" }}
                  onClick={onTryAgain}
                >
                  Start your first attempt
                </button>
              </div>
            ) : (
              attempts.map((att, idx) => {
                const bnd = band(att.score);
                const isViewing = currentAttemptId
                  ? att.id === currentAttemptId
                  : att.report?.id === r.id || (att.score === r.score && att.duration === r.duration);
                const isLatest = idx === 0;
                const isBest = att.score === Math.max(...attempts.map((a) => a.score)) && att.score > 0;

                return (
                  <div
                    key={att.id || idx}
                    className={`ir-attempt-card ${isViewing ? "active" : ""}`}
                  >
                    <div className="ir-att-top">
                      <div>
                        <div className="ir-att-title">
                          <span>Attempt #{att.attemptNumber}</span>
                          {isViewing && <span className="ir-att-pill active">Viewing now</span>}
                          {isLatest && !isViewing && <span className="ir-att-pill latest">Latest</span>}
                          {isBest && <span className="ir-att-pill best">Best score</span>}
                          <span
                            className="ir-att-pill"
                            style={{
                              background: att.status === "completed" ? "var(--good-bg)" : "var(--soft)",
                              color: att.status === "completed" ? "var(--good)" : "var(--muted)",
                            }}
                          >
                            {att.status === "completed" ? "Completed" : att.status}
                          </span>
                        </div>
                        <div className="ir-att-meta">
                          <span>📅 {att.date}</span>
                          <span>⏱️ {att.duration}</span>
                          {att.report?.questions?.length ? (
                            <span>💬 {att.report.questions.length} questions evaluated</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="ir-att-body">
                      <div>
                        <div className="ir-att-score">
                          {att.score}
                          <small>/ 100</small>
                        </div>
                        <div
                          className="ir-att-badge"
                          style={{ background: bnd.bg, color: bnd.fg }}
                        >
                          {bnd.label}
                        </div>
                        <div className="ir-track" style={{ marginTop: "8px", maxWidth: "140px" }}>
                          <i
                            style={{
                              width: `${Math.max(att.score, 4)}%`,
                              background: bnd.fg,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="ir-att-desc">
                          {att.summary || "Performance evaluation and key insights recorded."}
                        </p>
                        {att.strength && (
                          <div style={{ marginTop: "8px", fontSize: "12.5px", color: "var(--good)" }}>
                            <b>Top strength:</b> {att.strength}
                          </div>
                        )}
                        {att.focus && (
                          <div style={{ marginTop: "4px", fontSize: "12.5px", color: "var(--warn)" }}>
                            <b>Focus next:</b> {att.focus}
                          </div>
                        )}
                      </div>

                      <div>
                        {isViewing ? (
                          <span className="ir-att-btn active">
                            ✓ Active report
                          </span>
                        ) : (
                          <button
                            className="ir-att-btn"
                            onClick={() => {
                              onSelectAttempt?.(att.id);
                              setTab("skills");
                            }}
                          >
                            View report →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {toast && <div className="ir-toast" role="status">{toast}</div>}
    </div>
  );
}