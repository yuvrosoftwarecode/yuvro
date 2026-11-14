import { useEffect, useRef, useState } from "react";
import { GITHUB_DETAILS } from "./constants";

interface GithubSceneProps {
  isActive: boolean;
}

export function GithubScene({ isActive }: GithubSceneProps) {
  const [count, setCount] = useState(0);
  const [levels, setLevels] = useState<number[]>(() =>
    Array(GITHUB_DETAILS.weeks * GITHUB_DETAILS.daysPerWeek).fill(0),
  );
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Clean up any pending animations
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!isActive) {
      setCount(0);
      setLevels(Array(GITHUB_DETAILS.weeks * GITHUB_DETAILS.daysPerWeek).fill(0));
      return;
    }

    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const totalCells = GITHUB_DETAILS.weeks * GITHUB_DETAILS.daysPerWeek;
    const computedLevels: number[] = [];
    let total = 0;

    for (let i = 0; i < totalCells; i++) {
      const col = Math.floor(i / 7);
      const lvl = Math.random() < 0.28 ? 0 : 1 + Math.floor(Math.random() * (1 + col / 9));
      computedLevels.push(Math.min(lvl, 4));
      total += lvl;
    }

    const targetCount = Math.round(total * 1.1);

    if (isReduced) {
      setLevels(computedLevels);
      setCount(targetCount);
      return;
    }

    // Progressively fill in columns
    computedLevels.forEach((lvl, i) => {
      const col = Math.floor(i / 7);
      const delay = 120 + col * 95 + (i % 7) * 8;
      const t = setTimeout(() => {
        setLevels((prev) => {
          const next = [...prev];
          next[i] = lvl;
          return next;
        });
      }, delay);
      timersRef.current.push(t);
    });

    // Count up animation
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / 3100, 1);
      setCount(Math.round(targetCount * p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive]);

  return (
    <div className={`pn ${isActive ? "on" : ""}`} aria-hidden={!isActive}>
      <div className="gh">
        <div className="av">{GITHUB_DETAILS.avatarInitial}</div>
        <div>
          <b>{GITHUB_DETAILS.username}</b>
          <span>{GITHUB_DETAILS.domain}</span>
        </div>
        <div className="gc">
          <b>{count}</b>
          <span>contributions in the last year</span>
        </div>
      </div>

      <div className="graph">
        {levels.map((lvl, index) => (
          <i key={index} {...(lvl > 0 ? { "data-l": lvl } : {})} aria-hidden="true" />
        ))}
      </div>

      <div className="repo">
        <b>{GITHUB_DETAILS.repoName}</b>
        {GITHUB_DETAILS.mergedText}
      </div>
    </div>
  );
}
