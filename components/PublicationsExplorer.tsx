"use client";

// Two ways to read the same 72 papers.
//
// List is the plain record — every paper, newest first, nothing to configure.
// Network is where the exploring happens: pick a Web of Science value and see
// both the graph of those papers and the papers themselves, one under the other.
//
// The values in this view are Clarivate's, read from Web of Science, and each
// scheme is named exactly as the field is labelled on a Web of Science record
// rather than shortened by us. The page says "classified using" rather than
// "classified by": Web of Science classified journals and records, not this
// list of papers. We applied its schemes to ours, and where it has no record at
// all the stand-in value is ours. Each states its basis — venue or paper — because
// a student should be able to tell that "Computer Science" from a journal and
// "2.123 Protein Stucture" from a citation cluster are different kinds of claim
// about the same paper.
//
// The one thing here that is not Clarivate's is which words count as meaningful
// in a title, and that rule is written out under the network rather than left
// for the reader to infer from the lines.

import { useMemo, useState } from "react";
import type { FacetPaper, Scheme, SchemeId } from "@/lib/publication-facets";
import { valuesFor } from "@/lib/publication-facets";
import { NOT_INDEXED } from "@/lib/disciplines";
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
        <div className="mt-12 max-w-3xl">
          <PaperList papers={papers} />
        </div>
      ) : (
        <NetworkView papers={papers} schemes={schemes} network={network} />
      )}
    </div>
  );
}

// ── Shared list ────────────────────────────────────────────────────────────

// "Journal of Informetrics 20(1), 101766" — assembled rather than templated,
// because online-first papers legitimately have no volume, issue or pages yet
// and the punctuation has to survive their absence.
function venueLine(pub: FacetPaper) {
  const issue = pub.issue ? `(${pub.issue})` : "";
  const locator = [`${pub.volume ?? ""}${issue}`.trim(), pub.pages].filter(Boolean).join(", ");
  return [pub.venue, locator].filter(Boolean).join(" ");
}

/** One paper, rendered the same way wherever it appears.
 *
 *  highlighted marks the paper under the pointer with a left rule rather than a
 *  padded background: it changes only horizontal metrics, so nothing below it
 *  moves as the selection changes. A padded background did move the page, and
 *  cancelling that with a negative margin then fought the list's own spacing.
 *
 *  shared names the words joining this paper to the selected one, shown only in
 *  the connected list where that is the reason it is on screen. */
function PaperEntry({
  pub,
  highlighted,
  shared,
  onSelect,
}: {
  pub: FacetPaper;
  highlighted?: boolean;
  shared?: string[];
  onSelect?: () => void;
}) {
  return (
    <li
      className={
        highlighted ? "-ml-4 border-l-2 border-black pl-3.5 dark:border-zinc-100" : undefined
      }
    >
      <h3 className="leading-snug font-medium text-black dark:text-zinc-50">
        {pub.url ? (
          <a href={pub.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
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
      {shared && shared.length > 0 && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Shares{" "}
          <span className="text-black dark:text-zinc-200">{shared.join(", ")}</span>
          {onSelect && (
            <>
              {" · "}
              <button type="button" onClick={onSelect} className="underline underline-offset-2">
                centre on this
              </button>
            </>
          )}
        </p>
      )}
    </li>
  );
}

function PaperList({ papers, highlight }: { papers: FacetPaper[]; highlight?: string | null }) {
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
    <div className="space-y-12">
      {years.map(([year, items]) => (
        <section key={year ?? "undated"}>
          <h2 className="text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
            {year ?? "Undated"}
          </h2>
          <ul className="mt-5 space-y-7">
            {items.map((pub) => (
              <PaperEntry key={pub.key} pub={pub} highlighted={highlight === pub.key} />
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
  const shown = useMemo(
    () => (value === ALL ? papers : papers.filter((p) => valuesFor(p, schemeId).includes(value))),
    [papers, schemeId, value],
  );
  const visible = useMemo(() => new Set(shown.map((p) => p.key)), [shown]);

  function chooseScheme(id: SchemeId) {
    setSchemeId(id);
    const next = schemes.find((s) => s.id === id)!;
    if (value !== ALL && !next.values.some((v) => v.name === value)) setValue(ALL);
  }

  // An edge survives only if both its papers do, so a narrowed network never
  // runs a line to something that is not on screen.
  const shownEdges = useMemo(
    () => network.edges.filter((e) => visible.has(e.a) && visible.has(e.b)),
    [network.edges, visible],
  );

  // Frame what is actually on screen. Keeping the whole network's extent when
  // eleven papers are showing strands them in empty space; the minimum stops a
  // two-paper selection from zooming to absurdity.
  const viewBox = useMemo(() => {
    const vis = network.nodes.filter((d) => visible.has(d.key));
    if (!vis.length) return network.viewBox;
    const pad = NODE_R * 5;
    const MIN = 360;
    let [minX, maxX] = [
      Math.min(...vis.map((d) => d.x)) - pad,
      Math.max(...vis.map((d) => d.x)) + pad,
    ];
    let [minY, maxY] = [
      Math.min(...vis.map((d) => d.y)) - pad,
      Math.max(...vis.map((d) => d.y)) + pad,
    ];
    const grow = (lo: number, hi: number): [number, number] => {
      const short = MIN - (hi - lo);
      return short > 0 ? [lo - short / 2, hi + short / 2] : [lo, hi];
    };
    [minX, maxX] = grow(minX, maxX);
    [minY, maxY] = grow(minY, maxY);
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [network.nodes, network.viewBox, visible]);

  // "4.48" is an address, not a decimal: topic 48 inside broad topic 4. Without
  // the broad topics spelled out the prefix is unreadable, so list the ones
  // these papers actually fall into.
  const macros = useMemo(() => {
    if (schemeId !== "topics") return [];
    return [...new Set(papers.map((p) => p.macro).filter(Boolean))].sort(
      (a, b) => Number(a!.split(" ")[0]) - Number(b!.split(" ")[0]),
    ) as string[];
  }, [papers, schemeId]);

  // Degree of what is actually on screen, so a node's size reflects the current
  // selection rather than its standing in the full network.
  const degreeOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of shownEdges) {
      m.set(e.a, (m.get(e.a) ?? 0) + 1);
      m.set(e.b, (m.get(e.b) ?? 0) + 1);
    }
    return m;
  }, [shownEdges]);
  const maxDegree = Math.max(1, ...degreeOf.values());

  const active = (picked && visible.has(picked) ? byKey.get(picked) : null) ?? null;

  // Why this paper sits where it does: the words joining it to its neighbours,
  // commonest first.
  const linkWords = useMemo(() => {
    if (!picked) return [] as string[];
    const tally = new Map<string, number>();
    for (const e of shownEdges) {
      if (e.a !== picked && e.b !== picked) continue;
      for (const w of e.words) tally.set(w, (tally.get(w) ?? 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([w]) => w);
  }, [picked, shownEdges]);

  // The papers on the other end of each line, most words in common first.
  const linked = useMemo(() => {
    if (!picked) return [] as { paper: FacetPaper; words: string[] }[];
    return shownEdges
      .filter((e) => e.a === picked || e.b === picked)
      .map((e) => ({ paper: byKey.get(e.a === picked ? e.b : e.a), words: e.words }))
      .filter((x): x is { paper: FacetPaper; words: string[] } => Boolean(x.paper))
      .sort(
        (a, b) =>
          b.words.length - a.words.length ||
          (b.paper.year ?? 0) - (a.paper.year ?? 0) ||
          a.paper.title.localeCompare(b.paper.title),
      );
  }, [picked, shownEdges, byKey]);
  const neighbours = useMemo(() => {
    const s = new Set<string>();
    if (!picked) return s;
    for (const e of shownEdges) {
      if (e.a === picked) s.add(e.b);
      if (e.b === picked) s.add(e.a);
    }
    return s;
  }, [picked, shownEdges]);

  return (
    <>
      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-xs tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          Classified using Web of Science schemes
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
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
              {s.shortName}
            </button>
          ))}
        </div>

      </div>

      {/* Two ways to narrow the same set, side by side: pick a value on the
          left, or a paper on the right. Stacked below lg, where two columns
          would leave the graph too narrow to read. */}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <div>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-black dark:text-zinc-200">
            {scheme.basis === "venue" ? "Assigned to the venue" : "Assigned to the paper"}
          </span>
          {" · "}
          {scheme.labels === "multi" ? "a paper can carry several" : "one per paper"}
          {" · "}
          {scheme.covered} of {papers.length} papers. {scheme.blurb} Clarivate has{" "}
          {scheme.scale}; {scheme.values.length} of them appear in these papers.{" "}
          <a
            href={scheme.href}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-600"
          >
            Clarivate&rsquo;s definition ↗
          </a>
        </p>

        {/* One frame around the whole set. The chips vary in width because the
            names do, but the box gives them a single edge to sit inside so they
            read as one control rather than as loose scattered lozenges. */}
        <div className="mt-5 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex flex-wrap gap-1.5">
            <ValueBox
              label="All papers"
              count={papers.length}
              on={value === ALL}
              onClick={() => setValue(ALL)}
            />
            {scheme.values.map((v) => (
              <ValueBox
                key={v.name}
                label={v.name}
                count={v.count}
                on={value === v.name}
                onClick={() => setValue(value === v.name ? ALL : v.name)}
              />
            ))}
          </div>
          {macros.length > 0 && (
            <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              The number is an address, not a decimal: the digit before the dot is the broad
              topic &mdash; {macros.join(", ")} &mdash; and a third level of finer topics sits
              below these.
            </p>
          )}
          {scheme.values.some((v) => v.name === NOT_INDEXED) && (
            <p className="mt-3 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Every value here is Clarivate&rsquo;s except{" "}
              <span className="text-black dark:text-zinc-200">{NOT_INDEXED}</span>, which is ours
              and marks papers Web of Science has no record of.
            </p>
          )}
        </div>
        </div>

        <div>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-black dark:text-zinc-200">How the lines work.</span>{" "}
        Two papers are connected when their titles share two or more words, ignoring ordinary
        ones like <em>of</em>, <em>the</em> and <em>with</em>.
      </p>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full min-w-[20rem] text-black dark:text-zinc-100"
          style={{ height: "20rem" }}
          role="img"
          aria-label={`Network of ${shown.length} papers linked by shared title words`}
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
              >
                <title>{e.words.join(", ")}</title>
              </line>
            );
          })}

          {network.nodes
            .filter((d) => visible.has(d.key))
            .map((d) => {
              const isPicked = picked === d.key;
              return (
                <circle
                  key={d.key}
                  cx={d.x}
                  cy={d.y}
                  // Well-connected papers read larger. Unlinked papers stay
                  // visible rather than shrinking to nothing.
                  r={
                    isPicked
                      ? NODE_R * 1.6
                      : NODE_R * (0.8 + 0.55 * Math.sqrt((degreeOf.get(d.key) ?? 0) / maxDegree))
                  }
                  className={
                    isPicked
                      ? "fill-current"
                      : neighbours.has(d.key)
                        ? "fill-zinc-800 dark:fill-zinc-200"
                        : "fill-zinc-500 dark:fill-zinc-500"
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={byKey.get(d.key)?.title}
                  onMouseEnter={() => setPicked(d.key)}
                  onFocus={() => setPicked(d.key)}
                  onClick={() => setPicked(d.key)}
                  style={{ cursor: "pointer", outline: "none" }}
                >
                  <title>{byKey.get(d.key)?.title}</title>
                </circle>
              );
            })}
        </svg>
      </div>

      {/* Directly under the graph, because hovering a node whose only feedback
          was a highlighted row far below the fold looked like doing nothing.
          Fixed height so the diagram does not jump as the card fills. */}
      {/* A fixed height, not a minimum: this fills and empties on every hover,
          and anything below a growing box gets shoved down the page. Lines are
          clamped so a 184-character title cannot overflow it on a narrow
          screen — the full title is a tap away in the list below. */}
      <div className="mt-2 h-56 overflow-hidden border-t border-zinc-200 pt-3 sm:h-48 dark:border-zinc-800">
        {active ? (
          <div>
            <p className="line-clamp-2 leading-snug font-medium text-black dark:text-zinc-50">
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
            <p className="mt-1 line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">
              {[active.venue, active.year].filter(Boolean).join(" · ")}
              {" · "}
              {valuesFor(active, schemeId).join(" · ") || "no value in this scheme"}
            </p>
            <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
              {neighbours.size === 0 ? (
                <>Shares fewer than two content words with anything else shown.</>
              ) : (
                <>
                  Linked to {neighbours.size} {neighbours.size === 1 ? "paper" : "papers"} by{" "}
                  <span className="text-black dark:text-zinc-200">{linkWords.join(", ")}</span>
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Hover, tap or tab through a circle to see the paper and what connects it. Bigger
            circles have more links.
          </p>
        )}
      </div>

        </div>
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {active ? (
              <>
                {linked.length === 0
                  ? "This paper on its own — nothing shares two words with it"
                  : `This paper and the ${linked.length} it links to`}
                {value !== ALL && <> · within {value}</>}
              </>
            ) : (
              <>
                {shown.length} {shown.length === 1 ? "paper" : "papers"} · {shownEdges.length}{" "}
                {shownEdges.length === 1 ? "link" : "links"}
                {value !== ALL && <> · {value}</>}
              </>
            )}
          </p>
          {active && (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-black dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-100"
            >
              Show all {shown.length}
            </button>
          )}
        </div>
        <div className="mt-8 max-w-3xl">
          {active ? (
            <ul className="space-y-7">
              <PaperEntry pub={active} highlighted />
              {linked.map(({ paper, words }) => (
                <PaperEntry
                  key={paper.key}
                  pub={paper}
                  shared={words}
                  onSelect={() => setPicked(paper.key)}
                />
              ))}
            </ul>
          ) : (
            <PaperList papers={shown} highlight={picked} />
          )}
        </div>
      </div>
    </>
  );
}

function ValueBox({
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
