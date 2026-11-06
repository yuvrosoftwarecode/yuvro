import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=DM+Sans:wght@400;500;700&display=swap');
.ul{--page:#f8f9fb;--ink:#14192b;--muted:#5f6880;--accent:#3b6fd4}
@media (prefers-color-scheme:dark){.ul{--page:#0d1120;--ink:#f1f4fc;--muted:#a9b2c9}}
.dark .ul{--page:#0d1120;--ink:#f1f4fc;--muted:#a9b2c9}
.ul,.ul *{box-sizing:border-box}
.ul button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.ul :focus-visible{outline:3px solid var(--ink);outline-offset:3px;border-radius:8px}
.ul-sec{max-width:none;margin:0;border-radius:0;padding:36px 0 26px;overflow:hidden;color:var(--ink);font-family:"DM Sans",system-ui,sans-serif;background:color-mix(in srgb,var(--accent) 11%,var(--page));transition:background-color .5s}
.ul-head{padding:0 36px;display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ul-head h2{font-family:"DM Sans",system-ui,sans-serif;font-weight:600;font-size:20px;letter-spacing:0;margin:0;line-height:1.2;color:var(--ink)}
.ul-head p{margin:0;color:var(--muted);font-size:12px}
.ul-stage{position:relative;height:410px;margin-top:14px;--w:290px}
.ul-card{position:absolute;left:50%;top:22px;width:var(--w);height:350px;margin-left:calc(var(--w) / -2);border-radius:28px;background:var(--c);color:#fff;padding:26px;display:flex;flex-direction:column;overflow:hidden;cursor:pointer;transition:transform .5s cubic-bezier(.3,.9,.3,1),opacity .4s,box-shadow .4s;box-shadow:0 10px 24px -14px rgba(0,0,0,.35)}
.ul-card.on{cursor:default;box-shadow:0 22px 40px -18px color-mix(in srgb,var(--c) 70%,#000)}
.ul-card::before,.ul-card::after{content:"";position:absolute;border-radius:50%;background:#fff;opacity:.13;pointer-events:none}
.ul-card::before{width:200px;height:200px;right:-60px;top:-60px}
.ul-card::after{width:110px;height:110px;right:56px;top:96px;opacity:.09}
.ul-soon{position:relative;font-size:12px;font-weight:700;letter-spacing:.14em;opacity:.85}
.ul-card h3{position:relative;font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:36px;line-height:1.02;letter-spacing:-.02em;margin:10px 0 8px;color:#fff}
.ul-tl{position:relative;margin:0;font-size:15.5px;line-height:1.4;opacity:.92;max-width:20ch}
.ul-nums{position:relative;margin-top:auto;display:flex;gap:34px}
.ul-nums b{display:block;font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:56px;line-height:.9;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.ul-nums span{display:block;margin-top:6px;font-size:14px;font-weight:500;opacity:.9}
.ul-nl{position:relative;align-self:flex-start;margin-top:18px;font-size:15px;font-weight:700;color:#fff!important;text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:2px}
.ul-card:not(.on) .ul-nl{pointer-events:none}
.ul-arrow{position:absolute;top:50%;margin-top:-24px;width:48px;height:48px;display:grid;place-items:center;z-index:20;border-radius:50%;transition:background-color .2s}
.ul-arrow:hover{background:color-mix(in srgb,var(--accent) 16%,transparent)}
.ul-arrow svg{width:26px;height:26px;stroke:var(--ink);fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.ul-arrow.l{left:20px}.ul-arrow.r{right:20px}
.ul-dots{display:flex;justify-content:center;gap:8px}
.ul-dots button{width:10px;height:10px;border-radius:5px;background:color-mix(in srgb,var(--accent) 28%,transparent);transition:.3s}
.ul-dots button.on{width:30px;background:var(--accent)}
@media(max-width:640px){.ul-stage{--w:252px;height:400px}.ul-head{padding:0 22px}.ul-head p{display:none}.ul-arrow.l{left:2px}.ul-arrow.r{right:2px}.ul-card h3{font-size:31px}.ul-nums b{font-size:48px}}
@media(prefers-reduced-motion:reduce){.ul *{transition:none!important}}
`;

export type Lab = { name: string; tagline: string; sprints: number; tickets: number; color: string };

const DEFAULT_LABS: Lab[] = [
  { name: "AI/ML Labs", tagline: "Train, break and fix real models.", sprints: 6, tickets: 48, color: "#6741d9" },
  { name: "DevOps Labs", tagline: "Pipelines, containers and rollouts.", sprints: 5, tickets: 40, color: "#d9480f" },
  { name: "MongoDB Labs", tagline: "Model data, then make queries fast.", sprints: 4, tickets: 32, color: "#12805c" },
  { name: "Java Labs", tagline: "Debug, optimise and ship backend code.", sprints: 8, tickets: 64, color: "#3b6fd4" },
  { name: "LLM Labs", tagline: "Build apps you can trust on LLMs.", sprints: 5, tickets: 36, color: "#c2255c" },
];

export default function UpcomingLabsCarousel({
  labs = DEFAULT_LABS,
  initialIndex = 3,
  onNotify,
}: {
  labs?: Lab[];
  initialIndex?: number;
  onNotify?: (lab: Lab, on: boolean) => void;
}) {
  const N = labs.length;
  const [cur, setCur] = useState(Math.min(initialIndex, N - 1));
  const [narrow, setNarrow] = useState(false);
  const [notified, setNotified] = useState<Record<number, boolean>>({});
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const go = (i: number) => setCur(((i % N) + N) % N);
  const w = narrow ? 252 : 290;

  const items = useMemo(
    () =>
      labs.map((_, i) => {
        let d = i - cur;
        if (d > N / 2) d -= N;
        if (d < -N / 2) d += N;
        return d;
      }),
    [cur, labs, N]
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(cur - 1);
    if (e.key === "ArrowRight") go(cur + 1);
  };
  const down = (e: PointerEvent) => { startX.current = e.clientX; };
  const up = (e: PointerEvent) => {
    if (startX.current !== null && Math.abs(e.clientX - startX.current) > 50) go(cur + (e.clientX < startX.current ? 1 : -1));
    startX.current = null;
  };

  return (
    <div className="ul">
      <style>{CSS}</style>
      <section
        className="ul-sec"
        style={{ ["--accent" as string]: labs[cur].color } as CSSProperties}
        aria-roledescription="carousel"
        aria-label="Upcoming labs"
        onKeyDown={onKey}
      >
        <div className="ul-head">
          <h2>Upcoming labs</h2>
          <p>Every lab runs as sprints and tickets.</p>
        </div>

        <div className="ul-stage" onPointerDown={down} onPointerUp={up}>
          <button className="ul-arrow l" aria-label="Previous lab" onClick={() => go(cur - 1)}>
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button className="ul-arrow r" aria-label="Next lab" onClick={() => go(cur + 1)}>
            <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </button>

          {labs.map((l, i) => {
            const d = items[i];
            const a = Math.abs(d);
            const on = a === 0;
            const opacity = a === 0 ? 1 : a === 1 ? (narrow ? 0.45 : 0.9) : a === 2 ? 0.6 : 0;
            return (
              <article
                key={l.name}
                className={"ul-card" + (on ? " on" : "")}
                style={{
                  ["--c" as string]: l.color,
                  transform: `translateX(${d * w * (narrow ? 0.8 : 0.76)}px) scale(${1 - a * 0.1})`,
                  zIndex: 10 - a,
                  opacity,
                  pointerEvents: a > 2 ? "none" : "auto",
                } as CSSProperties}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${N}: ${l.name}`}
                aria-hidden={!on}
                onClick={() => { if (!on) go(i); }}
              >
                <div className="ul-soon">COMING SOON</div>
                <h3>{l.name}</h3>
                <p className="ul-tl">{l.tagline}</p>
                <div className="ul-nums">
                  <div><b>{l.sprints}</b><span>Sprints</span></div>
                  <div><b>{l.tickets}</b><span>Tickets</span></div>
                </div>
                <button
                  className="ul-nl"
                  tabIndex={on ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !notified[i];
                    setNotified((s) => ({ ...s, [i]: next }));
                    onNotify?.(l, next);
                  }}
                >
                  {notified[i] ? "We’ll let you know ✓" : "Notify me →"}
                </button>
              </article>
            );
          })}
        </div>

        <div className="ul-dots">
          {labs.map((l, i) => (
            <button key={l.name} className={i === cur ? "on" : ""} aria-label={`Go to ${l.name}`} onClick={() => go(i)} />
          ))}
        </div>
      </section>
    </div>
  );
}
