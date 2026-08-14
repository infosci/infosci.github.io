// The paper network, laid out at build time.
//
// Two papers are joined when their titles share at least two meaningful words.
// One shared word is far too loose — "data" alone links hundreds of pairs into a
// single hairball of all 72 papers — while two shared words means a genuine
// overlap of subject: drug AND molecular, suicide AND social. That gives 133
// edges, which is dense but still legible.
//
// Which words count is decided by data/title-stopwords.json, the one list on
// this site that is ours rather than Clarivate's. Only ordinary function words
// are dropped. An earlier version also dropped research boilerplate, which was
// wrong here: peer review and research methods are this lab's subject, not
// throat-clearing. Words are lightly stemmed first, so networks and network are
// the same word.
//
// Deliberately NOT built on the classification. Papers in the same category all
// share it by definition, so those edges would draw 586 lines repeating what
// the filter already said. The filter answers "what is this about"; the lines
// answer "which papers are about the same things". Two channels, two questions.
//
// 11 papers share two words with nothing else and so have no line. They are
// drawn, not dropped — a paper on its own subject is a real fact, and hiding it
// would flatter the picture.
//
// The layout is a force simulation run here, at build time, over a fixed number
// of iterations from deterministic seed positions. The browser receives
// finished coordinates: nothing settles, jitters or rearranges while a reader
// looks at it, and the same input always draws the same picture.

import { getFacetData, type FacetPaper } from "./publication-facets";
import stopwords from "@/data/title-stopwords.json";

// Only the lists named in "applied" are in force. The boilerplate list is kept
// in that file but switched off — see the note there for why.
const STOP = new Set(
  stopwords.applied.flatMap((k) => (stopwords as unknown as Record<string, string[]>)[k]),
);

/** Plural and -ies folding, enough to collapse networks/network and
 *  studies/study without pulling in a stemmer. */
const stem = (w: string) => w.replace(/ies$/, "y").replace(/sses$/, "ss").replace(/([^s])s$/, "$1");

/** Stem to the word as it was written. Matching is done on the stem so that
 *  networks and network are one word, but anything shown to a reader uses the
 *  real word — the stemmer turns "caries" into "cary", which is fine to match
 *  on and nonsense to display. */
export function contentWords(title: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of title.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)) {
    const w = raw.replace(/^-+|-+$/g, "");
    if (w.length <= 2 || STOP.has(w)) continue;
    const key = stem(w);
    if (STOP.has(key)) continue;
    if (!out.has(key)) out.set(key, w);
  }
  return out;
}

/** Lower to 1 to join papers on any shared word (a single hairball of all 72);
 *  raise to 3 for only the closest pairs (40 edges, 35 papers left alone). */
const MIN_SHARED = 2;

export type NetNode = { key: string; x: number; y: number; degree: number };
export type NetEdge = { a: string; b: string; words: string[] };
export type Network = { nodes: NetNode[]; edges: NetEdge[]; viewBox: string };

export const NODE_R = 7;

export function getNetwork(): Network {
  const { papers } = getFacetData();
  const n = papers.length;
  const words = papers.map((p: FacetPaper) => contentWords(p.title));

  const edges: { i: number; j: number; words: string[] }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const shared = [...words[i].keys()].filter((w) => words[j].has(w));
      if (shared.length >= MIN_SHARED) {
        edges.push({ i, j, words: shared.map((w) => words[i].get(w)!).sort() });
      }
    }
  }

  const degree = new Array(n).fill(0);
  for (const e of edges) {
    degree[e.i]++;
    degree[e.j]++;
  }

  // Seed on a golden-angle spiral: spread out, deterministic, and free of the
  // symmetry that leaves a ring seed oscillating.
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = 26 * Math.sqrt(i + 0.5);
    xs[i] = r * Math.cos(i * GOLDEN);
    ys[i] = r * Math.sin(i * GOLDEN);
  }

  const ITER = 400;
  const REPULSION = 5200;
  const SPRING = 0.012;
  const REST = 74;
  const CENTER = 0.006;

  const fx = new Float64Array(n);
  const fy = new Float64Array(n);

  for (let step = 0; step < ITER; step++) {
    fx.fill(0);
    fy.fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = xs[i] - xs[j];
        let dy = ys[i] - ys[j];
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          // Coincident nodes get a deterministic nudge, never a random one, so
          // the build stays reproducible.
          dx = ((i % 7) - 3) * 0.1 + 0.01;
          dy = ((j % 5) - 2) * 0.1 + 0.01;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const f = REPULSION / d2;
        fx[i] += (dx / d) * f;
        fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f;
        fy[j] -= (dy / d) * f;
      }
    }

    for (const { i, j, words: shared } of edges) {
      const dx = xs[j] - xs[i];
      const dy = ys[j] - ys[i];
      const d = Math.hypot(dx, dy) || 1;
      // More words in common pulls a pair a little tighter.
      const rest = REST / (1 + (shared.length - MIN_SHARED) * 0.22);
      const f = SPRING * (d - rest);
      fx[i] += (dx / d) * f;
      fy[i] += (dy / d) * f;
      fx[j] -= (dx / d) * f;
      fy[j] -= (dy / d) * f;
    }

    // Without this the unlinked papers drift away forever.
    for (let i = 0; i < n; i++) {
      fx[i] -= xs[i] * CENTER;
      fy[i] -= ys[i] * CENTER;
    }

    const cool = 1 - step / ITER;
    const cap = 12 * cool + 0.5;
    for (let i = 0; i < n; i++) {
      const m = Math.hypot(fx[i], fy[i]);
      const s = m > cap ? cap / m : 1;
      xs[i] += fx[i] * s;
      ys[i] += fy[i] * s;
    }
  }

  const nodes: NetNode[] = papers.map((p, i) => ({
    key: p.key,
    x: Math.round(xs[i] * 100) / 100,
    y: Math.round(ys[i] * 100) / 100,
    degree: degree[i],
  }));

  const pad = NODE_R * 5;
  const minX = Math.min(...nodes.map((d) => d.x)) - pad;
  const maxX = Math.max(...nodes.map((d) => d.x)) + pad;
  const minY = Math.min(...nodes.map((d) => d.y)) - pad;
  const maxY = Math.max(...nodes.map((d) => d.y)) + pad;

  return {
    nodes,
    edges: edges.map((e) => ({ a: papers[e.i].key, b: papers[e.j].key, words: e.words })),
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
}
