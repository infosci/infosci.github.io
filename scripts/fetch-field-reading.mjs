// Recent work from each field's core journals, fetched at build time.
//
//   node scripts/fetch-field-reading.mjs
//
// Build time, not browser time, on purpose: the site is a static export, so a
// client-side fetch would mean a loading state, a failure state, and a network
// round trip on every visit — for content that changes weekly at most. This
// bakes it in. The deploy workflow runs it before `next build`, and a weekly
// cron rebuild keeps it current without anyone pushing.
//
// Sourced by journal (ISSN), not by topic string. A topic query for "science of
// science" is worse than useless: Crossref matches a Ukrainian journal actually
// named "Science and Science of Science" and returns its whole table of
// contents. The field's flagship journals are a far better filter than its name.
//
// If Crossref is unreachable the script leaves the committed data in place and
// exits cleanly, so a network blip cannot fail a deploy.

import { readFile, writeFile } from "node:fs/promises";

const MAILTO = "yonseidatalab@gmail.com";
const PER_AREA = 3;

const AREAS = [
  {
    id: "science-of-science",
    issns: ["2641-3337", "1751-1577", "1588-2861"], // QSS, J. Informetrics, Scientometrics
  },
  {
    // JMIR Mental Health alone. Adding JAMIA and the Journal of Biomedical
    // Informatics widened the net and then drowned it: both publish far more
    // than the mental health journals do, so a date sort filled this area with
    // general informatics — weight-status prediction, OCR retrieval — with no
    // mental health content at all. One on-topic journal beats three broad ones.
    id: "mental-health-informatics",
    issns: ["2368-7959"], // JMIR Mental Health
  },
  {
    id: "digital-humanities",
    issns: ["2055-7671", "1938-4122"], // DSH, Digital Humanities Quarterly
  },
];

const clean = (s) =>
  (s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function recentFor(area) {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set(
    "filter",
    [...area.issns.map((i) => `issn:${i}`), "type:journal-article"].join(","),
  );
  url.searchParams.set("sort", "published");
  url.searchParams.set("order", "desc");
  // Over-fetch: entries without a title or DOI get dropped below.
  url.searchParams.set("rows", String(PER_AREA * 4));
  url.searchParams.set("select", "title,container-title,published,DOI,author");
  url.searchParams.set("mailto", MAILTO);

  const res = await fetch(url, {
    headers: { "User-Agent": `datalab-next (https://datalab.yonsei.ac.kr; mailto:${MAILTO})` },
  });
  if (!res.ok) throw new Error(`Crossref ${res.status} for ${area.id}`);

  const items = (await res.json()).message.items ?? [];
  return items
    .filter((w) => w.DOI && w.title?.[0])
    .slice(0, PER_AREA)
    .map((w) => {
      const [year, month] = w.published?.["date-parts"]?.[0] ?? [];
      const authors = (w.author ?? []).map((a) =>
        [a.given, a.family].filter(Boolean).join(" "),
      );
      return {
        doi: w.DOI,
        title: clean(w.title[0]),
        journal: clean(w["container-title"]?.[0] ?? ""),
        // First author only — three papers x six names would swamp the section.
        firstAuthor: authors[0] ?? null,
        etAl: authors.length > 1,
        year: year ?? null,
        month: month ?? null,
        url: `https://doi.org/${w.DOI}`,
      };
    });
}

const out = {};
let failures = 0;

for (const area of AREAS) {
  try {
    out[area.id] = await recentFor(area);
    console.log(`${area.id}: ${out[area.id].length}`);
    for (const p of out[area.id]) console.log(`   ${p.journal} — ${p.title.slice(0, 58)}`);
  } catch (err) {
    failures++;
    console.log(`${area.id}: FAILED — ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 200));
}

const target = new URL("../data/field-reading.json", import.meta.url);

if (failures === AREAS.length) {
  console.log("\nAll areas failed; leaving the committed data untouched.");
  process.exit(0);
}

// A partial failure keeps that area's previous entries rather than blanking it.
if (failures > 0) {
  try {
    const previous = JSON.parse(await readFile(target, "utf8"));
    for (const area of AREAS) if (!out[area.id]) out[area.id] = previous[area.id] ?? [];
  } catch {
    for (const area of AREAS) out[area.id] ??= [];
  }
}

await writeFile(target, JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote data/field-reading.json (${failures} area(s) fell back)`);
