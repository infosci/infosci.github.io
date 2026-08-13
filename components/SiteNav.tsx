"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

// Four destinations, no dropdowns, no search — the old site's nav carried a
// teaching page and a blog that no longer exist. Restraint here is the point:
// ddun.ai gets by with none at all, and a lab site needs only enough to reach
// the work.
const LINKS = [
  { href: "/", label: "about" },
  { href: "/people/", label: "people" },
  { href: "/publications/", label: "publications" },
  { href: "/grants/", label: "grants" },
];

export function SiteNav() {
  // trailingSlash: true means every route ends in "/" — normalize so "/people"
  // and "/people/" both mark the same link active.
  const pathname = (usePathname() ?? "/").replace(/\/?$/, "/");

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center gap-5 px-6 py-6 sm:py-8">
      <nav className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "text-black dark:text-zinc-50"
                  : "text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <ThemeToggle />
    </header>
  );
}
