"use client";

import { useEffect, useState } from "react";

// Ported from ddun.ai so the two sites share one switch: an iOS-style pill that
// flips the `dark` class on <html> and remembers the choice in localStorage.
export function ThemeToggle() {
  // Rendered only after mount: the real theme lives on <html> (set by the
  // no-flash script in layout.tsx), so the server cannot know which state to
  // draw without risking a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private mode or storage disabled — the toggle still works for this
      // session, it just will not be remembered.
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={`flex h-7 w-[2.875rem] shrink-0 items-center rounded-full p-1 ring-1 transition-colors print:hidden ${
        dark ? "bg-zinc-700 ring-white/10" : "bg-zinc-300 ring-black/10"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm transition-transform duration-200 ease-out ${
          dark ? "translate-x-[1rem]" : "translate-x-0"
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {dark ? (
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
        </svg>
      </span>
    </button>
  );
}
