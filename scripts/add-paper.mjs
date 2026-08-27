// Add (or refresh) one paper from its DOI:
//
//   npm run add-paper -- 10.1016/j.joi.2025.101766
//   npm run add-paper -- https://doi.org/10.1016/j.joi.2025.101766
//
// Re-running on a DOI already in the file refreshes its bibliographic fields
// and keeps the editorial ones (selected / pdf / code / note) — useful when a
// paper moves from "online first" to an issue and gains volume and pages.

import { readFile, writeFile } from "node:fs/promises";
import { byDoi, mergeRecord, sortRecords } from "./crossref.mjs";
import { syncCenter } from "./sync-center.mjs";
import wosCategories from "../data/wos-categories.json" with { type: "json" };
import wosByPaper from "../data/wos-categories-by-paper.json" with { type: "json" };
import citationTopics from "../data/citation-topics.json" with { type: "json" };

const DATA = new URL("../data/publications.json", import.meta.url);

async function load() {
  try {
    return JSON.parse(await readFile(DATA, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

const input = process.argv[2];
if (!input) {
  console.error("usage: npm run add-paper -- <doi-or-doi-url>");
  process.exit(1);
}

const fetched = await byDoi(input);
if (!fetched.doi) {
  console.error(`No DOI on the Crossref record for "${input}" — refusing to add.`);
  process.exit(1);
}

const records = await load();
const at = records.findIndex((r) => r.doi?.toLowerCase() === fetched.doi.toLowerCase());
const merged = mergeRecord(at === -1 ? null : records[at], fetched);

if (at === -1) records.push(merged);
else records[at] = merged;

await writeFile(DATA, JSON.stringify(sortRecords(records), null, 2) + "\n");

// Print what landed so a wrong DOI is obvious immediately, without opening the
// file. Missing volume/pages is normal for online-first papers, not an error.
const gaps = ["volume", "pages"].filter((f) => !merged[f]);
console.log(`${at === -1 ? "Added" : "Updated"}: ${merged.title}`);
console.log(`  ${merged.authors.join(", ")}`);
console.log(`  ${merged.journal} ${merged.year ?? "?"}  ${merged.doi}`);
if (gaps.length) console.log(`  (no ${gaps.join(", ")} yet — normal before an issue is assigned)`);
console.log(`\n${records.length} publications in data/publications.json`);

// Adding a paper is three jobs, not one: the record, the venue's Web of Science
// classification, and the paper's own Citation Topic. Crossref supplies only the
// first. The rest is printed here rather than remembered, because a paper that
// skips them still appears in the List view and silently goes missing from every
// filter in Explore — the failure is invisible unless you look for it.
const venue = (merged.venue ?? merged.journal ?? "").trim();
const entry = wosCategories[venue];
const doi = merged.doi.toLowerCase();

console.log("\nTO FINISH — Explore needs two more things for this paper.");
console.log("Both are read from Web of Science, not guessed:\n");

if (entry?.perPaper) {
  console.log(`1. SUBJECT CATEGORIES. "${venue}" is a conference or book series, so it is`);
  console.log("   classified per record rather than per venue — ISSI 2017 carries two");
  console.log("   categories while ISSI 2023 is not indexed at all.");
  console.log("   Search the title in Web of Science Core Collection and add");
  console.log(`   "${doi}" to data/wos-categories-by-paper.json.`);
  console.log("   Empty categories if there is no hit, which is normal for a conference");
  console.log("   held in the last year or so.");
} else if (venue && !entry) {
  console.log(`1. SUBJECT CATEGORIES. "${venue}" is a new venue, so nothing classifies it`);
  console.log("   yet and no filter will reach this paper.");
  console.log("   Look it up in Journal Citation Reports and copy its categories in");
  console.log("   verbatim, with the SCIE/SSCI edition. If JCR has no record, check the");
  console.log("   Core Collection anyway — absent from JCR does not mean unclassified,");
  console.log("   since JCR covers journals only. Add it to data/wos-categories.json,");
  console.log('   with an empty categories list and a "fallback" of "Not WoS-indexed"');
  console.log("   only if the Core Collection has no record either.");
} else {
  console.log(`1. SUBJECT CATEGORIES. Already covered — "${venue}" is in`);
  console.log("   data/wos-categories.json and this paper inherits it. Nothing to do.");
}

console.log("\n2. CITATION TOPIC. Open the paper's record in Web of Science and read the");
console.log("   Citation Topics meso value from the Categories/Classification block, then");
console.log(`   add "${doi}" to data/citation-topics.json with its meso and macro.`);
console.log("   A paper published in the last few months usually has none yet — leave it");
console.log("   out rather than inventing one, and the Explore view will say so.");

// The backlog, printed while the reader is already thinking about Web of
// Science. Clarivate assigns a Citation Topic months after publication, so a
// paper added today will not have one — and by the time it does, nobody is
// looking. Adding the next paper is the moment someone is.
//
// Only papers the Core Collection actually holds. A conference paper it has no
// record of will never be clustered, and listing it every time would train the
// reader to skip the whole block.
const NOT_INDEXED = "Not WoS-indexed";
const venueOfRecord = (p) => (p.venue ?? p.journal ?? "").trim();
const keyOfRecord = (p) => (p.doi ? p.doi.toLowerCase() : p.title);

function inCoreCollection(p) {
  const entry = wosCategories[venueOfRecord(p)];
  if (!entry) return false;
  if (entry.perPaper) {
    const record = wosByPaper[keyOfRecord(p)];
    return Boolean(record && record.categories.length);
  }
  if (entry.categories.length) return true;
  return entry.fallback !== NOT_INDEXED && Boolean(entry.fallback);
}

const awaiting = records.filter(
  (p) =>
    keyOfRecord(p) !== keyOfRecord(merged) &&
    !citationTopics[keyOfRecord(p)] &&
    inCoreCollection(p),
);

if (awaiting.length) {
  console.log(
    `\n   While you are in there: ${awaiting.length} other ${awaiting.length === 1 ? "paper is" : "papers are"} indexed but still`,
  );
  console.log("   without a topic. Worth a look on the same visit —");
  for (const p of awaiting.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))) {
    console.log(`     ${p.year ?? "????"}  ${p.title.slice(0, 58)}`);
    console.log(`             ${p.doi ?? "(no doi)"}`);
  }
  console.log("   Anything not listed has no Core Collection record and never will.");
}

console.log("\n3. HOMEPAGE CARDS. Nothing to edit — the cards find papers by searching");
console.log("   the list, so this paper is already on whichever cards reach it. Run");
console.log("   npm run cards to see which, and read the line, not the number.");
console.log("   Landing on none is fine for a method paper with no domain. Landing on");
console.log("   three means a card's search has gone loose and the build will say so.");
console.log("   If it belongs somewhere nothing reaches, widen that card's query in");
console.log("   app/page.tsx with a word naming what the paper is ABOUT — never the");
console.log("   platform it used or the technique it applied, since those are shared");
console.log("   and will drag other papers along.");

console.log("\nThen: node scripts/check-disciplines.mjs   (must exit 0)");
console.log("      npm run cards");
console.log("      npm run build");

// scienceofscience.github.io is a spin-off covering science of science and
// STS. A paper mirrors there exactly when it lands on this site's own
// "Science of Science" or "Science and Technology Studies" card, so this
// check runs on every add rather than waiting to be asked.
await syncCenter([merged.doi]);
