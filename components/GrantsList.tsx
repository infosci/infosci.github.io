"use client";

// The grants, narrowed to the running ones or the finished ones.
//
// Two chips and an All, matching the role chips on People and the value chips
// on Publications — same border, same 12px, same behaviour where clicking the
// chosen one again clears it.
//
// Whether a grant is running is decided on the server at build time and arrives
// here as a boolean. It is not recomputed in the browser: a visitor whose clock
// is wrong, or who leaves the tab open across New Year, should see the same page
// the build produced rather than a quietly different one.

import { useState } from "react";

export type Grant = {
  id: string;
  title: string;
  duration: string | null;
  funder: string;
  active: boolean;
};

const ALL = "all";
const ACTIVE = "active";
const PAST = "past";

export default function GrantsList({ grants }: { grants: Grant[] }) {
  const [filter, setFilter] = useState<string>(ALL);

  const counts = {
    [ALL]: grants.length,
    [ACTIVE]: grants.filter((g) => g.active).length,
    [PAST]: grants.filter((g) => !g.active).length,
  };

  const shown =
    filter === ALL ? grants : grants.filter((g) => (filter === ACTIVE ? g.active : !g.active));

  const pick = (next: string) => setFilter(filter === next ? ALL : next);

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-1.5">
        <Chip label="All" count={counts[ALL]} on={filter === ALL} onClick={() => setFilter(ALL)} />
        <Chip
          label="Active"
          count={counts[ACTIVE]}
          on={filter === ACTIVE}
          onClick={() => pick(ACTIVE)}
        />
        <Chip label="Past" count={counts[PAST]} on={filter === PAST} onClick={() => pick(PAST)} />
      </div>

      <ul className="mt-10 space-y-10">
        {shown.map((grant) => (
          <li key={grant.id}>
            <h2 className="max-w-2xl leading-snug font-medium text-black dark:text-zinc-50">
              {grant.title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {[grant.duration, grant.funder].filter(Boolean).join(" · ")}
              {/* Kept even though a chip now filters on it: in the All view this
                  is the only thing distinguishing a running grant from a
                  finished one. */}
              {grant.active && (
                <>
                  {" · "}
                  <span className="text-black dark:text-zinc-200">Active</span>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function Chip({
  label,
  count,
  on,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
        on
          ? "border-black bg-black text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black"
          : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-black dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      }`}
    >
      {label}
      <span className={on ? "ml-1.5 opacity-70" : "ml-1.5 text-zinc-500 dark:text-zinc-400"}>
        {count}
      </span>
    </button>
  );
}
