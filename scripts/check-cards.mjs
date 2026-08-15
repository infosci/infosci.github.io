// Which homepage cards reach each paper, and where the queries have drifted.
//
//   npm run cards            counts, overlaps, and anything unreached
//   npm run cards -- --list  every paper under every card
//
// The homepage cards each link to a search of the publications list, and those
// searches are the only thing that decides which papers a card presents. They
// are tuned by hand, which means they can rot: a new paper can land on no card,
// or a term added for one paper can quietly drag a dozen onto a second card.
// Neither shows up on the site — a card with the wrong contents looks exactly
// like a card with the right ones.
//
// The rule the queries follow, and the one to keep following: name the field's
// OBJECT of study. Never the data source — Twitter, Reddit and "social media"
// are where several of these fields look, so they collide by construction.
// Never the method — graph, network, learning and classification are what the
// whole lab does. Loosen a term only to reach a paper nothing else reaches, use
// the shortest stem that does it, then check what else that stem catches: the
// match is a substring, and "search" inside "research" once put ten
// scientometrics papers on the retrieval card.
//
// Exits non-zero when a paper lands on three or more cards, which has never
// been legitimate and always meant a query went loose. Papers on no card are
// reported but allowed: two of them are method contributions with no domain,
// and under a rule where every card names a field, that is correct.

import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = async (f) => JSON.parse(await readFile(new URL(f, root), "utf8"));

const pubs = [
  ...(await read("data/publications.json")),
  ...(await read("data/manual-publications.json")),
];

// Parsed out of the page rather than duplicated into a data file: the cards are
// components — a mark, a title, a citation — and splitting the query away from
// them would leave two places to edit and one to forget.
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const titles = [...page.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
const queries = [...page.matchAll(/q: "([^"]+)"/g)].map((m) => m[1]);

if (!titles.length || titles.length !== queries.length) {
  console.error(
    `Could not read the cards from app/page.tsx — found ${titles.length} titles and ` +
      `${queries.length} queries. This script parses them by shape; if the file was ` +
      "restructured, fix the patterns here.",
  );
  process.exit(1);
}

const cards = titles.map((title, i) => ({ title, q: queries[i] }));

// The same matching the search box does: words inside a group must all appear,
// groups separated by "or" are alternatives.
const haystack = (p) =>
  [p.title, (p.authors ?? []).join(" "), p.venue ?? "", p.year ?? ""]
    .join(" ")
    .toLowerCase();

const matches = (q, hay) =>
  q
    .toLowerCase()
    .split(/\s+or\s+/)
    .some((group) => group.split(/\s+/).every((w) => hay.includes(w)));

const hits = new Map(cards.map((c) => [c.title, []]));
const homes = new Map();

for (const p of pubs) {
  const hay = haystack(p);
  const on = cards.filter((c) => matches(c.q, hay));
  for (const c of on) hits.get(c.title).push(p);
  homes.set(p, on.map((c) => c.title));
}

const list = process.argv.includes("--list");
const covered = pubs.filter((p) => homes.get(p).length > 0);
const shared = pubs.filter((p) => homes.get(p).length === 2);
const crowded = pubs.filter((p) => homes.get(p).length > 2);
const orphans = pubs.filter((p) => homes.get(p).length === 0);
const mean = pubs.reduce((n, p) => n + homes.get(p).length, 0) / pubs.length;

console.log(
  `${covered.length}/${pubs.length} papers on a card · ${shared.length} on two · ` +
    `${mean.toFixed(2)} cards per paper\n`,
);

for (const { title } of cards) {
  console.log(`${String(hits.get(title).length).padStart(3)}  ${title}`);
  if (list) {
    for (const p of hits.get(title).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))) {
      console.log(`       ${p.year ?? "????"}  ${p.title.slice(0, 66)}`);
    }
  }
}

if (shared.length) {
  console.log("\nOn two cards — worth reading, each should be genuinely both:");
  for (const p of shared) {
    console.log(`   ${p.title.slice(0, 56)}`);
    console.log(`       ${homes.get(p).join("  +  ")}`);
  }
}

if (orphans.length) {
  console.log("\nOn no card — fine if it is a method paper with no domain:");
  for (const p of orphans) console.log(`   ${p.year ?? "????"}  ${p.title.slice(0, 66)}`);
}

if (crowded.length) {
  console.error("\nOn three or more cards — a query has gone loose:");
  for (const p of crowded) {
    console.error(`   ${p.title.slice(0, 56)}`);
    console.error(`       ${homes.get(p).join("  +  ")}`);
  }
  console.error(
    "\nFind the term that reaches this paper from each card and narrow the one\n" +
      "that names a source or a method rather than an object of study.",
  );
  process.exit(1);
}
