"use client";

// Everyone in one mixed grid, narrowed by role.
//
// The old page stacked six labelled sections in seniority order, which read as
// a ranking and buried the master's students at the bottom. Mixing them drops
// the hierarchy — but position was the only thing saying who was who, so each
// card now carries its own role. Without that the mix would just lose the
// information the sections were carrying.

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/assets";

export type Member = {
  slug: string;
  name: string;
  role: string | null;
  photo: string | null;
  link: string | null;
  order: number;
};

const ALL = "__all__";

// Singular for a card, since it labels one person. "Alumni" stays plural on
// purpose: the singular forms are gendered and there is no neutral one.
const CARD_LABEL: Record<string, string> = {
  "principal investigator": "Principal investigator",
  "doctoral students": "Doctoral student",
  "master's students": "Master's student",
  "visiting scholars": "Visiting scholar",
  alumni: "Alumni",
  "past visiting scholars": "Past visiting scholar",
};

const CHIP_LABEL: Record<string, string> = {
  "principal investigator": "Principal investigator",
  "doctoral students": "Doctoral students",
  "master's students": "Master's students",
  "visiting scholars": "Visiting scholars",
  alumni: "Alumni",
  "past visiting scholars": "Past visiting scholars",
};

// Chips in a fixed order, unlike the grid. A filter that reshuffles itself is
// unusable, and this order is the one people expect to scan.
const ROLE_ORDER = [
  "principal investigator",
  "doctoral students",
  "master's students",
  "visiting scholars",
  "alumni",
  "past visiting scholars",
];

export default function PeopleExplorer({ people }: { people: Member[] }) {
  const [role, setRole] = useState<string>(ALL);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of people) if (p.role) c.set(p.role, (c.get(p.role) ?? 0) + 1);
    return ROLE_ORDER.filter((r) => c.has(r)).map((r) => ({ role: r, count: c.get(r)! }));
  }, [people]);

  const shown = role === ALL ? people : people.filter((p) => p.role === role);

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-1.5">
        <Chip
          label="Everyone"
          count={people.length}
          on={role === ALL}
          onClick={() => setRole(ALL)}
        />
        {counts.map(({ role: r, count }) => (
          <Chip
            key={r}
            label={CHIP_LABEL[r] ?? r}
            count={count}
            on={role === r}
            onClick={() => setRole(role === r ? ALL : r)}
          />
        ))}
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
        {shown.map((person) => (
          <li key={person.slug}>
            <Person person={person} />
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
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
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

function Person({ person }: { person: Member }) {
  const body = (
    <>
      {person.photo ? (
        <Image
          // asset(), not the bare path — next/image does not add basePath.
          src={asset(person.photo)}
          alt=""
          width={240}
          height={240}
          className="aspect-square w-full rounded-lg object-cover"
        />
      ) : (
        <div className="aspect-square w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      )}
      <span className="mt-2.5 block text-center text-sm leading-snug font-normal text-black dark:text-zinc-50">
        {person.name}
      </span>
      {person.role && (
        <span className="mt-0.5 block text-center text-xs leading-snug text-zinc-500 dark:text-zinc-400">
          {CARD_LABEL[person.role] ?? person.role}
        </span>
      )}
    </>
  );

  if (!person.link) return <div>{body}</div>;

  // Internal pages (currently just the PI's) route through next/link, which
  // applies basePath and keeps navigation client-side. Everything else points
  // at an external profile and opens in a new tab.
  const className = "group block transition-opacity hover:opacity-80";
  return person.link.startsWith("/") ? (
    <Link href={person.link} className={className}>
      {body}
    </Link>
  ) : (
    <a href={person.link} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  );
}
