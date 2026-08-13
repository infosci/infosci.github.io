// The publication list, assembled from two sources.
//
//   data/publications.json         — Crossref-derived, written by scripts/.
//                                    Never hand-edit: add-paper.mjs rewrites it.
//   data/manual-publications.json  — papers with no DOI, hand-maintained.
//
// The second file exists because not every published paper has a DOI. Of this
// lab's 58 papers exactly one does: "An investigation of the intellectual
// structure of opinion mining research" (Information Research, 2017), a real
// published article from before that journal registered with Crossref. Anything
// published today will have a DOI, so this file should stay tiny.

import crossrefPublications from "@/data/publications.json";
import manualPublications from "@/data/manual-publications.json";

export type Publication = {
  doi: string | null;
  title: string;
  authors: string[];
  journal: string;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  year: number | null;
  month: number | null;
  type: string | null;
  url: string | null;
  // Ours, not Crossref's — see OWNED_FIELDS in scripts/crossref.mjs.
  selected: boolean;
  pdf: string | null;
  code: string | null;
  note: string | null;
};

function sortByDate(a: Publication, b: Publication) {
  return (
    (b.year ?? 0) - (a.year ?? 0) ||
    (b.month ?? 0) - (a.month ?? 0) ||
    a.title.localeCompare(b.title)
  );
}

export function getPublications(): Publication[] {
  const all = [
    ...(crossrefPublications as Publication[]),
    ...(manualPublications as Publication[]),
  ];
  return all.sort(sortByDate);
}

// Grouped newest-year-first for the publications page.
export function getPublicationsByYear(): { year: number | null; items: Publication[] }[] {
  const groups = new Map<number | null, Publication[]>();
  for (const pub of getPublications()) {
    const bucket = groups.get(pub.year) ?? [];
    bucket.push(pub);
    groups.set(pub.year, bucket);
  }
  return [...groups.entries()]
    .map(([year, items]) => ({ year, items }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}
