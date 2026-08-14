// The three classification schemes, assembled into one serializable payload for
// the client.
//
// Everything here is Clarivate's. The point of showing three rather than one is
// that they disagree in ways worth seeing: a paper published at an AI conference
// can sit in Computer Science by venue and in Chemistry by citation, and neither
// reading is wrong. Each scheme carries its basis and a link to Clarivate's own
// definition so a reader can check what they are looking at.

import { getPublications, yearOf, type Publication } from "./publications";
import { disciplinesOf, researchAreasOf, citationTopicOf, NOT_INDEXED } from "./disciplines";
import glossary from "@/data/wos-glossary.json";

export type SchemeId = "categories" | "areas" | "topics";

export type FacetPaper = {
  key: string;
  title: string;
  authors: string[];
  venue: string;
  year: number | null;
  url: string | null;
  // Carried through so the list view can print a full citation.
  volume: string | null;
  issue: string | null;
  pages: string | null;
  categories: string[];
  areas: string[];
  topic: string | null; // meso, e.g. "6.238 Scientometrics, …"
  macro: string | null;
};

export type Scheme = {
  id: SchemeId;
  /** Clarivate's full official name, e.g. "Web of Science Subject Categories". */
  name: string;
  /** What the page shows. The "Web of Science" prefix is dropped because the
   *  heading above the schemes already says where all of this comes from. */
  shortName: string;
  basis: "venue" | "paper";
  labels: "multi" | "single";
  /** One line a prospective student can act on, not a definition. */
  blurb: string;
  /** How big Clarivate's scheme is. Each scheme states its own size, because
   *  "250 categories instead of 150 areas" means nothing to a reader who was
   *  never told how many areas there are. */
  scale: string;
  href: string;
  values: { name: string; count: number }[];
  /** Papers carrying at least one value; the rest are unclassified in this scheme. */
  covered: number;
};

const G = glossary as unknown as Record<string, { name: string; shortName: string; url: string }>;

export const valuesFor = (paper: FacetPaper, scheme: SchemeId): string[] => {
  if (scheme === "categories") return paper.categories;
  if (scheme === "areas") return paper.areas;
  return paper.topic ? [paper.topic] : [];
};

function toFacetPaper(pub: Publication): FacetPaper {
  const topic = citationTopicOf(pub);
  return {
    key: pub.doi ?? pub.title,
    title: pub.title,
    authors: pub.authors,
    venue: (pub.venue ?? pub.journal ?? "").trim(),
    year: yearOf(pub),
    url: pub.url,
    volume: pub.volume,
    issue: pub.issue,
    pages: pub.pages,
    categories: disciplinesOf(pub),
    areas: researchAreasOf(pub),
    topic: topic?.meso ?? null,
    macro: topic?.macro ?? null,
  };
}

// Commonest first; the stand-in value last, since it reports an absence rather
// than naming a field.
function tally(papers: FacetPaper[], scheme: SchemeId) {
  const counts = new Map<string, number>();
  for (const p of papers) for (const v of valuesFor(p, scheme)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (a, b) =>
        Number(a.name === NOT_INDEXED) - Number(b.name === NOT_INDEXED) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    );
}

export function getFacetData(): { papers: FacetPaper[]; schemes: Scheme[] } {
  const papers = getPublications().map(toFacetPaper);

  const meta: Omit<Scheme, "values" | "covered">[] = [
    {
      id: "areas",
      name: G["research-areas"].name,
      shortName: G["research-areas"].shortName,
      basis: "venue",
      labels: "multi",
      // The bold prefix already says "assigned to the venue"; the blurb should
      // not say it again.
      blurb: "Clarivate's broader scheme",
      scale: "about 150 exist",
      href: G["research-areas"].url,
    },
    {
      id: "categories",
      name: G["wos-subject-categories"].name,
      shortName: G["wos-subject-categories"].shortName,
      basis: "venue",
      labels: "multi",
      blurb: "The finer version of the same scheme",
      scale: "about 250 exist",
      href: G["wos-subject-categories"].url,
    },
    {
      id: "topics",
      name: G["citation-topics"].name,
      shortName: G["citation-topics"].shortName,
      basis: "paper",
      labels: "single",
      blurb: "Built by clustering citations rather than classifying journals",
      scale: "326 exist at this level",
      href: G["citation-topics"].url,
    },
  ];

  return {
    papers,
    schemes: meta.map((m) => ({
      ...m,
      values: tally(papers, m.id),
      covered: papers.filter((p) => valuesFor(p, m.id).length > 0).length,
    })),
  };
}
