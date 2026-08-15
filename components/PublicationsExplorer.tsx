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

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { FacetPaper, Scheme, SchemeId } from "@/lib/publication-facets";
import { valuesFor } from "@/lib/publication-facets";
import type { Network } from "@/lib/publication-network";
import { NODE_R } from "@/lib/publication-network";

type Props = { papers: FacetPaper[]; schemes: Scheme[]; network: Network };

// A value named in the URL: /publications/?scheme=topics&value=1.21%20Psychiatry.
// The homepage cards link here, so a reader lands on the lab's papers in that
// area rather than on a page of seventy-two and a hunt. Any scheme and any
// value work; the cards are just the first callers.
//
// Read through useSyncExternalStore rather than an effect. The server has no
// location, and React reuses the server snapshot for the first client render,
// so both return null and the markup matches before the real value arrives.
// Reading window.location in an effect would flash the unfiltered list first
// and trip the lint rule now gating the deploy.
//
// Never subscribed to, only read: a static export has no client-side route
// change that would rewrite the query in place.
const NO_SUBSCRIPTION = () => () => {};
const NULL_ON_SERVER = () => null;

function useUrlParam(name: string) {
  const read = useCallback(
    () => new URLSearchParams(window.location.search).get(name),
    [name],
  );
  return useSyncExternalStore<string | null>(
    NO_SUBSCRIPTION,
    read,
    NULL_ON_SERVER,
  );
}

// A separator that cannot occur inside a Web of Science value. Named rather
// than written inline: as a literal it is an invisible byte in the source, which
// is not something to leave for the next reader to discover.
const SEP = "\u0000";

// getAll returns a fresh array on every call, which useSyncExternalStore
// compares by identity and would read as a change on every render — a render
// loop. Joining to a string keeps the snapshot comparable and the caller splits
// it back, on a separator no value can contain.
const EMPTY_ON_SERVER = () => "";

function useUrlParamAll(name: string) {
  const read = useCallback(
    () => new URLSearchParams(window.location.search).getAll(name).join(SEP),
    [name],
  );
  const joined = useSyncExternalStore<string>(
    NO_SUBSCRIPTION,
    read,
    EMPTY_ON_SERVER,
  );
  return useMemo(() => (joined ? joined.split(SEP) : []), [joined]);
}

/** A five-pointed star, for the paper currently selected in the network.
 *
 *  A bigger circle among circles says "this one is larger"; a different shape
 *  says "this one is chosen", which is the actual state. It also survives the
 *  case a size cannot: a well-connected paper is already drawn large, so the
 *  selected circle and its neighbours were within a couple of pixels of each
 *  other.
 *
 *  Ten points, alternating outer and inner radius, starting at the top. The
 *  inner radius is 0.42 of the outer — the classic proportion; nearer 0.5 the
 *  points go stubby and it reads as a cog, and much below 0.38 the arms thin to
 *  spines at this size. */
function starPath(cx: number, cy: number, outer: number) {
  const inner = outer * 0.42;
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${points.join(" L")} Z`;
}

/** A circle, drawn as a path so that it is the same kind of element as the
 *  star. Swapping <circle> for <path> on selection destroyed the node mid-drag:
 *  React removes the old element, and the pointer capture taken on pointerdown
 *  goes with it. A mouse hid this — hover selects first, so the star is already
 *  there when the press lands — but on touch there is no hover, and the first
 *  drag of any node died on contact. One element, two shapes. */
function circlePath(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
}

/** Rewrite the query in place, leaving parameters the caller does not touch.
 *  Both the view toggle and the chips write to the URL, and each has to survive
 *  the other. */
function replaceQuery(mutate: (params: URLSearchParams) => void) {
  const url = new URL(window.location.href);
  mutate(url.searchParams);
  const query = url.searchParams.toString();
  window.history.replaceState(
    null,
    "",
    url.pathname + (query ? `?${query}` : ""),
  );
}

/** The scheme and values asked for, or null. Several value= are allowed, since
 *  the chips combine and a reader should be able to send someone the view they
 *  are looking at.
 *
 *  ?topic= is kept as a shorthand for the Citation Topics scheme: it was the
 *  first form of this link and may be in someone's history or notes by now. */
function useDeepLink(): { scheme: string; values: string[] } | null {
  const scheme = useUrlParam("scheme");
  const values = useUrlParamAll("value");
  const topic = useUrlParam("topic");
  if (topic) return { scheme: "topics", values: [topic] };
  if (scheme && values.length) return { scheme, values };
  return null;
}

export default function PublicationsExplorer({
  papers,
  schemes,
  network,
}: Props) {
  const asked = useDeepLink();

  // Validated here rather than downstream, so an unusable link behaves exactly
  // like no link at all — the ordinary List view. Validating inside the Explore
  // view meant a stale or hand-edited URL still forced Explore open, showing all
  // seventy-two papers under no filter, which reads as a bug rather than as a
  // page that shrugged.
  const link = useMemo(() => {
    if (!asked) return null;
    const s = schemes.find((x) => x.id === asked.scheme);
    if (!s) return null;
    // Unknown values are dropped rather than failing the whole link: a URL
    // naming three values of which one has since been reclassified should still
    // show the other two.
    const values = asked.values.filter((v) =>
      s.values.some((x) => x.name === v),
    );
    return values.length ? { scheme: s.id, values } : null;
  }, [asked, schemes]);

  // Derived, not stored. Storing the initial view would freeze it at the value
  // the first render saw — which is always "no view", since the URL is not
  // readable until hydration. Null here means "the reader has not chosen", and
  // the moment they do, their choice wins over the link that brought them.
  const urlView = useUrlParam("view");
  const [chosen, setChosen] = useState<"list" | "explore" | null>(null);
  const view =
    chosen ??
    (urlView === "list" || urlView === "explore"
      ? urlView
      : link
        ? "explore"
        : "list");

  // Written explicitly, including view=list. A reader who arrives on a filtered
  // link and switches to List is saying something the absence of a parameter
  // cannot: the filter values stay in the query, and without view=list the page
  // would reopen in Explore because they are there.
  //
  // Keeping the values is what lets the chips survive the trip. The Explore
  // view unmounts when List takes over, taking its selection with it, so the
  // URL is the only thing that remembers — go to List, come back, and the chips
  // are as they were.
  const setView = (next: "list" | "explore") => {
    setChosen(next);
    replaceQuery((p) => p.set("view", next));
  };

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
        <ExploreView
          papers={papers}
          schemes={schemes}
          network={network}
          link={link}
        />
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
  const locator = [`${pub.volume ?? ""}${issue}`.trim(), pub.pages]
    .filter(Boolean)
    .join(", ");
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
        highlighted
          ? "-ml-4 border-l-2 border-black pl-3.5 dark:border-zinc-100"
          : undefined
      }
    >
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
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {venueLine(pub)}
      </p>
      {shared && shared.length > 0 && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Shares{" "}
          <span className="text-black dark:text-zinc-200">
            {shared.join(", ")}
          </span>
          {onSelect && (
            <>
              {" · "}
              <button
                type="button"
                onClick={onSelect}
                className="underline underline-offset-2"
              >
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

function PaperList({
  papers,
  highlight,
}: {
  papers: FacetPaper[];
  highlight?: string | null;
}) {
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
              <PaperEntry
                key={pub.key}
                pub={pub}
                highlighted={highlight === pub.key}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ── Explore ────────────────────────────────────────────────────────────────

function ExploreView({
  papers,
  schemes,
  network,
  link,
}: Props & { link: { scheme: SchemeId; values: string[] } | null }) {
  // Both derived for the same reason as the view above: the URL is not readable
  // on the first render, so it cannot seed useState.
  const [chosenScheme, setChosenScheme] = useState<SchemeId | null>(null);
  const schemeId = chosenScheme ?? link?.scheme ?? "areas";
  // A set, not a single value. One chip at a time made the page assert
  // something false: that a Web of Science value is the whole of the lab's work
  // on a subject. It is not. Categories are assigned by venue and topics by
  // citations, so work on one subject lands in several — the major depressive
  // disorder paper sits under Diabetes, and the suicide papers spread across
  // three subject categories. A reader who can hold two values at once can see
  // that for themselves instead of taking one chip's word for it.
  //
  // Selecting several unions them rather than intersecting: these are places a
  // paper can sit, and asking for two means "show me both shelves". An
  // intersection would answer a question nobody arrives with, and on Citation
  // Topics — one topic per paper — it would always return nothing.
  const [chosenValues, setChosenValues] = useState<Set<string> | null>(null);
  const selected = useMemo(
    () => chosenValues ?? new Set(link?.values ?? []),
    [chosenValues, link],
  );

  // The URL follows the chips, so what a reader is looking at is what they can
  // send. Written here in the handlers rather than in an effect: the selection
  // changing is an event, not a state to synchronise afterwards.
  //
  // replaceState, not pushState. A chip is a filter, not a page, and pushing
  // would bury the way back under one entry per click. The cost is that Back
  // does not undo a chip — the chips themselves do that.
  const syncUrl = useCallback((scheme: SchemeId, values: Set<string>) => {
    replaceQuery((p) => {
      p.delete("topic");
      p.delete("scheme");
      p.delete("value");
      if (values.size) {
        p.set("scheme", scheme);
        for (const v of values) p.append("value", v);
      }
    });
  }, []);

  // Computed outside the updater on purpose. React may call a state updater
  // twice in development, and a URL write inside one would run twice with it.
  const toggleValue = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setChosenValues(next);
    syncUrl(schemeId, next);
  };

  const clearValues = () => {
    setChosenValues(new Set<string>());
    syncUrl(schemeId, new Set());
  };
  const [picked, setPicked] = useState<string | null>(null);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);

  const scheme = schemes.find((s) => s.id === schemeId)!;
  const byKey = useMemo(() => new Map(papers.map((p) => [p.key, p])), [papers]);
  const nodeAt = useMemo(
    () => new Map(network.nodes.map((d) => [d.key, d])),
    [network.nodes],
  );

  // Nothing chosen shows every paper; choosing values shows any paper carrying
  // one of them.
  const shown = useMemo(
    () =>
      selected.size === 0
        ? papers
        : papers.filter((p) =>
            valuesFor(p, schemeId).some((v) => selected.has(v)),
          ),
    [papers, schemeId, selected],
  );
  const visible = useMemo(() => new Set(shown.map((p) => p.key)), [shown]);

  function chooseScheme(id: SchemeId) {
    setChosenScheme(id);
    // A scheme change clears the selection outright, rather than keeping values
    // the new scheme happens to share. Carrying "Psychiatry" from Research Areas
    // into Subject Categories looked like continuity and was not: the two are
    // different values with the same name, assigned on different evidence and
    // holding different papers. A reader who switches scheme is asking to look
    // again, not to keep filtering.
    const cleared = new Set<string>();
    setChosenValues(cleared);
    syncUrl(id, cleared);
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
  const { viewBox, zoom } = useMemo(() => {
    const vis = network.nodes.filter((d) => visible.has(d.key));
    if (!vis.length) return { viewBox: network.viewBox, zoom: 1 };
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

    // How far this frame is zoomed out against the tightest one. Everything
    // drawn inside is multiplied by it, so a circle keeps the same size on
    // screen however wide the frame has had to open.
    //
    // Without this, a selection whose papers sit far apart in the layout came
    // out unreadable: three topics together spanned 588 units against the
    // usual 360, which dropped the nodes from 6.7px to 4.4px and left 115px of
    // the column empty. The layout is computed once at build time for all
    // seventy-two papers, so a selection inherits positions rather than being
    // laid out afresh — and papers that are unrelated are, correctly, far
    // apart. The frame has to open; the marks do not have to shrink with it.
    return {
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
      zoom: Math.max(maxX - minX, maxY - minY) / MIN,
    };
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
    for (const p of papers)
      if (p.topic && p.macro) macroOf.set(p.topic, p.macro);
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

  const active =
    (picked && visible.has(picked) ? byKey.get(picked) : null) ?? null;

  // The papers on the other end of each line, most words in common first.
  const linked = useMemo(() => {
    if (!picked) return [] as { paper: FacetPaper; words: string[] }[];
    return shownEdges
      .filter((e) => e.a === picked || e.b === picked)
      .map((e) => ({
        paper: byKey.get(e.a === picked ? e.b : e.a),
        words: e.words,
      }))
      .filter((x): x is { paper: FacetPaper; words: string[] } =>
        Boolean(x.paper),
      )
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
              {scheme.basis === "venue"
                ? "Assigned to the venue"
                : "Assigned to the paper"}
            </span>
            {" · "}
            {scheme.labels === "multi"
              ? "a paper can carry several"
              : "one per paper"}
            {" · "}
            {scheme.covered} of {papers.length} papers. {scheme.blurb};{" "}
            {scheme.scale}, {scheme.values.length} appear here.{" "}
            <a
              href={scheme.href}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-600"
            >
              Clarivate&rsquo;s definition ↗
            </a>
          </p>

          {/* Two jobs in one line, and both matter more than they look.
        
            It tells a reader the chips combine, which nothing else does — a
            control that only rewards a second click is a control most people
            never find.
        
            And it says the thing this page could otherwise quietly imply: that
            one value is the whole of the lab's work on a subject. It is not.
            Categories follow the journal and topics follow the citations, so
            work on one subject scatters — the major depressive disorder paper
            sits under Diabetes, and the suicide papers spread across three
            subject categories. Someone arriving from a homepage card lands on a
            single value, and this is what tells them there is more than one
            shelf. */}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Chips add up — choose several to read across them. Work on one
            subject often sits under more than one value.
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
                  on={selected.size === 0}
                  onClick={clearValues}
                />
                {!grouped &&
                  scheme.values.map((v) => (
                    <ValueBox
                      key={v.name}
                      label={v.name}
                      count={v.count}
                      on={selected.has(v.name)}
                      onClick={() => toggleValue(v.name)}
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
                        on={selected.has(v.name)}
                        onClick={() => toggleValue(v.name)}
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
              <span className="font-medium text-black dark:text-zinc-200">
                How the lines work.
              </span>{" "}
              Two papers are connected when their titles share two or more
              words, ignoring ordinary ones like <em>of</em>, <em>the</em> and{" "}
              <em>with</em>. Drag a circle to pull it clear of the others.
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
                    strokeWidth={(touches ? 1.8 : 1) * zoom}
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
                  const at = pos(d.key);
                  // Well-connected papers read larger. Unlinked papers stay
                  // visible rather than shrinking to nothing.
                  const r =
                    zoom *
                    NODE_R *
                    (0.8 +
                      0.55 * Math.sqrt((degreeOf.get(d.key) ?? 0) / maxDegree));

                  // Every handler is shared, so the selected paper behaves
                  // exactly like the others — it can still be dragged, and a
                  // drag does not end the moment the shape changes under the
                  // pointer.
                  const handlers = {
                    tabIndex: 0,
                    role: "button",
                    "aria-label": byKey.get(d.key)?.title,
                    onMouseEnter: () => !dragging.current && setPicked(d.key),
                    onFocus: () => setPicked(d.key),
                    onPointerDown: (e: React.PointerEvent<SVGElement>) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      dragging.current = d.key;
                      setPicked(d.key);
                    },
                    onPointerMove: (e: React.PointerEvent<SVGElement>) => {
                      if (dragging.current !== d.key) return;
                      const pt = toDiagram(e.clientX, e.clientY);
                      if (pt) setMoved((m) => ({ ...m, [d.key]: pt }));
                    },
                    onPointerUp: (e: React.PointerEvent<SVGElement>) => {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                      dragging.current = null;
                    },
                    onPointerCancel: () => {
                      dragging.current = null;
                    },
                    // Redundant beside onPointerDown for a real pointer, but
                    // assistive tech can synthesise a bare click with no pointer
                    // events at all, and that should still select the paper.
                    onClick: () => setPicked(d.key),
                    // touch-none stops a drag from scrolling the page instead.
                    style: {
                      cursor: "grab",
                      outline: "none",
                      touchAction: "none",
                    },
                  };

                  // 1.9 rather than the 1.6 a selected circle used: a star of
                  // the same radius reads smaller, because most of its area is
                  // the gaps between the arms.
                  return (
                    <path
                      key={d.key}
                      // 1.9 rather than the 1.6 a selected circle used: a star
                      // of the same radius reads smaller, because most of its
                      // area is the gaps between the arms.
                      d={
                        isPicked
                          ? starPath(at.x, at.y, zoom * NODE_R * 1.9)
                          : circlePath(at.x, at.y, r)
                      }
                      className={
                        isPicked
                          ? "fill-current"
                          : neighbours.has(d.key)
                            ? "fill-zinc-800 dark:fill-zinc-200"
                            : "fill-zinc-500 dark:fill-zinc-500"
                      }
                      {...handlers}
                    >
                      <title>{byKey.get(d.key)?.title}</title>
                    </path>
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
                {selected.size > 0 && (
                  <> · within {[...selected].join(" or ")}</>
                )}
              </>
            ) : (
              <>
                {shown.length} {shown.length === 1 ? "paper" : "papers"} ·{" "}
                {shownEdges.length} {shownEdges.length === 1 ? "link" : "links"}
                {selected.size > 0 && <> · {[...selected].join(" or ")}</>}
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
      <span
        className={
          on ? "ml-1.5 opacity-70" : "ml-1.5 text-zinc-500 dark:text-zinc-400"
        }
      >
        {count}
      </span>
    </button>
  );
}
