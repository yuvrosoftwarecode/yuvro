import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SprintScene } from "./SprintScene";
import { GithubScene } from "./GithubScene";
import { STORY_CAPTIONS, STORY_DUR_MS } from "./constants";
import YuvroLogo from "@/assets/YuvroLogo.png";

export function StoryPanel() {
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [caption, setCaption] = useState<string>(STORY_CAPTIONS[0]);
  const [captionSwitching, setCaptionSwitching] = useState<boolean>(false);

  useEffect(() => {
    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReduced) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentScene((prev) => {
        const next = (prev + 1) % 2;
        setCaptionSwitching(true);
        setTimeout(() => {
          setCaption(STORY_CAPTIONS[next]);
          setCaptionSwitching(false);
        }, 200);
        return next;
      });
    }, STORY_DUR_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="left" aria-label="How Yuvro Labs works">
      <Link to="/" className="logo" aria-label="Yuvro Labs home">
        <img src={YuvroLogo} alt="Yuvro Labs" className="h-8 w-auto object-contain" />
        <span>Yuvro Labs</span>
      </Link>

      <div className="story">
        <h1>Practice like you’re already on the team.</h1>
        <p>
          Take tickets in real sprints, push your code to GitHub, and rehearse system design and
          mock interviews before the real ones.
        </p>

        <div className="stage" aria-hidden="true">
          <SprintScene isActive={currentScene === 0} />
          <GithubScene isActive={currentScene === 1} />
        </div>

        <p className={`cap ${captionSwitching ? "sw" : ""}`}>{caption}</p>
      </div>
    </section>
  );
}
