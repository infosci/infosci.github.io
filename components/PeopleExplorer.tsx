"use client";

// Everyone in one mixed grid, narrowed by role.
//
// The old page stacked six labelled sections in seniority order, which read as
// a ranking and buried the master's students at the bottom. Mixing them drops
// the hierarchy — but position was the only thing saying who was who, so each
// card now carries its own role. Without that the mix would just lose the
// information the sections were carrying.

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/assets";

export type Member = {
  slug: string;
  name: string;
  /** What they are, or were. Independent of whether they are still here. */
  role: string | null;
  status: "current" | "former";
  /** Where a former member is now, when we know. */
  now: string | null;
  photo: string | null;
  link: string | null;
  order: number;
};

const ALL = "__all__";
const FORMER = "__former__";

// Singular for a card, since it labels one person. "Alumni" stays plural on
// purpose: the singular forms are gendered and there is no neutral one.
const CARD_LABEL: Record<string, string> = {
  "principal investigator": "Principal investigator",
  "doctoral students": "Doctoral student",
  "master's students": "Master's student",
  "visiting scholars": "Visiting scholar",
};

const CHIP_LABEL: Record<string, string> = {
  "principal investigator": "Principal investigator",
  "doctoral students": "Doctoral students",
  "master's students": "Master's students",
  "visiting scholars": "Visiting scholars",
  [FORMER]: "Former members",
};

// Chips in a fixed order, unlike the grid. A filter that reshuffles itself is
// unusable, and this order is the one people expect to scan.
//
// Role chips mean current people, and everyone who has left sits under one
// "Former members" chip. That keeps the chips mutually exclusive, which a
// single-select filter needs — "Doctoral students" and "Former members" would
// otherwise both contain the same person. Nothing is lost: each card states the
// role and the status, so a former doctoral student still says so.
const ROLE_ORDER = [
  "principal investigator",
  "doctoral students",
  "master's students",
  "visiting scholars",
];

/** Fisher-Yates over the slugs. Module level so the effect below can depend on
 *  it without being redefined every render. */
function shuffleSlugs(people: Member[]) {
  const slugs = people.map((p) => p.slug);
  for (let i = slugs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slugs[i], slugs[j]] = [slugs[j], slugs[i]];
  }
  return slugs;
}

export default function PeopleExplorer({ people }: { people: Member[] }) {
  const [role, setRole] = useState<string>(ALL);
  // Slugs in display order. null means "as the server sent them", which the
  // first render must use — a fresh draw here would not match the prerendered
  // HTML and React would swap the whole grid out on load. Every later order
  // comes from a click, which happens after mount, where Math.random is safe.
  const [order, setOrder] = useState<string[] | null>(null);

  const bySlug = useMemo(() => new Map(people.map((p) => [p.slug, p])), [people]);

  // A fresh order on arrival. It cannot happen during render — the markup is
  // prerendered once at build, so a draw there would not match and React would
  // replace the grid on load. After mount it is free, and the seeded build-time
  // order is what a reader without JavaScript keeps.
  useEffect(() => {
    // The rule below guards against cascading renders, and cannot express this
    // case: the order must differ per visit and must not exist during
    // hydration, so it can only be set once, after mount. It runs a single time
    // and settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(shuffleSlugs(people));
  }, [people]);

  // And a new one on every chip, so the grid never settles into an order that
  // could be read as a ranking.
  const pick = (next: string) => {
    setRole(next);
    setOrder(shuffleSlugs(people));
  };

  const ordered = order ? order.map((slug) => bySlug.get(slug)!) : people;

  // Color by default. Mono is the better-looking grid — the photos were taken
  // over years in different countries on different phones, and color is what
  // advertises that — but it is a reading of the people, not a fact about them,
  // so it is offered rather than imposed. Not remembered between visits: the
  // page should open the same way for everyone.
  const [mono, setMono] = useState(false);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of people) {
      if (p.status === "current" && p.role) c.set(p.role, (c.get(p.role) ?? 0) + 1);
    }
    const rows = ROLE_ORDER.filter((r) => c.has(r)).map((r) => ({ role: r, count: c.get(r)! }));
    const former = people.filter((p) => p.status === "former").length;
    return former ? [...rows, { role: FORMER, count: former }] : rows;
  }, [people]);

  const shown =
    role === ALL
      ? ordered
      : role === FORMER
        ? ordered.filter((p) => p.status === "former")
        : ordered.filter((p) => p.status === "current" && p.role === role);

  return (
    <>
      {/* One row at 768px. The six chips needed 800px, so "Everyone" became
          "All" and the padding came in a notch — "All" alone left a single
          pixel of margin, which is not a margin. Still wraps below sm, where
          one row was never going to happen. */}
      <div className="mt-10 flex flex-wrap gap-1.5">
        <Chip
          label="All"
          count={people.length}
          on={role === ALL}
          onClick={() => pick(ALL)}
        />
        {counts.map(({ role: r, count }) => (
          <Chip
            key={r}
            label={CHIP_LABEL[r] ?? r}
            count={count}
            on={role === r}
            onClick={() => pick(role === r ? ALL : r)}
          />
        ))}
      </div>

      {/* Its own row, right-aligned. It cannot join the chips — they leave 29px
          of the 768 and this needs 118 — and the separation is honest anyway:
          the chips choose who is on the page, this only changes how they are
          drawn. Same pill as the view toggle on Publications. */}
      <div className="mt-4 flex justify-end">
        <div
          className="inline-flex rounded-full border border-zinc-300 dark:border-zinc-700"
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
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
        {shown.map((person) => (
          <li key={person.slug}>
            <Person person={person} mono={mono} />
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

function Person({ person, mono }: { person: Member; mono: boolean }) {
  const body = (
    <>
      {person.photo ? (
        <Image
          // asset(), not the bare path — next/image does not add basePath.
          src={asset(person.photo)}
          alt=""
          width={240}
          height={240}
          // A CSS filter rather than a second set of files: reversible, and it
          // leaves the color originals in place for a poster or a talk page.
          // The slight contrast lift is there because desaturating a photo
          // flattens it — grayscale alone came out muddy on the darker ones.
          //
          // The color state names its filters at their identity values rather
          // than dropping them. filter: none does not interpolate, so without
          // this the fade runs going to mono and snaps coming back.
          className={`aspect-square w-full rounded-lg object-cover transition duration-300 ${
            mono ? "contrast-[1.08] grayscale" : "contrast-100 grayscale-0"
          }`}
        />
      ) : (
        <div className="aspect-square w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      )}
      <span className="mt-2.5 block text-center leading-snug font-medium text-black dark:text-zinc-50">
        {person.name}
      </span>
      {person.role && (
        <span className="mt-0.5 block text-center text-sm leading-snug text-zinc-500 dark:text-zinc-400">
          {CARD_LABEL[person.role] ?? person.role}
          {person.status === "former" && ", former"}
        </span>
      )}
      {person.now && (
        <span className="mt-0.5 block text-center text-sm leading-snug text-zinc-500 dark:text-zinc-400">
          Now {person.now}
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
