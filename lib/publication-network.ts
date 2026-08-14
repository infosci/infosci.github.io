// The co-authorship network, laid out at build time.
//
// Two papers are linked when they share at least two authors besides Yongjun
// Zhu. He is on all 72, so including him would link every paper to every other;
// and a single shared author is too loose — 481 edges on 72 nodes is a hairball
// you cannot read. Two shared authors means a team that worked together more
// than once, which is 87 edges and legible.
//
// Deliberately NOT built on the classification. Papers in the same category all
// share it by definition, so those edges would draw 586 lines and tell you
// nothing the grouping has not already said. Position and colour answer "what
// is this about"; the edges answer "who worked on it together". Two questions,
// two channels.
//
// 32 papers have no repeat collaborator and so no edge. They are drawn, not
// dropped: a paper written once with people who did not return is a real fact
// about how a lab works, and hiding it would flatter the picture.
//
// The layout is a force simulation run here, at build time, over a fixed number
// of iterations from deterministic seed positions. The browser receives
// coordinates. Nothing settles, jitters, or rearranges while a reader looks at
// it, and the same input always produces the same picture.

import { getFacetData, type FacetPaper } from "./publication-facets";

const PI = "Yongjun Zhu";

/** Authors two papers share, excluding the PI. */
const sharedAuthors = (a: FacetPaper, b: FacetPaper) =>
  a.authors.filter((x) => x !== PI && b.authors.includes(x));

/** Raise to 1 to link on any shared author (481 edges), 3 to link only on the
 *  closest teams (26 edges, 48 papers left unconnected). */
const MIN_SHARED = 2;

export type NetNode = { key: string; x: number; y: number; degree: number };
export type NetEdge = { a: string; b: string; weight: number };
export type Network = {
  nodes: NetNode[];
  edges: NetEdge[];
  viewBox: string;
  linked: number;
};

export const NODE_R = 7;

export function getNetwork(): Network {
  const { papers } = getFacetData();
  const n = papers.length;

  const edges: { i: number; j: number; weight: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const shared = sharedAuthors(papers[i], papers[j]).length;
      if (shared >= MIN_SHARED) edges.push({ i, j, weight: shared });
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

  // Spring–repulsion with a cooling schedule. 400 iterations settles this graph
  // well past the point where more changes the picture.
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
          // Coincident nodes get a deterministic nudge rather than a random one,
          // so the build stays reproducible.
          dx = ((i % 7) - 3) * 0.1 + 0.01;
          dy = ((j % 5) - 2) * 0.1 + 0.01;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const f = REPULSION / d2;
        const ux = (dx / d) * f;
        const uy = (dy / d) * f;
        fx[i] += ux;
        fy[i] += uy;
        fx[j] -= ux;
        fy[j] -= uy;
      }
    }

    for (const { i, j, weight } of edges) {
      const dx = xs[j] - xs[i];
      const dy = ys[j] - ys[i];
      const d = Math.hypot(dx, dy) || 1;
      // A pair with more shared authors is pulled a little tighter.
      const rest = REST / (1 + (weight - MIN_SHARED) * 0.22);
      const f = SPRING * (d - rest);
      const ux = (dx / d) * f;
      const uy = (dy / d) * f;
      fx[i] += ux;
      fy[i] += uy;
      fx[j] -= ux;
      fy[j] -= uy;
    }

    // Without this the unconnected papers drift away forever.
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
    edges: edges.map((e) => ({ a: papers[e.i].key, b: papers[e.j].key, weight: e.weight })),
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    linked: degree.filter((d) => d > 0).length,
  };
}
