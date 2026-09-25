"use client";

import { useEffect, useLayoutEffect } from "react";
import { THEME_KEY } from "@/lib/theme";

function storedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function systemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Switches between day and night. Both icons are rendered and CSS shows the
 * right one, so the button needs no state and can't disagree with the page.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // The head script sets the class in production; React's dev remount clears
  // it, so it is re-applied here before paint.
  useLayoutEffect(() => {
    const theme = storedTheme();
    apply(theme ? theme === "dark" : systemIsDark());
  }, []);

  // With no choice of their own, the page follows the system as it changes.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (!storedTheme()) apply(media.matches);
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    apply(dark);
    try {
      // Choosing what the system already shows hands control back to it.
      if (dark === systemIsDark()) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // Private browsing: the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark"
      title="Switch between light and dark"
      className={`grid size-11 shrink-0 place-items-center rounded-full border border-line bg-card/80 text-ink transition-colors hover:border-accent/50 ${className}`}
    >
      {/* Moon by day: the way into night. */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="dark:hidden" aria-hidden>
        <path d="M20.2 14.6 A8.4 8.4 0 1 1 9.4 3.8 a6.6 6.6 0 0 0 10.8 10.8 Z" />
      </svg>
      {/* Sun by night, in the brand's orange. */}
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#F4A265" strokeWidth="1.9" strokeLinecap="round" className="hidden dark:block" aria-hidden>
        <circle cx="12" cy="12" r="4.2" fill="#F4A265" stroke="none" />
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M5.4 18.6l1.5-1.5M17.1 6.9l1.5-1.5" />
      </svg>
    </button>
  );
}
