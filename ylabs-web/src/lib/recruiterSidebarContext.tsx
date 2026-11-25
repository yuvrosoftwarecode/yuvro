import React, { createContext, useContext, useState, useEffect } from "react";

export interface RecruiterSidebarContextType {
  isMinimized: boolean;
  setMinimized: (minimized: boolean) => void;
  toggleMinimized: () => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  isStep4Workspace: boolean;
  setIsStep4Workspace: (inStep4: boolean) => void;
}

const RecruiterSidebarContext = createContext<RecruiterSidebarContextType | null>(null);

export function RecruiterSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMinimized, setIsMinimizedState] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem("yuvro_recruiter_sidebar_minimized") === "true";
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isStep4Workspace, setIsStep4Workspace] = useState<boolean>(false);

  const setMinimized = (val: boolean) => {
    setIsMinimizedState(val);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("yuvro_recruiter_sidebar_minimized", val ? "true" : "false");
      }
    } catch {
      // ignore
    }
  };

  const toggleMinimized = () => {
    setMinimized(!isMinimized);
  };

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  // Close drawer on Escape
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  return (
    <RecruiterSidebarContext.Provider
      value={{
        isMinimized,
        setMinimized,
        toggleMinimized,
        isDrawerOpen,
        setDrawerOpen,
        toggleDrawer,
        isStep4Workspace,
        setIsStep4Workspace,
      }}
    >
      {children}
    </RecruiterSidebarContext.Provider>
  );
}

export function useRecruiterSidebar() {
  const ctx = useContext(RecruiterSidebarContext);
  if (!ctx) {
    return {
      isMinimized: false,
      setMinimized: () => {},
      toggleMinimized: () => {},
      isDrawerOpen: false,
      setDrawerOpen: () => {},
      toggleDrawer: () => {},
      isStep4Workspace: false,
      setIsStep4Workspace: () => {},
    };
  }
  return ctx;
}
