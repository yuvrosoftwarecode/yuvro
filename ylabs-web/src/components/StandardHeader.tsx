import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import YuvroLogo from "@/assets/YuvroLogo.png";
import { useAuth } from "@/lib/auth";

export function StandardHeader() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSystemDesignActive = pathname.startsWith("/system-design-studio");
  const isPricingActive = pathname.startsWith("/pricing") || pathname.startsWith("/yuvrolabs-pricing");
  const isDeveloperActive = pathname.startsWith("/auth") || pathname.startsWith("/student");

  const developerLink = "/student/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full bg-[#f8f9fb]/95 dark:bg-[#0d1120]/95 backdrop-blur-md border-b border-[#646d84]/15 transition-colors">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center px-5 sm:px-6">
        {/* Logo and Branding: Tree logo with text 'Yuvro Labs' beside it */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-decoration-none group select-none shrink-0"
          aria-label="Yuvro Labs Home"
        >
          <img
            src={YuvroLogo}
            alt="Yuvro Labs"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <span className="text-[17px] font-bold tracking-tight text-[#14192b] dark:text-[#f1f4fc] group-hover:text-[#f7931e] transition-colors">
            Yuvro Labs
          </span>
        </Link>

        {/* Desktop Navigation Links - Kept to the left side next to logo */}
        <nav className="hidden md:flex items-center gap-1 ml-8 sm:ml-10 mr-auto" aria-label="Main Navigation">
          <Link
            to="/system-design-studio"
            className={`relative px-3.5 py-2 rounded-[10px] font-semibold text-[13px] transition-colors ${
              isSystemDesignActive
                ? "text-[#14192b] dark:text-white"
                : "text-[#646d84] hover:text-[#14192b] dark:text-[#a1abc4] dark:hover:text-white"
            }`}
          >
            System Design Studio
            <span
              className={`absolute left-3.5 right-3.5 bottom-0 h-[3px] rounded-[3px] bg-[#f7931e] transition-all duration-200 ${
                isSystemDesignActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0 hover:scale-x-100 hover:opacity-100"
              }`}
            />
          </Link>

          <Link
            to="/pricing"
            className={`relative px-3.5 py-2 rounded-[10px] font-semibold text-[13px] transition-colors ${
              isPricingActive
                ? "text-[#14192b] dark:text-white"
                : "text-[#646d84] hover:text-[#14192b] dark:text-[#a1abc4] dark:hover:text-white"
            }`}
          >
            Pricing
            <span
              className={`absolute left-3.5 right-3.5 bottom-0 h-[3px] rounded-[3px] bg-[#f7931e] transition-all duration-200 ${
                isPricingActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0 hover:scale-x-100 hover:opacity-100"
              }`}
            />
          </Link>

          {/* Requirement 6: Developer Navigation: Remove 'Login as a Developer' and keep only 'Developer' */}
          <Link
            to={developerLink}
            className={`relative px-3.5 py-2 rounded-[10px] font-semibold text-[13px] transition-colors ${
              isDeveloperActive
                ? "text-[#14192b] dark:text-white"
                : "text-[#646d84] hover:text-[#14192b] dark:text-[#a1abc4] dark:hover:text-white"
            }`}
          >
            Developer
            <span
              className={`absolute left-3.5 right-3.5 bottom-0 h-[3px] rounded-[3px] bg-[#f7931e] transition-all duration-200 ${
                isDeveloperActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0 hover:scale-x-100 hover:opacity-100"
              }`}
            />
          </Link>
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            to="/book-demo"
            className="inline-flex items-center justify-center font-semibold text-[13px] text-white px-4 py-2 rounded-[10px] bg-[#f7931e] shadow-[0_2px_4px_rgba(247,147,30,0.2)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_0_-3px_rgba(247,147,30,0.3)] active:translate-y-0 active:shadow-none"
          >
            Book a demo
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <Link
            to="/book-demo"
            className="inline-flex items-center justify-center font-semibold text-[12px] text-white px-3 py-1.5 rounded-[8px] bg-[#f7931e]"
          >
            Book a demo
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#646d84]/20 text-[#14192b] dark:text-[#f1f4fc]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#646d84]/15 bg-[#f8f9fb] dark:bg-[#0d1120] px-5 py-4 space-y-2">
          <Link
            to="/system-design-studio"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md font-semibold text-[14px] ${
              isSystemDesignActive ? "text-[#f7931e] bg-[#f7931e]/10" : "text-[#14192b] dark:text-[#f1f4fc]"
            }`}
          >
            System Design Studio
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md font-semibold text-[14px] ${
              isPricingActive ? "text-[#f7931e] bg-[#f7931e]/10" : "text-[#14192b] dark:text-[#f1f4fc]"
            }`}
          >
            Pricing
          </Link>
          <Link
            to={developerLink}
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md font-semibold text-[14px] ${
              isDeveloperActive ? "text-[#f7931e] bg-[#f7931e]/10" : "text-[#14192b] dark:text-[#f1f4fc]"
            }`}
          >
            Developer
          </Link>
        </div>
      )}
    </header>
  );
}
