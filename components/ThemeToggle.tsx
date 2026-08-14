"use client";

import { useSyncExternalStore } from "react";

// The theme is not this component's state. It lives on <html>, put there by
// the no-flash script in layout.tsx before React runs and changed by anything
// that toggles the class — so the switch subscribes to the DOM rather than
// keeping a copy it would have to hold in step.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

const readTheme = () => document.documentElement.classList.contains("dark");

// null means "not known yet". The server has no <html> to read, and React
// uses this same value for the first client render, so the switch draws
// nothing until hydration is done — which is what keeps the markup matching.
const unknownOnServer = () => null;

// Ported from ddun.ai so the two sites share one switch: an iOS-style pill that
// flips the `dark` class on <html> and remembers the choice in localStorage.
export function ThemeToggle() {
  const dark = useSyncExternalStore<boolean | null>(
    subscribe,
    readTheme,
    unknownOnServer,
  );

  if (dark === null) return null;

  // No setState here: flipping the class is the whole update, and the observer
  // above turns it back into a render.
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private mode or storage disabled — the toggle still works for this
      // session, it just will not be remembered.
    }
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
