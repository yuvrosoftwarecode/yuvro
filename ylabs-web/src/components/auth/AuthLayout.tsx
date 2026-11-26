import React from "react";
import { Link } from "@tanstack/react-router";
import { StoryPanel } from "./StoryPanel";
import { AuthToast } from "./Toast";
import YuvroLogo from "@/assets/YuvroLogo.png";
import "./auth.css";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const PRODUCTS: [string, string][] = [
  ["Coding assessments", "Test practical coding skills"],
  ["Simulation labs", "Hands-on engineering scenarios"],
  ["AI mock interviews", "Structured technical conversations"],
  ["Codebase repo setups", "Candidates work in a real repository"],
  ["Work Trail", "A 24 to 48 hour assignment in your codebase"],
  ["AI follow-up questions", "Dig into how candidates think"],
  ["Candidate reports", "A clear picture of every attempt"],
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="yuvro-auth-page">
      <StoryPanel />
      <main className="right">
        <div className="mobile-logo">
          <Link to="/" className="logo" aria-label="Yuvro Labs home">
            <img src={YuvroLogo} alt="Yuvro Labs" />
            <span>Yuvro Labs</span>
          </Link>
        </div>
        <div className="auth-content-box">
          {children}
        </div>
      </main>

      {/* Scrolling product marquee strip */}
      <div className="auth-strip" aria-hidden="true">
        <div className="auth-strip-label">Inside Yuvro</div>
        <div className="auth-strip-marq">
          <div className="auth-strip-track">
            {[0, 1].map((k) => (
              <div className="auth-strip-set" key={k}>
                {PRODUCTS.map(([name, desc]) => (
                  <span key={name}>
                    <b>{name}</b>{desc}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AuthToast />
    </div>
  );
}
