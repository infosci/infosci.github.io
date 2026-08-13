// Verify every publication resolves to a research group, and print the
// per-paper assignment for review.
//
//   node scripts/check-groups.mjs           summary + any unmapped venues
//   node scripts/check-groups.mjs --list    every paper, grouped
//   node scripts/check-groups.mjs --tsv     tab-separated, for a spreadsheet
//
// Exits non-zero when a venue has no group, so adding a paper in an unfamiliar
// journal surfaces as a failure rather than as a silently missing dot on a map.

import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = async (f) => JSON.parse(await readFile(new URL(f, root), "utf8"));

const groups = await read("data/venue-groups.json");
const pubs = [...(await read("data/publications.json")), ...(await read("data/manual-publications.json"))];

const venueOf = (p) => (p.venue || p.journal || "").trim();
const groupOf = (p) => groups[venueOf(p)];

const mode = process.argv[2];
const unmapped = pubs.filter((p) => !groupOf(p));

const byGroup = new Map();
for (const p of pubs) {
  const g = groupOf(p);
  if (!g) continue;
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push(p);
}
const ordered = [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length);

if (mode === "--tsv") {
  console.log(["group", "year", "venue", "title", "doi"].join("\t"));
  for (const [g, items] of ordered) {
    for (const p of [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))) {
      console.log([g, p.year ?? "", venueOf(p), p.title, p.doi ?? ""].join("\t"));
    }
  }
} else if (mode === "--list") {
  for (const [g, items] of ordered) {
    console.log(`\n${g}  (${items.length})\n${"-".repeat(64)}`);
    for (const p of [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))) {
      console.log(`${p.year ?? "????"}  ${venueOf(p).slice(0, 34).padEnd(34)}  ${p.title.slice(0, 62)}`);
    }
  }
} else {
  console.log(`${pubs.length} papers, ${Object.keys(groups).filter((k) => !k.startsWith("_")).length} venues mapped\n`);
  for (const [g, items] of ordered) {
    const pct = Math.round((items.length / pubs.length) * 100);
    console.log(`${String(items.length).padStart(2)}  ${g.padEnd(22)} ${pct}%`);
  }
}

if (unmapped.length) {
  console.error(`\n${unmapped.length} paper(s) with no group — add the venue to data/venue-groups.json:`);
  for (const v of new Set(unmapped.map(venueOf))) console.error(`  - ${v}`);
  process.exit(1);
}
