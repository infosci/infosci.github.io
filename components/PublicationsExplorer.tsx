"use client";

// Two ways to read the same 72 papers.
//
// List is the plain record — every paper, newest first, nothing to configure.
// Explore is where the narrowing happens: pick a Web of Science value or a
// paper in the graph, and the list beneath answers either.
//
// The tab says Explore rather than Network because the view outgrew the graph.
// The graph is one of three controls in it, and probably the least used —
// someone looking for the lab's medical informatics work would never think to
// click a tab called Network to find a subject filter.
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

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FacetPaper, Scheme, SchemeId } from "@/lib/publication-facets";
import { valuesFor } from "@/lib/publication-facets";
import type { Network } from "@/lib/publication-network";
import { NODE_R } from "@/lib/publication-network";

type Props = { papers: FacetPaper[]; schemes: Scheme[]; network: Network };

const ALL = "__all__";

// A Citation Topic named in the URL: /publications/?topic=1.21%20Psychiatry.
// The homepage's computational suicidology card links here, so the reader lands
// on the six papers rather than on a page of seventy-two and a hunt.
//
// Read through useSyncExternalStore rather than an effect. The server has no
// location, and React uses the server snapshot for the first client render too,
// so this returns null on both and the markup matches — then the real value
// arrives and the view re-renders. The alternative, reading window.location in
// an effect and calling setState, is the pattern the linter now rejects, and it
// would flash the unfiltered list first.
//
// The URL is never subscribed to, only read: a static export has no client-side
// route changes that would alter it in place.
const NO_SUBSCRIPTION = () => () => {};
const readTopic = () => new URLSearchParams(window.location.search).get("topic");
const noTopicOnServer = () => null;

function useTopicFromUrl() {
  return useSyncExternalStore<string | null>(NO_SUBSCRIPTION, readTopic, noTopicOnServer);
}

export default function PublicationsExplorer({ papers, schemes, network }: Props) {
  const topic = useTopicFromUrl();

  // Derived, not stored. Storing the initial view would freeze it at the value
  // the first render saw — which is always "no topic", since the URL is not
  // readable until hydration. Null here means "the reader has not chosen", and
  // the moment they do, their choice wins over the link that brought them.
  const [chosen, setChosen] = useState<"list" | "explore" | null>(null);
  const view = chosen ?? (topic ? "explore" : "list");
  const setView = setChosen;

  return (
    <div className="mt-10">
      {/* A segmented toggle, not two chips: one frame holding two halves, so it
          reads as a switch between views rather than as two filters that happen
          to be mutually exclusive. Chips below narrow what is in a view; this
          changes which view you are in.
          
          Sized off its pill rather than off its ring. Matching the ring to a
          chip's 26px left the black pill inside at 20px, and the pill is what
          the eye takes for the control — it read as the smaller thing on a
          page of chips. So the pill is now a chip exactly, 26px with the same
          px-2.5 and 12px label, down to the border — transparent here, but a
          chip's 26px counts its own, and without it the pill came out 24. The
          ring sits directly on the pill: 28px, the two borders. */}
      <div
        className="inline-flex rounded-full border border-zinc-300 dark:border-zinc-700"
        role="group"
        aria-label="View"
      >
        {(["list", "explore"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-full border border-transparent px-2.5 py-1 text-xs transition-colors ${
              view === v
                ? "bg-black text-white dark:bg-zinc-100 dark:text-black"
                : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {v === "list" ? "List" : "Explore"}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <SearchableList papers={papers} />
      ) : (
        <ExploreView papers={papers} schemes={schemes} network={network} topic={topic} />
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

/** The List view, with a text filter over it.
 *
 *  Every word has to hit, in any field and in any order, so "choi matthew"
 *  finds the peer-review paper and "sigkdd 2026" finds this year's conference
 *  work. One long substring would match neither.
 *
 *  It searches what the entry shows — title, authors, venue, year — and
 *  nothing it hides. A hit on an invisible field reads as a bug: the paper
 *  appears, and the reason it appeared is nowhere on screen.
 *
 *  Distinct from the chips in Explore, and deliberately so. The chips carry
 *  Clarivate's values and can only ever offer what Web of Science recorded;
 *  this is a plain string match on our own record of the paper, which is why
 *  it lives over the plain list. */
function SearchableList({ papers }: { papers: FacetPaper[] }) {
  const [query, setQuery] = useState("");

  const terms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const shown = useMemo(() => {
    if (!terms.length) return papers;
    return papers.filter((p) => {
      const hay = [p.title, p.authors.join(" "), venueLine(p), p.year ?? ""]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [papers, terms]);

  return (
    <div className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        {/* A chip's shape and border, since it sits in the same family of
            controls — but 16px on a phone, because iOS zooms the page when it
            focuses an input under that size, and the 12px it takes from sm up
            is only for matching the chips on a pointer device. */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author, venue"
          aria-label="Search publications"
          className="w-64 rounded-full border border-zinc-300 px-2.5 py-1 text-base text-black placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none sm:text-xs dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400"
        />
        {terms.length > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {shown.length} of {papers.length}
          </p>
        )}
      </div>

      {shown.length > 0 ? (
        <div className="mt-12">
          <PaperList papers={shown} />
        </div>
      ) : (
        <p className="mt-12 text-sm text-zinc-500 dark:text-zinc-400">
          No paper matches every word of that. Try one word, or{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="underline underline-offset-2 hover:text-black dark:hover:text-zinc-100"
          >
            clear the search
          </button>
          .
        </p>
      )}
    </div>
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

// ── Explore ────────────────────────────────────────────────────────────────

function ExploreView({ papers, schemes, network, topic }: Props & { topic: string | null }) {
  // Both derived for the same reason as the view above: the topic in the URL is
  // not known on the first render, so it cannot seed useState.
  const [chosenScheme, setChosenScheme] = useState<SchemeId | null>(null);
  const schemeId = chosenScheme ?? (topic ? "topics" : "areas");
  const [chosenValue, setChosenValue] = useState<string | null>(null);
  const value = chosenValue ?? topic ?? ALL;
  const setValue = setChosenValue;
  const [picked, setPicked] = useState<string | null>(null);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);

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
    setChosenScheme(id);
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

  // Citation Topic chips grouped under their macro topic. "4.48" is an address,
  // not a decimal — topic 48 inside broad topic 4 — and a heading carries that
  // better than the sentence that used to sit under the box explaining it.
  //
  // The grouping also shows how the work divides at the coarse level, which is
  // worth seeing and far too blunt to filter on: four values, three of them
  // holding sixty of the seventy-two papers.
  const grouped = useMemo(() => {
    if (schemeId !== "topics") return null;
    const macroOf = new Map<string, string>();
    for (const p of papers) if (p.topic && p.macro) macroOf.set(p.topic, p.macro);
    const byMacro = new Map<string, { name: string; count: number }[]>();
    for (const v of scheme.values) {
      const m = macroOf.get(v.name) ?? "";
      if (!byMacro.has(m)) byMacro.set(m, []);
      byMacro.get(m)!.push(v);
    }
    // Numeric order, so the headings read 1, 2, 4, 6 rather than by size.
    return [...byMacro.entries()]
      .sort((a, b) => Number(a[0].split(" ")[0]) - Number(b[0].split(" ")[0]))
      .map(([macro, values]) => ({ macro, values }));
  }, [schemeId, papers, scheme.values]);

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

  // Where a node is drawn: wherever it was dragged to, else where the build-time
  // layout put it.
  const pos = useCallback(
    (key: string) => moved[key] ?? nodeAt.get(key)!,
    [moved, nodeAt],
  );

  // Screen pixels to viewBox units. getScreenCTM accounts for the current scale
  // and for preserveAspectRatio's letterboxing, which a width ratio would not.
  const toDiagram = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  const active = (picked && visible.has(picked) ? byKey.get(picked) : null) ?? null;

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
              // 12px, the size every control on the site uses. These pick a
              // scheme rather than filter within one, so they were set at the
              // nav's 14px — but two type sizes among the controls on one page
              // read as an accident rather than as a distinction. The underline
              // is what separates them from the chips beneath.
              className={`-mb-px border-b-2 pb-2 text-xs transition-colors ${
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
      {/* A definite height for the row, so the chips box ends level with the
          graph instead of the tallest column setting the height. Without it the
          chips content inflates the row and the alignment is lost. Only from lg,
          where the two sit side by side.
          
          5fr/6fr rather than 2fr/3fr. The row is 736px now that the page is
          held to the rule's width, and at 2fr/3fr the chips column came to
          268px of usable space against the 278px "Operations Research &
          Management Science" needs — the label wrapped inside its own pill.
          This gives it 308px. Chips are left able to wrap on purpose: a longer
          category name than any in the data today should fold rather than
          spill out of the box. */}
      <div className="mt-6 grid items-stretch gap-8 lg:h-[32rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex min-h-0 flex-col">
        <p className="min-h-[4.25rem] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-black dark:text-zinc-200">
            {scheme.basis === "venue" ? "Assigned to the venue" : "Assigned to the paper"}
          </span>
          {" · "}
          {scheme.labels === "multi" ? "a paper can carry several" : "one per paper"}
          {" · "}
          {scheme.covered} of {papers.length} papers. {scheme.blurb}; {scheme.scale},{" "}
          {scheme.values.length} appear here.{" "}
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
        <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          {/* Takes whatever height the column has and scrolls past that, so the
              box ends level with the graph whichever scheme is showing and
              however many values it has. */}
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              <ValueBox
                label="All papers"
                count={papers.length}
                on={value === ALL}
                onClick={() => setValue(ALL)}
              />
              {!grouped &&
                scheme.values.map((v) => (
                  <ValueBox
                    key={v.name}
                    label={v.name}
                    count={v.count}
                    on={value === v.name}
                    onClick={() => setValue(value === v.name ? ALL : v.name)}
                  />
                ))}
            </div>
            {grouped?.map(({ macro, values }) => (
              <div key={macro}>
                <p className="mb-1.5 text-xs tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                  {macro}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {values.map((v) => (
                    <ValueBox
                      key={v.name}
                      label={v.name}
                      count={v.count}
                      on={value === v.name}
                      onClick={() => setValue(value === v.name ? ALL : v.name)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-black dark:text-zinc-200">How the lines work.</span>{" "}
          Two papers are connected when their titles share two or more words, ignoring ordinary
          ones like <em>of</em>, <em>the</em> and <em>with</em>. Drag a circle to pull it clear of
          the others.
        </p>
        {Object.keys(moved).length > 0 && (
          <button
            type="button"
            onClick={() => setMoved({})}
            className="text-sm whitespace-nowrap text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-black dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-100"
          >
            Reset layout
          </button>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full min-h-[16rem] w-full min-w-[20rem] text-black dark:text-zinc-100"
          role="img"
          aria-label={`Network of ${shown.length} papers linked by shared title words`}
        >
          {shownEdges.map((e) => {
            const a = pos(e.a);
            const b = pos(e.b);
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
                  cx={pos(d.key).x}
                  cy={pos(d.key).y}
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
                  onMouseEnter={() => !dragging.current && setPicked(d.key)}
                  onFocus={() => setPicked(d.key)}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    dragging.current = d.key;
                    setPicked(d.key);
                  }}
                  onPointerMove={(e) => {
                    if (dragging.current !== d.key) return;
                    const pt = toDiagram(e.clientX, e.clientY);
                    if (pt) setMoved((m) => ({ ...m, [d.key]: pt }));
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    dragging.current = null;
                  }}
                  onPointerCancel={() => {
                    dragging.current = null;
                  }}
                  // Redundant beside onPointerDown for a real pointer, but
                  // assistive tech can synthesise a bare click with no pointer
                  // events at all, and that should still select the paper.
                  onClick={() => setPicked(d.key)}
                  // touch-none stops a drag from scrolling the page instead.
                  style={{ cursor: "grab", outline: "none", touchAction: "none" }}
                >
                  <title>{byKey.get(d.key)?.title}</title>
                </circle>
              );
            })}
        </svg>
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
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
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
