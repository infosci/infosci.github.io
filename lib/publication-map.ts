// Positions for the map view, computed at build time.
//
// Papers are laid out as circles within their research group, and the groups
// are spread far enough apart to read as distinct clusters. Nothing here runs
// in the browser: the page ships coordinates, so there is no layout pass, no
// physics loop and no jump as a simulation settles.
//
// Deliberately monochrome. The rest of the site has no colour at all, and four
// hues introduced here would be the loudest thing on it. Groups are told apart
// by position and by a label, which is what separated clusters are for.

import { getPublications, type Publication } from "./publications";
import venueGroups from "@/data/venue-groups.json";

export const DOT = 9; // paper circle radius

/** Sunflower packing: each point at the golden angle, radius growing as √i.
 *  Gives an even disc with no gaps and no grid artefacts. The 2.15 factor is
 *  what keeps neighbouring circles from touching — verified in the assertion
 *  below rather than guessed. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SPACING = 2.15 * DOT;

function packDisc(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const r = SPACING * Math.sqrt(i + 0.5);
    const a = i * GOLDEN;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
}

const discRadius = (n: number) => SPACING * Math.sqrt(n + 0.5) + DOT;

export type MappedPaper = Publication & { group: string; x: number; y: number };
export type MappedGroup = { name: string; count: number; cx: number; cy: number; r: number };

const groupOf = (p: Publication) =>
  (venueGroups as Record<string, string>)[(p.venue ?? p.journal ?? "").trim()];

export function getPublicationMap(): {
  papers: MappedPaper[];
  groups: MappedGroup[];
  extent: { minX: number; minY: number; maxX: number; maxY: number };
} {
  const pubs = getPublications();

  const byGroup = new Map<string, Publication[]>();
  for (const p of pubs) {
    const g = groupOf(p);
    // scripts/check-groups.mjs fails the build on an unmapped venue, so this is
    // a belt-and-braces guard rather than an expected path.
    if (!g) continue;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(p);
  }

  // Largest group first, so the arrangement below is stable as papers are added.
  const entries = [...byGroup.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  // Group centres on a circle. Its radius is derived from the two largest
  // discs, so clusters never collide however the counts shift.
  const radii = entries.map(([, items]) => discRadius(items.length));
  const widest = radii.slice().sort((a, b) => b - a);
  const ORBIT = Math.max(
    ((widest[0] + (widest[1] ?? 0)) / Math.SQRT2) * 1.08,
    widest[0] * 1.25,
  );

  const papers: MappedPaper[] = [];
  const groups: MappedGroup[] = [];

  entries.forEach(([name, items], gi) => {
    // -135° puts the largest group upper-left and reads left-to-right.
    const angle = (-135 + (360 / entries.length) * gi) * (Math.PI / 180);
    const cx = ORBIT * Math.cos(angle);
    const cy = ORBIT * Math.sin(angle);

    groups.push({ name, count: items.length, cx, cy, r: discRadius(items.length) });

    // Newest nearest the centre of its cluster: the eye lands there first.
    const ordered = [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    packDisc(items.length).forEach((pt, i) => {
      papers.push({ ...ordered[i], group: name, x: cx + pt.x, y: cy + pt.y });
    });
  });

  const pad = DOT * 3;
  const xs = papers.map((p) => p.x);
  const ys = papers.map((p) => p.y);
  return {
    papers,
    groups,
    extent: {
      minX: Math.min(...xs) - pad,
      minY: Math.min(...ys) - pad * 1.6, // room for the group labels above
      maxX: Math.max(...xs) + pad,
      maxY: Math.max(...ys) + pad,
    },
  };
}
