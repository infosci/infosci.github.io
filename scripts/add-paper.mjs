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
import venueGroups from "../data/venue-groups.json" with { type: "json" };

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

// A venue is classified once and then covers every future paper in it. Roughly
// four new venues appear a year, so this fires rarely — but silently skipping
// it would drop the paper out of any view faceted by discipline.
const venue = (merged.venue ?? merged.journal ?? "").trim();
if (venue && !(venue in venueGroups)) {
  console.log(`\nNEW VENUE: "${venue}"`);
  console.log("   Not in data/venue-groups.json, so this paper has no discipline yet.");
  console.log("   Look the journal up in JCR and add one line to that file.");
}
