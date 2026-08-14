"use client";

// Two ways to read the same 72 papers.
//
// List is the plain record — every paper, newest first, nothing to configure.
// Network is where the exploring happens: the co-authorship graph, narrowed by
// any of three Clarivate schemes.
//
// The filter lives only in the Network view on purpose. A reader who came for
// the list wants all of it; a reader who wants to narrow down is already
// looking at the graph.
//
// Each scheme states its basis — venue or paper — and links to Clarivate's own
// page rather than to our paraphrase. Prospective students are the audience,
// and they should be able to tell that "Computer Science" from a journal and
// "2.123 Protein Stucture" from a citation cluster are different kinds of claim
// about the same paper.

import { useMemo, useState } from "react";
import type { FacetPaper, Scheme, SchemeId } from "@/lib/publication-facets";
import { valuesFor } from "@/lib/publication-facets";
import type { Network } from "@/lib/publication-network";
import { NODE_R } from "@/lib/publication-network";

type Props = { papers: FacetPaper[]; schemes: Scheme[]; network: Network };

const ALL = "__all__";

export default function PublicationsExplorer({ papers, schemes, network }: Props) {
  const [view, setView] = useState<"list" | "network">("list");

  return (
    <div className="mt-10">
      <div className="flex items-center gap-1" role="group" aria-label="View">
        {(["list", "network"] as const).map((v) => (
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
            {v === "list" ? "List" : "Network"}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <ListView papers={papers} />
      ) : (
        <NetworkView papers={papers} schemes={schemes} network={network} />
      )}
    </div>
  );
}

// ── List ───────────────────────────────────────────────────────────────────

// "Journal of Informetrics 20(1), 101766" — assembled rather than templated,
// because online-first papers legitimately have no volume, issue or pages yet
// and the punctuation has to survive their absence.
function venueLine(pub: FacetPaper) {
  const issue = pub.issue ? `(${pub.issue})` : "";
  const locator = [`${pub.volume ?? ""}${issue}`.trim(), pub.pages].filter(Boolean).join(", ");
  return [pub.venue, locator].filter(Boolean).join(" ");
}

function ListView({ papers }: { papers: FacetPaper[] }) {
  const years = useMemo(() => {
    const groups = new Map<number | null, FacetPaper[]>();
    for (const p of papers) {
      const bucket = groups.get(p.year) ?? [];
      bucket.push(p);
      groups.set(p.year, bucket);
    }
    return [...groups.entries()].sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0));
  }, [papers]);

  return (
    <div className="mt-12 space-y-12">
      {years.map(([year, items]) => (
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
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{venueLine(pub)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ── Network ────────────────────────────────────────────────────────────────

function NetworkView({ papers, schemes, network }: Props) {
  const [schemeId, setSchemeId] = useState<SchemeId>("areas");
  const [value, setValue] = useState<string>(ALL);
  const [picked, setPicked] = useState<string | null>(null);

  const scheme = schemes.find((s) => s.id === schemeId)!;
  const byKey = useMemo(() => new Map(papers.map((p) => [p.key, p])), [papers]);
  const nodeAt = useMemo(() => new Map(network.nodes.map((d) => [d.key, d])), [network.nodes]);

  // Nothing chosen shows every paper; choosing a value shows only those.
  const visible = useMemo(() => {
    if (value === ALL) return new Set(papers.map((p) => p.key));
    return new Set(papers.filter((p) => valuesFor(p, schemeId).includes(value)).map((p) => p.key));
  }, [papers, schemeId, value]);

  function chooseScheme(id: SchemeId) {
    setSchemeId(id);
    const next = schemes.find((s) => s.id === id)!;
    if (value !== ALL && !next.values.some((v) => v.name === value)) setValue(ALL);
  }

  // An edge survives only if both its papers do, so a narrowed network never
  // shows a line running to something that is not on screen.
  const shownEdges = useMemo(
    () => network.edges.filter((e) => visible.has(e.a) && visible.has(e.b)),
    [network.edges, visible],
  );

  // Frame what is actually on screen. Keeping the whole network's extent when
  // eleven papers are showing strands them in a field of empty space; a minimum
  // extent stops a two-paper selection from zooming to absurdity.
  const viewBox = useMemo(() => {
    const vis = network.nodes.filter((d) => visible.has(d.key));
    if (!vis.length) return network.viewBox;
    const pad = NODE_R * 5;
    const MIN = 360;
    let minX = Math.min(...vis.map((d) => d.x)) - pad;
    let maxX = Math.max(...vis.map((d) => d.x)) + pad;
    let minY = Math.min(...vis.map((d) => d.y)) - pad;
    let maxY = Math.max(...vis.map((d) => d.y)) + pad;
    const grow = (lo: number, hi: number) => {
      const short = MIN - (hi - lo);
      return short > 0 ? [lo - short / 2, hi + short / 2] : [lo, hi];
    };
    [minX, maxX] = grow(minX, maxX);
    [minY, maxY] = grow(minY, maxY);
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [network.nodes, network.viewBox, visible]);

  const active = (picked ? byKey.get(picked) : null) ?? null;
  const neighbours = useMemo(() => {
    if (!picked) return new Set<string>();
    const s = new Set<string>();
    for (const e of shownEdges) {
      if (e.a === picked) s.add(e.b);
      if (e.b === picked) s.add(e.a);
    }
    return s;
  }, [picked, shownEdges]);

  return (
    <>
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
          {scheme.labels === "multi" ? "a paper can carry several" : "one per paper"}
          {" · "}
          {scheme.covered} of {papers.length} papers. {scheme.blurb}{" "}
          <a
            href={scheme.href}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-600"
          >
            Clarivate&rsquo;s definition ↗
          </a>
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          <FilterChip
            label="All papers"
            count={papers.length}
            on={value === ALL}
            onClick={() => setValue(ALL)}
          />
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

      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {visible.size} {visible.size === 1 ? "paper" : "papers"} · {shownEdges.length}{" "}
        {shownEdges.length === 1 ? "link" : "links"}. Two papers are joined when they share at
        least two authors besides Yongjun Zhu, so a line means a team that worked together more
        than once. A paper with no line had no repeat collaborators.
      </p>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={viewBox}
          className="h-auto w-full min-w-[32rem] text-black dark:text-zinc-100"
          role="img"
          aria-label="Co-authorship network of the lab's publications"
        >
          {shownEdges.map((e) => {
            const a = nodeAt.get(e.a)!;
            const b = nodeAt.get(e.b)!;
            const touches = picked === e.a || picked === e.b;
            return (
              <line
                key={`${e.a}|${e.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={touches ? 1.8 : 1}
                className={
                  touches
                    ? "stroke-zinc-600 dark:stroke-zinc-300"
                    : "stroke-zinc-500 dark:stroke-zinc-500"
                }
              />
            );
          })}

          {network.nodes
            .filter((d) => visible.has(d.key))
            .map((d) => {
              const isPicked = picked === d.key;
              const isNeighbour = neighbours.has(d.key);
              return (
                <circle
                  key={d.key}
                  cx={d.x}
                  cy={d.y}
                  r={isPicked ? NODE_R * 1.4 : NODE_R}
                  className={
                    isPicked
                      ? "fill-current"
                      : isNeighbour
                        ? "fill-zinc-700 dark:fill-zinc-300"
                        : "fill-zinc-500 dark:fill-zinc-500"
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={byKey.get(d.key)?.title}
                  onMouseEnter={() => setPicked(d.key)}
                  onFocus={() => setPicked(d.key)}
                  onClick={() => setPicked(d.key)}
                  style={{ cursor: "pointer", outline: "none" }}
                />
              );
            })}
        </svg>
      </div>

      {/* Fixed-height slot: the card appearing must not shift the diagram. */}
      <div className="mt-2 min-h-28 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {active ? (
          <div>
            <p className="leading-snug font-medium text-black dark:text-zinc-50">
              {active.url ? (
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {active.title}
                </a>
              ) : (
                active.title
              )}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {active.authors.join(", ")}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {[active.venue, active.year].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {valuesFor(active, schemeId).join(" · ") || "No value in this scheme"}
              {neighbours.size > 0 &&
                ` — linked to ${neighbours.size} ${neighbours.size === 1 ? "paper" : "papers"}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tap, hover or tab through a paper to see it. Choose a value above to narrow the
            network.
          </p>
        )}
      </div>
    </>
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
