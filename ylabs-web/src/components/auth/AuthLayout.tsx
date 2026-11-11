import React from "react";
import { Link } from "@tanstack/react-router";
import { StoryPanel } from "./StoryPanel";
import { AuthToast } from "./Toast";
import YuvroLogo from "@/assets/YuvroLogo.png";
import "./auth.css";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="yuvro-auth-page">
      <StoryPanel />
      <main className="right">
        <div className="mobile-logo">
          <Link to="/" className="logo" aria-label="Yuvro home">
            <img src={YuvroLogo} alt="Yuvro" />
            <span>Yuvro</span>
          </Link>
        </div>
        {children}
      </main>
      <AuthToast />
    </div>
  );
}
