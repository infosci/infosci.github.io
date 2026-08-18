// How much the lab published in each area, year by year.
//
// Counted at build from the same searches the home page cards link to, so the
// grid and the cards can never disagree: a paper appears in a row here exactly
// when it appears on that card.
//
// Two things this cannot do, and says so on the page rather than quietly:
//
// Rows do not sum to the totals. Six papers answer two areas — a scientometric
// review of a biomedical literature is both — so they are counted in both rows
// and once in the total.
//
// The current year is partial. It is the only column that will still change,
// and without saying so the newest column reads as a fall or a peak that has
// not happened yet.

import { AREAS } from "@/lib/areas";
import publications from "@/data/publications.json";
import manual from "@/data/manual-publications.json";

export type TimelineRow = {
  id: string;
  title: string;
  q: string;
  counts: number[];
  total: number;
  first: number;
  last: number;
};

export type Timeline = {
  years: number[];
  rows: TimelineRow[];
  totals: number[];
  papers: number;
  busiest: number;
};

type Record = {
  title: string;
  authors?: string[];
  venue?: string | null;
  journal?: string | null;
  year?: number | null;
};

/** The same matching the search box does — words inside a group must all
 *  appear, groups separated by "or" are alternatives — over the same text. */
function reaches(q: string, paper: Record) {
  const hay = [
    paper.title,
    (paper.authors ?? []).join(" "),
    paper.venue ?? paper.journal ?? "",
    paper.year ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return q
    .toLowerCase()
    .split(/\s+or\s+/)
    .some((group) => group.split(/\s+/).every((word) => hay.includes(word)));
}

export function getTimeline(): Timeline {
  const papers = [...(publications as Record[]), ...(manual as Record[])].filter(
    (p) => p.year,
  );

  const years: number[] = [];
  const min = Math.min(...papers.map((p) => p.year!));
  const max = Math.max(...papers.map((p) => p.year!));
  // Every year in the span, including the empty ones. A year with nothing in it
  // is part of the shape — leaving it out would close the gaps that are the
  // most honest thing here.
  for (let y = min; y <= max; y++) years.push(y);

  const rows = AREAS.map((area) => {
    const mine = papers.filter((p) => reaches(area.q, p));
    const counts = years.map((y) => mine.filter((p) => p.year === y).length);
    return {
      id: area.id,
      title: area.title,
      q: area.q,
      counts,
      total: mine.length,
      first: Math.min(...mine.map((p) => p.year!)),
      last: Math.max(...mine.map((p) => p.year!)),
    };
  }).sort((a, b) => b.total - a.total);

  const totals = years.map((y) => papers.filter((p) => p.year === y).length);

  return {
    years,
    rows,
    totals,
    papers: papers.length,
    busiest: Math.max(...totals),
  };
}
