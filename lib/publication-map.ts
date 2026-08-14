// Coordinates for the map view, computed at build time.
//
// The page ships positions rather than a simulation: no physics loop, no layout
// pass on load, nothing that drifts while you look at it. Papers in the same
// group sit together because they share a Clarivate value, not because a force
// pulled them there.
//
// Deliberately monochrome. The rest of the site has no colour, and nineteen
// hues would be the loudest thing on it — groups are told apart by position and
// a label, which is what separated clusters are for.
//
// A paper appears once per value it carries, so under a multi-label scheme the
// dot count exceeds the paper count. That is the honest rendering: a paper
// filed under both Computer Science and Information Science genuinely belongs
// in both clusters, and hovering one dot lights up its twins.

import { getFacetData, valuesFor, type FacetPaper, type SchemeId } from "./publication-facets";
import { NOT_INDEXED } from "./disciplines";

export const DOT = 7;

/** Sunflower packing: each point at the golden angle, radius growing as √i —
 *  an even disc with no gaps and no grid artefacts. 2.3 keeps neighbours from
 *  touching at this dot size. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SPACING = 2.3 * DOT;

const packDisc = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const r = SPACING * Math.sqrt(i + 0.5);
    const a = i * GOLDEN;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });

const discRadius = (n: number) => SPACING * Math.sqrt(n + 0.5) + DOT;

export type MapDot = { key: string; value: string; x: number; y: number };
export type MapGroup = {
  name: string;
  count: number;
  cx: number;
  cy: number;
  r: number;
  /** Shared baseline for every label in this row. */
  labelY: number;
};
export type MapLayout = {
  dots: MapDot[];
  groups: MapGroup[];
  viewBox: string;
  /** Papers with no value in this scheme — absent from the map, named in the UI. */
  missing: number;
};

function layout(papers: FacetPaper[], scheme: SchemeId): MapLayout {
  const byValue = new Map<string, FacetPaper[]>();
  for (const p of papers) {
    for (const v of valuesFor(p, scheme)) {
      if (!byValue.has(v)) byValue.set(v, []);
      byValue.get(v)!.push(p);
    }
  }

  // Largest first, so the arrangement stays stable as papers are added and the
  // eye meets the substantial groups before the singletons.
  const entries = [...byValue.entries()].sort(
    (a, b) =>
      Number(a[0] === NOT_INDEXED) - Number(b[0] === NOT_INDEXED) ||
      b[1].length - a[1].length ||
      a[0].localeCompare(b[0]),
  );

  // Shelf packing: discs laid left to right, wrapping like text. A ring was the
  // obvious arrangement and it fails here — nineteen groups ranging from 38
  // papers down to 1 put neighbours 19° apart, so the big discs swallowed the
  // small ones and every label collided. Rows cope with any number of groups at
  // any mix of sizes, and leave each label a clear strip beneath its disc.
  const TARGET_W = 900;
  const GAP = DOT * 6;
  const LABEL_H = 42;

  // First pass assigns groups to rows; the second positions them. Two passes,
  // because a disc's vertical placement depends on the tallest disc in its row
  // and that is not known until the row is full.
  type Row = { items: [string, FacetPaper[]][]; maxR: number; width: number };
  const rows: Row[] = [];
  let row: Row = { items: [], maxR: 0, width: 0 };

  for (const entry of entries) {
    const r = discRadius(entry[1].length);
    if (row.items.length && row.width + r * 2 > TARGET_W) {
      rows.push(row);
      row = { items: [], maxR: 0, width: 0 };
    }
    row.items.push(entry);
    row.maxR = Math.max(row.maxR, r);
    row.width += r * 2 + GAP;
  }
  if (row.items.length) rows.push(row);

  const dots: MapDot[] = [];
  const groups: MapGroup[] = [];
  let rowTop = 0;
  let widest = 0;

  for (const r of rows) {
    let x = 0;
    // Every disc in the row shares a centre line and every label a baseline, so
    // a row reads as a row rather than as a ragged shelf.
    const midY = rowTop + r.maxR;
    const labelY = rowTop + r.maxR * 2 + 14;

    for (const [name, items] of r.items) {
      const rad = discRadius(items.length);
      const cx = x + rad;
      groups.push({ name, count: items.length, cx, cy: midY, r: rad, labelY });

      // Newest nearest the centre of its cluster.
      const ordered = [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      packDisc(items.length).forEach((pt, i) => {
        dots.push({ key: ordered[i].key, value: name, x: cx + pt.x, y: midY + pt.y });
      });

      x += rad * 2 + GAP;
    }

    widest = Math.max(widest, x - GAP);
    rowTop += r.maxR * 2 + LABEL_H + GAP;
  }

  const pad = DOT * 2;
  return {
    dots,
    groups,
    viewBox: `${-pad} ${-pad} ${widest + pad * 2} ${rowTop - GAP + pad * 2}`,
    missing: papers.filter((p) => valuesFor(p, scheme).length === 0).length,
  };
}

export function getMapLayouts(): Record<SchemeId, MapLayout> {
  const { papers } = getFacetData();
  return {
    areas: layout(papers, "areas"),
    categories: layout(papers, "categories"),
    topics: layout(papers, "topics"),
  };
}
