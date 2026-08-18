// One page per paper: its record, how Web of Science files it, which of the
// lab's areas reach it, and what it shares a title with.
//
// There are no abstracts in this data, no PDFs, no notes — those fields exist
// on every record and are empty on all seventy-two. So a paper page cannot
// summarise a paper, and does not try. It does two things nothing else on the
// site can: it puts all three classifications on one paper with the basis of
// each stated, and it gives every node in the network somewhere to go.
//
// Built at request time from the same helpers the rest of the site uses —
// disciplinesOf, researchAreasOf, citationTopicOf, the area queries, the
// network — so a paper page cannot disagree with the view that sent you to it.

import { getPublications, yearOf, type Publication } from "./publications";
import {
  disciplinesOf,
  researchAreasOf,
  citationTopicOf,
  venueOf,
} from "./disciplines";
import { getNetwork, contentWords } from "./publication-network";
import { AREAS } from "./areas";

export type RelatedPaper = {
  slug: string;
  title: string;
  year: number | null;
  words: string[];
};

export type PaperPage = {
  slug: string;
  title: string;
  authors: string[];
  venue: string;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  year: number | null;
  doi: string | null;
  url: string | null;
  categories: string[];
  areas: string[];
  topic: { meso: string; macro: string } | null;
  /** The lab's own research areas whose search reaches this paper. */
  labAreas: { title: string; q: string }[];
  related: RelatedPaper[];
};

/** A readable, stable address: the title, lowercased and hyphenated, cut to a
 *  sane length at a word boundary.
 *
 *  Not the DOI. A slug of 10.1016/j.joi.2026.101849 has to be escaped to sit in
 *  a path and tells a reader nothing, while a title says what they are about to
 *  open — and these titles are unique in this collection, checked below. */
export function slugFor(pub: Publication): string {
  const base = pub.title
    .toLowerCase()
    .replace(/[‘’“”']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length <= 72) return base;
  const cut = base.slice(0, 72);
  return cut.slice(0, cut.lastIndexOf("-"));
}

const keyOf = (pub: Publication) =>
  pub.doi ? pub.doi.toLowerCase() : pub.title;

export function getPaperSlugs(): string[] {
  const seen = new Map<string, string>();
  for (const pub of getPublications()) {
    const slug = slugFor(pub);
    // Two papers sharing a slug would silently overwrite each other's page, and
    // the survivor would look correct. Fail the build instead.
    const clash = seen.get(slug);
    if (clash) {
      throw new Error(
        `Two papers produce the slug "${slug}":\n  ${clash}\n  ${pub.title}\n` +
          "Lengthen slugFor's cut, or give one of them a distinguishing word.",
      );
    }
    seen.set(slug, pub.title);
  }
  return [...seen.keys()];
}

export function getPaperPage(slug: string): PaperPage | null {
  const pubs = getPublications();
  const pub = pubs.find((p) => slugFor(p) === slug);
  if (!pub) return null;

  const topic = citationTopicOf(pub);

  // Whatever shares two or more content words with it, which is the same rule
  // that draws an edge in the network — read from the network itself rather
  // than recomputed, so the two can never drift apart.
  const key = keyOf(pub);
  const bySlug = new Map(pubs.map((p) => [keyOf(p), p]));
  const related = getNetwork()
    .edges.filter((e) => e.a === key || e.b === key)
    .map((e) => {
      const other = bySlug.get(e.a === key ? e.b : e.a);
      return other
        ? {
            slug: slugFor(other),
            title: other.title,
            year: yearOf(other),
            words: e.words,
          }
        : null;
    })
    .filter((r): r is RelatedPaper => r !== null)
    .sort((a, b) => b.words.length - a.words.length || (b.year ?? 0) - (a.year ?? 0));

  const hay = [
    pub.title,
    pub.authors.join(" "),
    venueOf(pub),
    yearOf(pub) ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const labAreas = AREAS.filter((area) =>
    area.q
      .toLowerCase()
      .split(/\s+or\s+/)
      .some((group) => group.split(/\s+/).every((word) => hay.includes(word))),
  ).map((area) => ({ title: area.title, q: area.q }));

  return {
    slug,
    title: pub.title,
    authors: pub.authors,
    venue: venueOf(pub),
    volume: pub.volume,
    issue: pub.issue,
    pages: pub.pages,
    year: yearOf(pub),
    doi: pub.doi,
    url: pub.url,
    categories: disciplinesOf(pub),
    areas: researchAreasOf(pub),
    topic: topic ? { meso: topic.meso, macro: topic.macro } : null,
    labAreas,
    related,
  };
}

/** Words that would draw an edge, for the note under the related list. */
export const titleWords = contentWords;
