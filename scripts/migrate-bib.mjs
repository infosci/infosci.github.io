// One-time migration: papers.bib -> data/publications.json
//
//   node scripts/migrate-bib.mjs ../infosci.github.io/_bibliography/papers.bib
//
// Entries carrying a DOI are fetched directly and are trustworthy. Entries
// without one are resolved by title search, which can silently return the wrong
// paper — every one of those is written to data/migration-review.json with both
// the .bib title and the matched title so they can be checked side by side.
// Nothing here is meant to run twice; add-paper.mjs is the ongoing tool.

import { readFile, writeFile } from "node:fs/promises";
import { byDoi, byTitle, mergeRecord, sortRecords, titleSimilarity } from "./crossref.mjs";

// Below this, a title search result is treated as a different paper and the
// entry is reported as unresolved rather than written. Calibrated on this
// bibliography: a plural-vs-singular typo scores ~0.99, while the worst false
// match Crossref returned here (an electronic-commerce paper standing in for an
// opinion-mining one) scores ~0.35. Writing a wrong paper is far worse than
// asking for a minute of human attention.
const MIN_TITLE_SIMILARITY = 0.85;

const bibPath = process.argv[2];
if (!bibPath) {
  console.error("usage: node scripts/migrate-bib.mjs <path-to-papers.bib>");
  process.exit(1);
}

// Pull `field={...}` honouring nested braces — titles in this file contain them
// (e.g. {DNA} protected against lowercasing), so a lazy .*? regex truncates.
function field(entry, name) {
  const at = entry.search(new RegExp(`\\b${name}\\s*=\\s*\\{`, "i"));
  if (at === -1) return null;
  const start = entry.indexOf("{", at);
  let depth = 0;
  for (let i = start; i < entry.length; i++) {
    if (entry[i] === "{") depth++;
    else if (entry[i] === "}" && --depth === 0) {
      return entry
        .slice(start + 1, i)
        .replace(/[{}]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  return null;
}

const raw = await readFile(bibPath, "utf8");
const entries = raw.split(/\n@\w+\s*\{/).slice(1);
console.log(`Parsed ${entries.length} entries from ${bibPath}\n`);

const records = [];
const review = [];
const failures = [];
const unresolved = [];

for (const [i, entry] of entries.entries()) {
  const title = field(entry, "title");
  const journal = field(entry, "journal");
  const doi = entry.match(/10\.\d{4,}\/[^\s},]+/)?.[0]?.replace(/[.,]$/, "");
  const label = `[${i + 1}/${entries.length}] ${(title ?? "?").slice(0, 58)}`;

  try {
    if (doi) {
      const rec = await byDoi(doi);
      records.push(mergeRecord(null, rec));
      console.log(`  ok   ${label}`);
    } else {
      const hit = await byTitle(title, journal);
      if (!hit?.doi) throw new Error("no Crossref match");
      const { matchScore, ...rec } = hit;
      const similarity = titleSimilarity(title, rec.title);

      if (similarity < MIN_TITLE_SIMILARITY) {
        unresolved.push({
          similarity: Number(similarity.toFixed(2)),
          bibTitle: title,
          rejectedTitle: rec.title,
          rejectedDoi: rec.doi,
          // Carried straight from the .bib so the entry can be added by hand
          // without going back to the old repo.
          fromBib: {
            title,
            authors: (field(entry, "author") ?? "")
              .split(/\s+and\s+/)
              .map((a) => a.split(",").reverse().join(" ").replace(/\s+/g, " ").trim())
              .filter(Boolean),
            journal,
            volume: field(entry, "volume"),
            pages: field(entry, "pages"),
            year: Number(field(entry, "year")) || null,
          },
        });
        console.log(`  SKIP ${label}  — best match too different (${similarity.toFixed(2)})`);
        continue;
      }

      records.push(mergeRecord(null, rec));
      review.push({
        matchScore,
        similarity: Number(similarity.toFixed(2)),
        bibTitle: title,
        matchedTitle: rec.title,
        bibJournal: journal,
        matchedJournal: rec.journal,
        doi: rec.doi,
        exactTitle: similarity === 1,
      });
      console.log(`  ~    ${label}  (title match, sim ${similarity.toFixed(2)})`);
    }
  } catch (err) {
    failures.push({ title, journal, doi: doi ?? null, error: String(err.message ?? err) });
    console.log(`  FAIL ${label}  — ${err.message ?? err}`);
  }

  // Stay well inside Crossref's polite-pool limits.
  await new Promise((r) => setTimeout(r, 120));
}

// A DOI appearing twice in the .bib (this file has at least one) collapses here.
const byDoiKey = new Map();
for (const r of records) byDoiKey.set(r.doi?.toLowerCase() ?? Math.random(), r);
const deduped = sortRecords([...byDoiKey.values()]);

await writeFile(
  new URL("../data/publications.json", import.meta.url),
  JSON.stringify(deduped, null, 2) + "\n",
);
await writeFile(
  new URL("../data/migration-review.json", import.meta.url),
  JSON.stringify({ review, unresolved, failures }, null, 2) + "\n",
);

const exact = review.filter((r) => r.exactTitle).length;
console.log(`\n${deduped.length} publications written (${records.length - deduped.length} duplicate DOIs collapsed)`);
console.log(`${review.length} resolved by title — ${exact} exact, ${review.length - exact} need eyes`);
console.log(`${unresolved.length} skipped as unreliable matches (see data/migration-review.json)`);
console.log(`${failures.length} failed`);
