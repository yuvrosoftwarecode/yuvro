import { useEffect, useMemo, useRef } from "react";

const CSS = `
.lh{--page:#f8f9fb;--card:#ffffff;--ink:#14192b;--muted:#666e84;--line:#e4e8f0;--brand:#4a7bdc;--sun:#ffd54a;--mug:#4a7bdc;--mugdark:#3a63b8;--steam:#aab4cc;--tag:#fff6c9;--tagink:#4a3c00}
@media (prefers-color-scheme:dark){.lh{--page:#0d1120;--card:#151b30;--ink:#f1f4fc;--muted:#a1abc4;--line:#252d48;--steam:#6c7898;--tag:#3b3410;--tagink:#ffe9a0;--mug:#5c8ae6;--mugdark:#4572cf}}
.dark .lh{--page:#0d1120;--card:#151b30;--ink:#f1f4fc;--muted:#a1abc4;--line:#252d48;--steam:#6c7898;--tag:#3b3410;--tagink:#ffe9a0;--mug:#5c8ae6;--mugdark:#4572cf}
.lh,.lh *{box-sizing:border-box}
.lh-hero{width:100%;background:var(--card);color:var(--ink);font-family:inherit;border:1px solid var(--line);border-radius:24px;display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:20px;padding:48px 52px;overflow:hidden}
@media(max-width:820px){.lh-hero{grid-template-columns:1fr;padding:32px 20px}.lh-tag{right:2%!important}}
.lh-badge{margin-bottom:12px}
.lh-hi{font-size:17px;font-weight:500;color:var(--muted);margin:0 0 14px;display:flex;align-items:center;gap:8px}
.lh-hi b{color:var(--brand);font-weight:700}
.lh h1{font-family:inherit;font-weight:600;font-size:clamp(32px,4.5vw,52px);line-height:1.06;letter-spacing:-.025em;margin:0 0 26px;color:var(--ink)}
.lh h1 i{font-weight:500;font-style:normal;white-space:nowrap}
.lh-say{display:flex;gap:16px;align-items:flex-start;margin-bottom:28px;max-width:540px}
.lh-face{flex:none;width:46px;height:46px}
.lh-face .eye,.lh .blink{transform-box:fill-box;transform-origin:center;animation:lh-blink 4s infinite}
@keyframes lh-blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
.lh-face.hop{animation:lh-hop .55s}
@keyframes lh-hop{30%{transform:translateY(-8px) rotate(-8deg)}60%{transform:translateY(0) rotate(6deg)}}
.lh-win{height:112px;overflow:hidden;flex:1}
.lh-q{font-family:inherit;font-style:italic;font-weight:500;font-size:clamp(19px,2.2vw,24px);line-height:1.3;margin:0;color:var(--ink)}
.lh-q.in{animation:lh-up .5s cubic-bezier(.2,.8,.2,1)}
.lh-q.out{animation:lh-away .3s ease-in forwards}
@keyframes lh-up{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
@keyframes lh-away{to{transform:translateY(-60%);opacity:0}}
.lh mark{color:inherit;padding:0 3px;background:linear-gradient(transparent 52%,rgba(255,213,74,.75) 52%) no-repeat;background-size:0 100%;animation:lh-hl .8s .45s ease-out forwards}
@media (prefers-color-scheme:dark){.lh mark{background-image:linear-gradient(transparent 52%,rgba(255,213,74,.4) 52%)}}
.dark .lh mark{background-image:linear-gradient(transparent 52%,rgba(255,213,74,.4) 52%)}
@keyframes lh-hl{to{background-size:100% 100%}}
.lh-cta{display:inline-flex;align-items:center;gap:8px;font:inherit;font-weight:600;font-size:14px;background:#4a7bdc;color:#fff;border:0;border-radius:10px;padding:11px 20px;cursor:pointer;transition:transform .15s,box-shadow .15s}
.lh-cta:hover{transform:translateY(-2px);box-shadow:0 8px 0 -2px rgba(74,123,220,.28)}
.lh-cta:active{transform:translateY(0)}
.lh-cta svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s}
.lh-cta:hover svg{transform:translateX(4px)}
.lh-cta:focus-visible{outline:3px solid #4a7bdc;outline-offset:3px}
.lh-scene{position:relative;max-width:340px;width:100%;justify-self:center}
.lh-scene>svg{display:block;width:100%;height:auto}
.lh-steam path{fill:none;stroke:var(--steam);stroke-width:5;stroke-linecap:round;stroke-dasharray:36 140;animation:lh-steam 3.2s ease-in-out infinite;opacity:.8}
.lh-steam path:nth-child(2){animation-delay:-1.1s}.lh-steam path:nth-child(3){animation-delay:-2.1s}
@keyframes lh-steam{0%{stroke-dashoffset:60;opacity:0}30%{opacity:.85}100%{stroke-dashoffset:-120;opacity:0}}
.lh-mug{animation:lh-bob 4s ease-in-out infinite;transform-origin:50% 90%}
@keyframes lh-bob{50%{transform:translateY(-4px) rotate(-.8deg)}}
.lh-ice{transform-box:fill-box;transform-origin:center;animation:lh-ice 3s ease-in-out infinite}
@keyframes lh-ice{50%{transform:translateY(-5px) rotate(7deg)}}
.lh-bub{opacity:0;animation:lh-bub 3.4s ease-in infinite}
@keyframes lh-bub{0%{transform:translateY(0);opacity:0}20%{opacity:.85}100%{transform:translateY(-80px);opacity:0}}
.lh-dunk{transform-box:fill-box;transform-origin:center;animation:lh-dunk 3.6s ease-in-out infinite}
@keyframes lh-dunk{50%{transform:translate(-9px,-9px) rotate(-14deg)}}
.lh-glow{animation:lh-glow 4s ease-in-out infinite}
@keyframes lh-glow{50%{opacity:.07}}
.lh-tw{animation:lh-tw 2.6s ease-in-out infinite}
@keyframes lh-tw{50%{opacity:.2}}
.lh-z{opacity:0;animation:lh-z 3.5s ease-in infinite}
@keyframes lh-z{0%{transform:translate(0,6px);opacity:0}30%{opacity:.9}100%{transform:translate(10px,-22px);opacity:0}}
.lh-cur{animation:lh-cur 1s steps(2) infinite}
@keyframes lh-cur{50%{opacity:0}}
.lh-tag{position:absolute;right:-6px;top:8%;background:var(--tag);color:var(--tagink);font-family:inherit;font-size:12px;font-weight:500;padding:9px 12px;border-radius:6px;box-shadow:2px 3px 0 rgba(0,0,0,.12);transform:rotate(4deg);animation:lh-wob 5s ease-in-out infinite}
@keyframes lh-wob{50%{transform:rotate(-2deg) translateY(-4px)}}
@media(prefers-reduced-motion:reduce){.lh *{animation:none!important}.lh h1 path{stroke-dashoffset:0}.lh mark{background-size:100% 100%}}
`;

type Expr = "grin" | "wink" | "calm" | "cool" | "wow";
type Bucket = "morning" | "afternoon" | "evening" | "night";

const GENERAL: [string, Expr][] = [
  ["Tutorials show you the happy path. <mark>Tickets show you the actual job.</mark>", "cool"],
  ["Debug it. Optimise it. Ship it. <mark>That’s one sprint closer to hired.</mark>", "grin"],
  ["Solve it here, commit it, and <mark>let your GitHub do the talking.</mark>", "wink"],
  ["Every commit is a receipt. <mark>Recruiters love receipts they can click.</mark>", "grin"],
  ["Fail the mock interview here, <mark>so the real one feels like a rerun.</mark>", "calm"],
  ["The AI interviewer asks the follow-ups tomorrow’s interviewer will. <mark>Hear them today.</mark>", "wow"],
  ["Anyone can call an AI API. <mark>The AI era needs people who can design the system behind it.</mark>", "cool"],
  ["Scale, latency, failure: <mark>system design is where juniors turn into seniors.</mark>", "wink"],
];

const META: Record<Bucket, { greet: string; emoji: string; note: string; quote: [string, Expr] }> = {
  morning: { greet: "Good morning", emoji: "☀️", note: 'println("you’ve got this");', quote: ["Fresh coffee, fresh branch. <mark>Make the first commit before the second sip.</mark>", "grin"] },
  afternoon: { greet: "Good afternoon", emoji: "🌤️", note: "// second wind loading...", quote: ["Post-lunch slump? <mark>One small ticket wakes you up faster than coffee.</mark>", "wow"] },
  evening: { greet: "Good evening", emoji: "🌇", note: 'git commit -m "before dinner"', quote: ["Day’s almost done. <mark>One more commit before dinner?</mark>", "wink"] },
  night: { greet: "Burning the midnight oil", emoji: "🌙", note: "git push && sleep;", quote: ["Quiet hours, loud progress. <mark>Every night you code, future-you says thanks.</mark>", "calm"] },
};

const E: Record<Expr, [string, string]> = {
  grin: ['<ellipse class="eye" cx="17" cy="21" rx="3" ry="4" fill="#4a3c00"/><ellipse class="eye" cx="33" cy="21" rx="3" ry="4" fill="#4a3c00"/>', "M15 30 q10 11 20 0"],
  wink: ['<ellipse class="eye" cx="17" cy="21" rx="3" ry="4" fill="#4a3c00"/><path d="M29 21 q4 -4 8 0" fill="none" stroke="#4a3c00" stroke-width="2.6" stroke-linecap="round"/>', "M16 31 q9 8 18 -1"],
  calm: ['<path d="M13 22 q4 -4 8 0M29 22 q4 -4 8 0" fill="none" stroke="#4a3c00" stroke-width="2.6" stroke-linecap="round"/>', "M17 32 q8 5 16 0"],
  cool: ['<rect x="10" y="17" width="13" height="8" rx="3" fill="#14192b"/><rect x="27" y="17" width="13" height="8" rx="3" fill="#14192b"/><path d="M23 20 h4" stroke="#14192b" stroke-width="2"/>', "M16 31 q9 8 18 0"],
  wow: ['<ellipse class="eye" cx="17" cy="21" rx="3.4" ry="4.6" fill="#4a3c00"/><ellipse class="eye" cx="33" cy="21" rx="3.4" ry="4.6" fill="#4a3c00"/>', "M21 33 q4 -6 8 0 q-4 4 -8 0"],
};

const getBucket = (h: number): Bucket => (h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night");

/* ---------- scene pieces ---------- */
function Steam() {
  return (
    <g className="lh-steam">
      <path d="M120 120 C 105 95, 140 80, 125 50" />
      <path d="M165 125 C 150 95, 185 75, 168 40" />
      <path d="M210 120 C 196 98, 228 84, 214 56" />
    </g>
  );
}

function Face({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const w = x2 - x1 - 16;
  return (
    <g>
      <ellipse className="blink" cx={x1} cy={y} rx="9" ry="11" fill="#fff" />
      <ellipse className="blink" cx={x2} cy={y} rx="9" ry="11" fill="#fff" />
      <circle cx={x1 + 2} cy={y + 2} r="4.5" fill="#14192b" />
      <circle cx={x2 + 2} cy={y + 2} r="4.5" fill="#14192b" />
      <path d={`M${x1 + 8} ${y + 29} q${w / 2} 22 ${w} 0`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx={x1 - 20} cy={y + 23} r="8" fill="#ff9a8a" opacity=".55" />
      <circle cx={x2 + 20} cy={y + 23} r="8" fill="#ff9a8a" opacity=".55" />
    </g>
  );
}

/* ---------- 4 scenes ---------- */
function MorningScene() {
  return (
    <>
      <Steam />
      <ellipse cx="165" cy="270" rx="125" ry="20" fill="var(--line)" />
      <g className="lh-mug">
        <path d="M244 160 h22 a30 30 0 0 1 0 62 h-30" fill="none" stroke="var(--mugdark)" strokeWidth="16" strokeLinecap="round" />
        <path d="M80 138 h170 v70 a58 58 0 0 1 -58 58 h-54 a58 58 0 0 1 -58 -58z" fill="var(--mug)" />
        <path d="M80 138 h170 v22 h-170z" fill="var(--mugdark)" opacity=".35" />
        <ellipse cx="165" cy="138" rx="85" ry="13" fill="var(--mugdark)" />
        <ellipse cx="165" cy="139" rx="73" ry="8" fill="#5a3a2a" />
        <Face x1={135} x2={195} y={195} />
      </g>
    </>
  );
}

function AfternoonScene() {
  return (
    <>
      <ellipse cx="165" cy="270" rx="110" ry="18" fill="var(--line)" />
      <g className="lh-mug">
        <path d="M96 118 h138 l-17 140 a10 10 0 0 1 -10 9 h-84 a10 10 0 0 1 -10 -9z" fill="var(--mug)" opacity=".22" />
        <path d="M104 146 h122 l-12 112 a8 8 0 0 1 -8 7 h-82 a8 8 0 0 1 -8 -7z" fill="#6b4128" />
        <path d="M104 146 h122 l-2 20 h-118z" fill="#d9b48a" opacity=".85" />
        <rect className="lh-ice" x="112" y="124" width="30" height="30" rx="7" fill="#fff" opacity=".55" />
        <rect className="lh-ice" x="150" y="130" width="28" height="28" rx="7" fill="#fff" opacity=".5" style={{ animationDelay: "-1s" }} />
        <rect className="lh-ice" x="200" y="128" width="26" height="26" rx="7" fill="#fff" opacity=".55" style={{ animationDelay: "-2s" }} />
        <path d="M216 44 L197 60 L180 206" fill="none" stroke="var(--brand)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M216 44 L197 60 L180 206" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 9" opacity=".55" />
        <circle className="lh-bub" cx="121" cy="252" r="4" fill="#fff" />
        <circle className="lh-bub" cx="209" cy="250" r="3.2" fill="#fff" style={{ animationDelay: "-1.6s" }} />
        <path d="M96 118 h138 l-17 140 a10 10 0 0 1 -10 9 h-84 a10 10 0 0 1 -10 -9z" fill="none" stroke="var(--mugdark)" strokeWidth="4" strokeLinejoin="round" />
        <Face x1={140} x2={190} y={205} />
        <circle cx="236" cy="124" r="17" fill="#ffd54a" />
        <circle cx="236" cy="124" r="12" fill="#fff3b0" />
        <path d="M236 112v24M224 124h24" stroke="#ffd54a" strokeWidth="2" />
      </g>
    </>
  );
}

function EveningScene() {
  return (
    <>
      <Steam />
      <ellipse cx="165" cy="272" rx="112" ry="17" fill="var(--line)" />
      <g className="lh-mug">
        <path d="M92 120 h146 l-24 142 a10 10 0 0 1 -10 8 h-78 a10 10 0 0 1 -10 -8z" fill="#c8693a" />
        <path d="M101 164 h128 M108 248 h114" stroke="#a8502a" strokeWidth="5" strokeLinecap="round" opacity=".45" />
        <ellipse cx="165" cy="120" rx="73" ry="12" fill="#a8502a" />
        <ellipse cx="165" cy="121" rx="62" ry="7.5" fill="#d9a066" />
        <Face x1={140} x2={190} y={192} />
      </g>
      <g className="lh-dunk">
        <rect x="238" y="230" width="46" height="32" rx="8" fill="#e6b573" />
        <circle cx="252" cy="242" r="2.6" fill="#c98f4a" />
        <circle cx="266" cy="238" r="2.6" fill="#c98f4a" />
        <circle cx="272" cy="252" r="2.6" fill="#c98f4a" />
        <circle cx="254" cy="254" r="2.6" fill="#c98f4a" />
      </g>
    </>
  );
}

function NightScene() {
  return (
    <>
      <circle cx="58" cy="62" r="22" fill="#f4eec8" />
      <circle cx="68" cy="55" r="19" fill="var(--card)" />
      <circle className="lh-tw" cx="112" cy="40" r="2.5" fill="#f4eec8" />
      <circle className="lh-tw" cx="30" cy="118" r="2" fill="#f4eec8" style={{ animationDelay: "-1s" }} />
      <circle className="lh-tw" cx="104" cy="92" r="2" fill="#f4eec8" style={{ animationDelay: "-2s" }} />
      <ellipse cx="165" cy="268" rx="125" ry="16" fill="var(--line)" />
      <path className="lh-glow" d="M234 148 L278 132 L296 262 L196 262z" fill="#ffd54a" opacity=".16" />
      <g className="lh-mug">
        <rect x="82" y="116" width="156" height="104" rx="9" fill="#1b2340" stroke="var(--mugdark)" strokeWidth="6" />
        <rect x="98" y="130" width="52" height="5" rx="2.5" fill="#4a7bdc" />
        <rect x="98" y="141" width="34" height="5" rx="2.5" fill="#7fa6ff" opacity=".7" />
        <rect className="lh-cur" x="136" y="140" width="3" height="8" fill="#ffd54a" />
        <path d="M128 170 q8 8 16 0 M176 170 q8 8 16 0" fill="none" stroke="#cfe0ff" strokeWidth="4" strokeLinecap="round" />
        <path d="M150 192 q10 8 20 0" fill="none" stroke="#cfe0ff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="118" cy="186" r="7" fill="#ff9a8a" opacity=".5" />
        <circle cx="202" cy="186" r="7" fill="#ff9a8a" opacity=".5" />
        <text className="lh-z" x="204" y="152" fill="#9db8ff" fontSize="16" fontWeight="700">z</text>
        <text className="lh-z" x="214" y="140" fill="#9db8ff" fontSize="20" fontWeight="700" style={{ animationDelay: "-1.7s" }}>Z</text>
        <path d="M64 224 h192 l10 14 a6 6 0 0 1 -6 8 h-200 a6 6 0 0 1 -6 -8z" fill="var(--mugdark)" />
      </g>
      <ellipse cx="280" cy="258" rx="20" ry="6" fill="var(--mugdark)" />
      <path d="M280 256 L280 196 L252 140" fill="none" stroke="var(--mug)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M226 118 L266 102 L278 132 L234 148z" fill="var(--mug)" />
      <circle cx="252" cy="142" r="6" fill="#ffd54a" />
    </>
  );
}

const SCENES = { morning: MorningScene, afternoon: AfternoonScene, evening: EveningScene, night: NightScene };

/* ---------- component ---------- */
export default function LearnerHero({
  userName = "Alex",
  isFirstLogin = false,
  continueLabel = "Continue Java Lab",
  onContinue,
  previewAs,
}: {
  userName?: string;
  isFirstLogin?: boolean;
  continueLabel?: string;
  onContinue?: () => void;
  previewAs?: Bucket;
}) {
  const q = useRef<HTMLParagraphElement>(null);
  const face = useRef<SVGSVGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const mouth = useRef<SVGPathElement>(null);

  const b = useMemo<Bucket>(() => previewAs ?? getBucket(new Date().getHours()), [previewAs]);
  const meta = META[b];
  const Scene = SCENES[b];

  // Retain the last known valid name during logout/transitions to prevent "Student" or default flicker
  const lastValidName = useRef(userName);
  if (userName && userName !== "Student" && userName !== "Alex") {
    lastValidName.current = userName;
  }
  const nameToDisplay =
    userName && userName !== "Student" && userName !== "Alex"
      ? userName
      : lastValidName.current || userName;

  useEffect(() => {
    const quotes: [string, Expr][] = [meta.quote, ...GENERAL];
    let i = 0;
    const timeouts: number[] = [];
    const show = (n: number, first = false) => {
      i = n;
      const [t, e0] = quotes[n];
      const e: Expr = b === "night" ? "calm" : e0;
      if (!q.current || !face.current || !eyes.current || !mouth.current) return;
      q.current.className = "lh-q out";
      timeouts.push(
        window.setTimeout(() => {
          if (!q.current || !face.current || !eyes.current || !mouth.current) return;
          q.current.innerHTML = t;
          q.current.className = "lh-q in";
          eyes.current.innerHTML = E[e][0];
          mouth.current.setAttribute("d", E[e][1]);
          face.current.classList.remove("hop");
          void face.current.getBoundingClientRect();
          face.current.classList.add("hop");
        }, first ? 0 : 280)
      );
    };
    show(0, true);
    const iv = window.setInterval(() => show((i + 1) % quotes.length), 5200);
    return () => {
      clearInterval(iv);
      timeouts.forEach(clearTimeout);
    };
  }, [b, meta]);

  return (
    <div className="lh">
      <style>{CSS}</style>
      <section className="lh-hero">
        <div>
          <div className="lh-badge">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              {isFirstLogin ? `Welcome, ${nameToDisplay}` : `Welcome back, ${nameToDisplay}`}
            </span>
          </div>

          <p className="lh-hi">
            <span>{meta.greet}</span>, <b>{nameToDisplay}</b> <span aria-hidden="true">{meta.emoji}</span>
          </p>
          <h1>
            Let’s write some <i>code</i> today.
          </h1>

          <div className="lh-say">
            <svg ref={face} className="lh-face" viewBox="0 0 50 50" aria-hidden="true">
              <circle cx="25" cy="25" r="23" fill="#ffd54a" />
              <g ref={eyes} />
              <path ref={mouth} fill="none" stroke="#4a3c00" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="11" cy="30" r="3.2" fill="#ff9a8a" opacity=".6" />
              <circle cx="39" cy="30" r="3.2" fill="#ff9a8a" opacity=".6" />
            </svg>
            <div className="lh-win" aria-live="polite">
              <p ref={q} className="lh-q" />
            </div>
          </div>

          <button className="lh-cta" onClick={onContinue}>
            {continueLabel}
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="lh-scene" aria-hidden="true">
          <svg viewBox="0 0 320 300">
            <Scene />
          </svg>
          <div className="lh-tag">{meta.note}</div>
        </div>
      </section>
    </div>
  );
}
