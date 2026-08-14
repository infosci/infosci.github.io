// Verify every publication resolves to a discipline, and print the per-paper
// assignment for review.
//
//   node scripts/check-disciplines.mjs           facet counts + any gaps
//   node scripts/check-disciplines.mjs --list    every paper under each value
//   node scripts/check-disciplines.mjs --tsv     tab-separated, for a spreadsheet
//
// Exits non-zero when a venue is missing from data/wos-categories.json, so
// adding a paper in an unfamiliar journal surfaces as a failure rather than as
// a paper no filter can reach.
//
// Counts sum to more than 72: the source is multi-label, so a JAMIA paper is
// counted under all five of its categories.
//
// Two sources: journals are classified per venue, conferences per record. A
// conference paper missing from the per-record file is a failure, not a
// fallback — otherwise a newly indexed paper would sit in "Not WoS-indexed"
// forever without anyone noticing.

import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = async (f) => JSON.parse(await readFile(new URL(f, root), "utf8"));

const venues = await read("data/wos-categories.json");
const byPaper = await read("data/wos-categories-by-paper.json");
const topics = await read("data/citation-topics.json");
const pubs = [...(await read("data/publications.json")), ...(await read("data/manual-publications.json"))];

const NOT_INDEXED = "Not WoS-indexed";

const venueOf = (p) => (p.venue || p.journal || "").trim();
const paperKey = (p) => (p.doi ? p.doi.toLowerCase() : p.title);
const disciplinesOf = (p) => {
  const e = venues[venueOf(p)];
  if (!e) return [];
  if (e.perPaper) {
    const r = byPaper[paperKey(p)];
    if (!r) return [];
    return r.categories.length ? r.categories : [NOT_INDEXED];
  }
  if (e.categories.length) return e.categories;
  return e.fallback ? [e.fallback] : [];
};

const mode = process.argv[2];
const unmapped = pubs.filter((p) => !disciplinesOf(p).length);

const byValue = new Map();
for (const p of pubs) {
  for (const d of disciplinesOf(p)) {
    if (!byValue.has(d)) byValue.set(d, []);
    byValue.get(d).push(p);
  }
}
const ordered = [...byValue.entries()].sort(
  (a, b) =>
    Number(a[0] === NOT_INDEXED) - Number(b[0] === NOT_INDEXED) ||
    b[1].length - a[1].length ||
    a[0].localeCompare(b[0]),
);

const byYear = (a, b) => (b.displayYear ?? b.year ?? 0) - (a.displayYear ?? a.year ?? 0);

if (mode === "--tsv") {
  console.log(["discipline", "year", "venue", "title", "doi"].join("\t"));
  for (const [d, items] of ordered) {
    for (const p of [...items].sort(byYear)) {
      console.log([d, p.year ?? "", venueOf(p), p.title, p.doi ?? ""].join("\t"));
    }
  }
} else if (mode === "--list") {
  for (const [d, items] of ordered) {
    console.log(`\n${d}  (${items.length})\n${"-".repeat(64)}`);
    for (const p of [...items].sort(byYear)) {
      console.log(`${p.year ?? "????"}  ${venueOf(p).slice(0, 34).padEnd(34)}  ${p.title.slice(0, 62)}`);
    }
  }
} else {
  const labelled = new Set();
  for (const items of byValue.values()) for (const p of items) labelled.add(p);
  console.log(
    `${pubs.length} papers, ${Object.keys(venues).filter((k) => !k.startsWith("_")).length} venues, ` +
      `${byValue.size} facet values\n`,
  );
  for (const [d, items] of ordered) {
    const tag = d === NOT_INDEXED ? " ·" : "  ";
    console.log(`${String(items.length).padStart(3)}${tag} ${d}`);
  }
  const perPaper = pubs.map((p) => disciplinesOf(p).length);
  const avg = (perPaper.reduce((a, b) => a + b, 0) / pubs.length).toFixed(1);
  console.log(`\n${labelled.size}/${pubs.length} papers placed, ${avg} disciplines each on average`);
  console.log("· marks the value standing in where the Core Collection has no record");

  // Citation Topics: the other scheme. Paper-based and single-label, so these
  // counts sum to the number of papers rather than exceeding it.
  const topical = pubs.filter((p) => topics[paperKey(p)]);
  const meso = {};
  const macro = {};
  for (const p of topical) {
    const t = topics[paperKey(p)];
    meso[t.meso] = (meso[t.meso] ?? 0) + 1;
    macro[t.macro] = (macro[t.macro] ?? 0) + 1;
  }
  console.log(`\nCITATION TOPICS — ${topical.length}/${pubs.length} papers, one topic each`);
  for (const [k, v] of Object.entries(macro).sort((a, b) => b[1] - a[1])) {
    console.log(`${String(v).padStart(3)}  ${k}`);
  }
  console.log(`     ${Object.keys(meso).length} meso topics beneath those`);
}

if (unmapped.length) {
  console.error(`\n${unmapped.length} paper(s) with no discipline:`);
  for (const p of unmapped) {
    const e = venues[venueOf(p)];
    if (e && e.perPaper) {
      console.error(`  - ${p.title}`);
      console.error(`      ${venueOf(p)} is classified per record. Search the title in`);
      console.error(`      Web of Science and add "${paperKey(p)}" to`);
      console.error("      data/wos-categories-by-paper.json (empty categories if no hit).");
    } else {
      console.error(`  - ${venueOf(p)}`);
      console.error("      Unknown venue. Look it up and add it to data/wos-categories.json.");
    }
  }
  process.exit(1);
}
