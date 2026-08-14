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
// Two sources, because Clarivate classifies two ways. A journal's categories
// belong to the journal, so they are keyed by venue. A conference proceeding is
// classified per record — ISSI 2017 carries two categories, ISSI 2023 is not
// indexed at all — so those are keyed by paper.
//
// Eight papers are genuinely absent from the Core Collection and carry a
// `fallback` instead; see the comment at the top of the JSON for why that is
// still fixed metadata rather than a judgement.

import wosCategories from "@/data/wos-categories.json";
import byPaper from "@/data/wos-categories-by-paper.json";
import citationTopics from "@/data/citation-topics.json";
import { getPublications, type Publication } from "./publications";

type VenueEntry = {
  issn: string | null;
  categories: string[];
  edition: string[];
  note?: string;
  fallback?: string;
  perPaper?: boolean;
};

type PaperEntry = { categories: string[]; wosId: string | null };

const VENUES = wosCategories as unknown as Record<string, VenueEntry>;
const PAPERS = byPaper as unknown as Record<string, PaperEntry>;

// Stands in where Clarivate has nothing to say. Listed last in the facet: it
// reports an absence rather than naming a field, so it should not sit among
// values that do.
export const NOT_INDEXED = "Not WoS-indexed";

export const venueOf = (pub: Publication) => (pub.venue ?? pub.journal ?? "").trim();

// Conference records are keyed by DOI where there is one, by exact title where
// there is not — the two ISSI papers predate the lab's DOIs.
const paperKey = (pub: Publication) => pub.doi?.toLowerCase() ?? pub.title;

/** Every discipline a paper is filed under. Empty when the venue is missing from
 *  the data, or when a conference paper has no per-record entry yet — both fail
 *  scripts/check-disciplines.mjs rather than passing as uncategorized. */
export function disciplinesOf(pub: Publication): string[] {
  const entry = VENUES[venueOf(pub)];
  if (!entry) return [];

  if (entry.perPaper) {
    const record = PAPERS[paperKey(pub)];
    if (!record) return [];
    return record.categories.length ? record.categories : [NOT_INDEXED];
  }

  if (entry.categories.length) return entry.categories;
  return entry.fallback ? [entry.fallback] : [];
}

// ── Citation Topics ────────────────────────────────────────────────────────
// The other scheme, and the opposite kind: paper-based and single-label, built
// by clustering citations rather than by classifying journals. Ten papers have
// none — nine are outside the Core Collection and one is too new to have been
// clustered — so this cannot carry a filter on its own.

type TopicEntry = { meso: string; macro: string };

const TOPICS = citationTopics as unknown as Record<string, TopicEntry>;

export function citationTopicOf(pub: Publication): TopicEntry | null {
  return TOPICS[paperKey(pub)] ?? null;
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
        Number(a.name === NOT_INDEXED) - Number(b.name === NOT_INDEXED) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    );
}
