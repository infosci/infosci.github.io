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
import wosCategories from "../data/wos-categories.json" with { type: "json" };

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

console.log("\nThen: node scripts/check-disciplines.mjs   (must exit 0)");
console.log("      npm run build");
