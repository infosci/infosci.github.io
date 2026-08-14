"use client";

// Whether the People photographs are shown in color or mono.
//
// It lives here, above both the switch and the grid, because the two are no
// longer in the same place: the switch sits at the end of the standfirst, where
// the sentence it answers is, and the grid it changes is below the rule. Two
// siblings sharing one piece of state is exactly what context is for, and the
// alternative — moving the standfirst inside the explorer — would have made
// this page's structure differ from the other three for a display detail.
//
// Color is the default and it is not remembered between visits. The page should
// open the same way for everyone, since the standfirst is written to be read
// against color photographs first.

import { createContext, useContext, useState, type ReactNode } from "react";

const PhotoToneContext = createContext<{
  mono: boolean;
  setMono: (v: boolean) => void;
} | null>(null);

export function PhotoToneProvider({ children }: { children: ReactNode }) {
  const [mono, setMono] = useState(false);
  return (
    <PhotoToneContext.Provider value={{ mono, setMono }}>
      {children}
    </PhotoToneContext.Provider>
  );
}

export function usePhotoTone() {
  const ctx = useContext(PhotoToneContext);
  if (!ctx)
    throw new Error("usePhotoTone must be used inside PhotoToneProvider");
  return ctx;
}

/** The same pill as the view toggle on Publications: 26px, 12px labels, one
 *  frame holding two halves. Nothing here explains what mono means — the
 *  sentence beside it does that, and a caption would make a small thing
 *  heavy. */
export function PhotoToneToggle({ className }: { className?: string }) {
  const { mono, setMono } = usePhotoTone();

  return (
    <div
      className={`inline-flex shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700 ${className ?? ""}`}
      role="group"
      aria-label="Photo treatment"
    >
      {([false, true] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => setMono(v)}
          aria-pressed={mono === v}
          className={`rounded-full border border-transparent px-2.5 py-1 text-xs transition-colors ${
            mono === v
              ? "bg-black text-white dark:bg-zinc-100 dark:text-black"
              : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {v ? "Mono" : "Color"}
        </button>
      ))}
    </div>
  );
}
