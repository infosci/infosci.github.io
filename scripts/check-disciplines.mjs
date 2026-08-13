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

import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = async (f) => JSON.parse(await readFile(new URL(f, root), "utf8"));

const venues = await read("data/wos-categories.json");
const pubs = [...(await read("data/publications.json")), ...(await read("data/manual-publications.json"))];

const NON_WOS = ["Conference proceedings", "Not WoS-indexed"];

const venueOf = (p) => (p.venue || p.journal || "").trim();
const disciplinesOf = (p) => {
  const e = venues[venueOf(p)];
  if (!e) return [];
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
    Number(NON_WOS.includes(a[0])) - Number(NON_WOS.includes(b[0])) ||
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
    const tag = NON_WOS.includes(d) ? " ·" : "  ";
    console.log(`${String(items.length).padStart(3)}${tag} ${d}`);
  }
  const perPaper = pubs.map((p) => disciplinesOf(p).length);
  const avg = (perPaper.reduce((a, b) => a + b, 0) / pubs.length).toFixed(1);
  console.log(`\n${labelled.size}/${pubs.length} papers placed, ${avg} disciplines each on average`);
  console.log("· marks the two values standing in where WoS has no category");
}

if (unmapped.length) {
  console.error(`\n${unmapped.length} paper(s) with no discipline — look the venue up in JCR`);
  console.error("and add it to data/wos-categories.json:");
  for (const v of new Set(unmapped.map(venueOf))) console.error(`  - ${v}`);
  process.exit(1);
}
