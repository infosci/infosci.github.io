// Discipline, as Clarivate assigns it.
//
// The values come from data/wos-categories.json, which holds the Web of Science
// subject categories read out of Journal Citation Reports for each of the 46
// venues this lab has published in. Nothing here reads a title or an abstract:
// the discipline of a paper is a property of where it appeared, so it cannot
// shift with anyone's reading of the work.
//
// Multi-label, because the source is. JASIST is filed under two categories and
// JAMIA under five, so one paper answers to several disciplines and has to
// appear under each of them — filing it under only the first would hide it from
// a reader browsing the others.
//
// Twelve venues have no WoS category at all and carry a `fallback` instead; see
// the comment at the top of the JSON for why, and why it is still fixed
// metadata rather than a judgement.

import wosCategories from "@/data/wos-categories.json";
import { getPublications, type Publication } from "./publications";

type VenueEntry = {
  issn: string | null;
  categories: string[];
  edition: string[];
  note?: string;
  fallback?: string;
};

const VENUES = wosCategories as unknown as Record<string, VenueEntry>;

// The two values standing in for a WoS category. Listed last in the facet: they
// say where a paper appeared, not what field it belongs to, so they read as
// outside the scheme rather than as more of it.
export const NON_WOS = ["Conference proceedings", "Not WoS-indexed"];

export const venueOf = (pub: Publication) => (pub.venue ?? pub.journal ?? "").trim();

/** Every discipline a paper is filed under. Empty only for a venue missing from
 *  the data — scripts/check-disciplines.mjs fails the build on one of those. */
export function disciplinesOf(pub: Publication): string[] {
  const entry = VENUES[venueOf(pub)];
  if (!entry) return [];
  if (entry.categories.length) return entry.categories;
  return entry.fallback ? [entry.fallback] : [];
}

export type DisciplineFacet = { name: string; count: number };

/** Facet values with paper counts, commonest first, the two non-WoS values last.
 *  Counts sum to more than the number of papers: most papers carry several. */
export function getDisciplineFacets(): DisciplineFacet[] {
  const counts = new Map<string, number>();
  for (const pub of getPublications()) {
    for (const d of disciplinesOf(pub)) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (a, b) =>
        Number(NON_WOS.includes(a.name)) - Number(NON_WOS.includes(b.name)) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    );
}
