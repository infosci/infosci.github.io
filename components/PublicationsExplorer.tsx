"use client";

// Two ways to read the same 72 papers, under three Clarivate schemes.
//
// The scheme picker is the thing worth getting right. Prospective students are
// the audience, and they should be able to tell that "Computer Science" from a
// journal and "Chemistry" from a citation cluster are different kinds of claim.
// So every scheme states its basis — venue or paper — and links to Clarivate's
// own page rather than to our paraphrase of it.

import { useMemo, useState } from "react";
import type { FacetPaper, Scheme, SchemeId } from "@/lib/publication-facets";
import { valuesFor } from "@/lib/publication-facets";
import type { MapLayout } from "@/lib/publication-map";
import { DOT } from "@/lib/publication-map";

type Props = {
  papers: FacetPaper[];
  schemes: Scheme[];
  layouts: Record<SchemeId, MapLayout>;
};

const ALL = "__all__";

function citation(p: FacetPaper) {
  return [p.venue, p.year].filter(Boolean).join(" · ");
}

/** Greedy wrap to at most two lines, the second truncated. Breaks on spaces so
 *  a Citation Topic code stays attached to the name it belongs to. */
function wrapLabel(name: string, room: number): string[] {
  if (name.length <= room) return [name];
  const words = name.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= room) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === 1) break;
    }
  }
  if (lines.length === 0) return [`${name.slice(0, room - 1)}…`];
  const rest = name.slice(lines[0].length + 1);
  lines.push(rest.length > room ? `${rest.slice(0, room - 1)}…` : rest);
  return lines;
}

export default function PublicationsExplorer({ papers, schemes, layouts }: Props) {
  const [view, setView] = useState<"list" | "map">("list");
  const [schemeId, setSchemeId] = useState<SchemeId>("areas");
  const [value, setValue] = useState<string>(ALL);
  const [hovered, setHovered] = useState<string | null>(null);

  const scheme = schemes.find((s) => s.id === schemeId)!;
  const layout = layouts[schemeId];

  const byKey = useMemo(() => new Map(papers.map((p) => [p.key, p])), [papers]);

  const shown = useMemo(
    () => (value === ALL ? papers : papers.filter((p) => valuesFor(p, schemeId).includes(value))),
    [papers, schemeId, value],
  );

  // Switching scheme drops a filter that no longer exists in it.
  function chooseScheme(id: SchemeId) {
    setSchemeId(id);
    const next = schemes.find((s) => s.id === id)!;
    if (value !== ALL && !next.values.some((v) => v.name === value)) setValue(ALL);
  }

  const byYear = useMemo(() => {
    const groups = new Map<number | null, FacetPaper[]>();
    for (const p of shown) {
      const bucket = groups.get(p.year) ?? [];
      bucket.push(p);
      groups.set(p.year, bucket);
    }
    return [...groups.entries()].sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0));
  }, [shown]);

  const active = (hovered ? byKey.get(hovered) : null) ?? null;

  return (
    <div className="mt-10">
      {/* view toggle */}
      <div className="flex items-center gap-1" role="group" aria-label="View">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              view === v
                ? "bg-black text-white dark:bg-zinc-100 dark:text-black"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {v === "list" ? "List" : "Map"}
          </button>
        ))}
      </div>

      {/* scheme picker */}
      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {schemes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => chooseScheme(s.id)}
              aria-pressed={s.id === schemeId}
              className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                s.id === schemeId
                  ? "border-black font-medium text-black dark:border-zinc-100 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-black dark:text-zinc-200">
            {scheme.basis === "venue" ? "Assigned to the venue" : "Assigned to the paper"}
          </span>
          {" · "}
          {scheme.labels === "multi"
            ? "a paper can carry several"
            : "one per paper"}
          {" · "}
          {scheme.covered} of {papers.length} papers
          {". "}
          {scheme.blurb}{" "}
          <a
            href={scheme.href}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-600"
          >
            Clarivate's definition ↗
          </a>
        </p>

        {/* values */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          <FilterChip label="All" count={papers.length} on={value === ALL} onClick={() => setValue(ALL)} />
          {scheme.values.map((v) => (
            <FilterChip
              key={v.name}
              label={v.name}
              count={v.count}
              on={value === v.name}
              onClick={() => setValue(value === v.name ? ALL : v.name)}
            />
          ))}
        </div>
      </div>

      {view === "list" ? (
        <ListView groups={byYear} total={shown.length} schemeId={schemeId} />
      ) : (
        <MapView
          layout={layout}
          byKey={byKey}
          schemeId={schemeId}
          value={value}
          hovered={hovered}
          setHovered={setHovered}
          active={active}
          onPickGroup={(name) => setValue(value === name ? ALL : name)}
        />
      )}
    </div>
  );
}

function FilterChip({
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

function Classification({ paper, schemeId }: { paper: FacetPaper; schemeId: SchemeId }) {
  const vals = valuesFor(paper, schemeId);
  if (!vals.length) {
    return (
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        No value in this scheme
      </p>
    );
  }
  return <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{vals.join(" · ")}</p>;
}

function ListView({
  groups,
  total,
  schemeId,
}: {
  groups: [number | null, FacetPaper[]][];
  total: number;
  schemeId: SchemeId;
}) {
  return (
    <>
      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        {total} {total === 1 ? "paper" : "papers"}
      </p>
      <div className="mt-6 space-y-12">
        {groups.map(([year, items]) => (
          <section key={year ?? "undated"}>
            <h2 className="text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
              {year ?? "Undated"}
            </h2>
            <ul className="mt-5 space-y-7">
              {items.map((pub) => (
                <li key={pub.key}>
                  <h3 className="leading-snug font-medium text-black dark:text-zinc-50">
                    {pub.url ? (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {pub.title}
                      </a>
                    ) : (
                      pub.title
                    )}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {pub.authors.join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{citation(pub)}</p>
                  <Classification paper={pub} schemeId={schemeId} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function MapView({
  layout,
  byKey,
  schemeId,
  value,
  hovered,
  setHovered,
  active,
  onPickGroup,
}: {
  layout: MapLayout;
  byKey: Map<string, FacetPaper>;
  schemeId: SchemeId;
  value: string;
  hovered: string | null;
  setHovered: (k: string | null) => void;
  active: FacetPaper | null;
  onPickGroup: (name: string) => void;
}) {
  const dimmed = (d: { value: string }) => value !== ALL && d.value !== value;

  return (
    <>
      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        {layout.dots.length} dots for {byKey.size - layout.missing} papers
        {layout.missing > 0 && <> · {layout.missing} have no value in this scheme and are not shown</>}
        {layout.dots.length > byKey.size - layout.missing && (
          <> · a paper appears in each group it belongs to</>
        )}
      </p>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={layout.viewBox}
          className="h-auto w-full min-w-[34rem] text-black dark:text-zinc-100"
          role="img"
          aria-label={`Map of publications grouped by ${schemeId}`}
        >
          {layout.groups.map((g) => {
            // A label may use its disc plus the gutter either side of it. Past
            // that it wraps once and then truncates — Citation Topic names run
            // to sixty characters, and a singleton disc is 54 units wide.
            const room = Math.max(12, Math.floor((g.r * 2 + DOT * 6) / 5.4));
            const lines = wrapLabel(g.name, room);
            return (
              <g
                key={g.name}
                onClick={() => onPickGroup(g.name)}
                style={{ cursor: "pointer" }}
                className={value !== ALL && g.name !== value ? "opacity-40" : undefined}
              >
                <title>{`${g.name} — ${g.count}`}</title>
                <circle
                  cx={g.cx}
                  cy={g.cy}
                  r={g.r}
                  className="fill-transparent stroke-zinc-200 dark:stroke-zinc-800"
                  strokeWidth={1}
                />
                <text
                  x={g.cx}
                  y={g.labelY}
                  textAnchor="middle"
                  className="fill-zinc-600 dark:fill-zinc-400"
                  style={{ fontSize: 10.5 }}
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x={g.cx} dy={i === 0 ? 0 : 12}>
                      {line}
                      {i === lines.length - 1 && (
                        <tspan dx={4} className="fill-zinc-500 dark:fill-zinc-400">
                          {g.count}
                        </tspan>
                      )}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}

          {layout.dots.map((d, i) => {
            const isHover = hovered === d.key;
            return (
              <circle
                key={`${d.key}-${d.value}-${i}`}
                cx={d.x}
                cy={d.y}
                r={isHover ? DOT * 1.35 : DOT}
                className={
                  isHover
                    ? "fill-current"
                    : dimmed(d)
                      ? "fill-zinc-300 dark:fill-zinc-700"
                      : "fill-zinc-500 dark:fill-zinc-500"
                }
                onMouseEnter={() => setHovered(d.key)}
                onMouseLeave={() => setHovered(null)}
                // Touch has no hover, so a tap has to select the dot outright.
                onClick={() => setHovered(d.key)}
                onFocus={() => setHovered(d.key)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={byKey.get(d.key)?.title}
                style={{ cursor: "pointer", outline: "none" }}
              />
            );
          })}
        </svg>
      </div>

      {/* Fixed-height slot: the card appearing must not shift the diagram. */}
      <div className="mt-2 min-h-24 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {active ? (
          <div>
            <p className="leading-snug font-medium text-black dark:text-zinc-50">
              {active.url ? (
                <a href={active.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {active.title}
                </a>
              ) : (
                active.title
              )}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{citation(active)}</p>
            <Classification paper={active} schemeId={schemeId} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tap, hover or tab through a dot to see the paper. Choose a group name to filter.
          </p>
        )}
      </div>
    </>
  );
}
