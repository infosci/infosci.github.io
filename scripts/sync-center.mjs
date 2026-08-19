// Mirror lab papers into the center site's bibliography:
//
//   node scripts/sync-center.mjs             every matching paper, once
//   node scripts/sync-center.mjs <doi>       just this one, called from add-paper.mjs
//
// scienceofscience.github.io is a spin-off of this lab covering science of
// science and science & technology studies. A paper belongs there exactly
// when it belongs on one of *this* site's own "Science of Science" or
// "Science and Technology Studies" cards — same rule, so there is nothing new
// to invent here. See lib/areas.ts for why those two queries are what they
// are.
//
// Both repos are expected to be cloned as siblings (CENTER_REPO overrides).
// Not finding the sibling is reported, not treated as fatal — add-paper.mjs
// must keep working for anyone without that second clone.

import { readFile, writeFile } from "node:fs/promises";
import { clean, workByDoi } from "./crossref.mjs";

const root = new URL("..", import.meta.url);
const read = async (f) => JSON.parse(await readFile(new URL(f, root), "utf8"));

const CENTER_REPO = new URL(
  `${process.env.CENTER_REPO ?? "../scienceofscience.github.io"}/`,
  root,
);
const CENTER_BIB = new URL("_bibliography/papers.bib", CENTER_REPO);

// Parsed by shape rather than imported, exactly as check-cards.mjs does —
// this is a plain node script and lib/areas.ts is TypeScript.
async function targetAreas() {
  const source = await readFile(new URL("lib/areas.ts", root), "utf8");
  const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  const qs = [...source.matchAll(/q: "([^"]+)"/g)].map((m) => m[1]);
  const areas = ids.map((id, i) => ({ id, q: qs[i] }));
  const wanted = ["science-of-science", "science-and-technology-studies"];
  const found = areas.filter((a) => wanted.includes(a.id));
  if (found.length !== wanted.length) {
    throw new Error(
      `Expected areas ${wanted.join(", ")} in lib/areas.ts, found ${found.map((a) => a.id).join(", ")}`,
    );
  }
  return found;
}

// The same matching the home page cards and the search box do.
const haystack = (p) =>
  [p.title, (p.authors ?? []).join(" "), p.venue ?? p.journal ?? "", p.displayYear ?? p.year ?? ""]
    .join(" ")
    .toLowerCase();

const matches = (q, hay) =>
  q
    .toLowerCase()
    .split(/\s+or\s+/)
    .some((group) => group.split(/\s+/).every((word) => hay.includes(word)));

function inScope(paper, areas) {
  const hay = haystack(paper);
  return areas.some((a) => matches(a.q, hay));
}

const normTitle = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const MONTHS = [
  null, "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// BibTeX wants "Family, Given"; Crossref keeps them separate, which is why
// this reads the raw work rather than the already-joined `authors` array in
// publications.json — "Given Family" cannot be split back into the two
// without guessing wrong on multi-word names.
function bibAuthors(work) {
  return (work.author ?? [])
    .map((a) => {
      if (a.family) return clean([a.family, a.given].filter(Boolean).join(", "));
      return clean(a.name ?? "");
    })
    .filter(Boolean)
    .join(" and ");
}

// Manual entries (no DOI, so no Crossref record) get the best split a plain
// "Given Family" string allows: last word is the family name. Wrong for
// multi-word family names, which is why every DOI'd paper avoids this path.
function guessAuthors(names) {
  return names
    .map((n) => {
      const parts = n.trim().split(/\s+/);
      const family = parts.pop();
      return parts.length ? `${family}, ${parts.join(" ")}` : family;
    })
    .join(" and ");
}

function bibAbstract(work) {
  const raw = work.abstract;
  if (!raw) return null;
  // Crossref wraps this in JATS tags (<jats:p>...</jats:p>).
  return clean(raw);
}

function bibKey(year, month, taken) {
  const base = year ? (month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`) : "undated";
  if (!taken.has(base)) return base;
  for (const suffix of "bcdefgh") {
    const key = `${base}${suffix}`;
    if (!taken.has(key)) return key;
  }
  throw new Error(`Ran out of key suffixes for ${base}`);
}

function bibEntry(key, fields) {
  const lines = Object.entries(fields)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `  ${k}={${v}}`);
  return `@article{${key},\n${lines.join(",\n")}\n}`;
}

async function buildEntry(paper, taken) {
  const year = paper.displayYear ?? paper.year ?? null;
  const month = paper.month ?? null;

  // Falls back to the best-effort split below when Crossref has no record for
  // the DOI at all — real for this lab's own DOIs, e.g. a Zenodo dataset DOI
  // that 404s on /works even though the DOI itself resolves fine.
  let author, abstract;
  try {
    if (!paper.doi) throw new Error("no DOI");
    const work = await workByDoi(paper.doi);
    author = bibAuthors(work);
    abstract = bibAbstract(work);
  } catch {
    author = guessAuthors(paper.authors ?? []);
    abstract = null;
  }

  const key = bibKey(year, month, taken);
  taken.add(key);

  const url = paper.doi ? `https://doi.org/${paper.doi}` : paper.url;

  return {
    key,
    text: bibEntry(key, {
      title: clean(paper.title),
      author,
      abstract,
      journal: clean(paper.venue ?? paper.journal ?? ""),
      volume: paper.volume ?? null,
      issue: paper.issue ?? null,
      pages: paper.pages ?? null,
      year,
      month: MONTHS[month] ?? null,
      url,
      html: url,
    }),
  };
}

async function loadCenterBib() {
  let text;
  try {
    text = await readFile(CENTER_BIB, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  const entries = [...text.matchAll(/@\w+\{([^,]+),(.*?)\n\}/gs)];
  const titles = new Set();
  const keys = new Set();
  for (const [, key, body] of entries) {
    keys.add(key);
    const m = body.match(/title\s*=\s*\{+([^{}]+)\}+/);
    if (m) titles.add(normTitle(m[1]));
  }
  return { text, titles, keys };
}

async function syncOne(paper, center) {
  if (center.titles.has(normTitle(paper.title))) return { status: "already-synced" };
  const { key, text } = await buildEntry(paper, center.keys);
  center.text = `${center.text.trimEnd()}\n\n${text}\n`;
  center.titles.add(normTitle(paper.title));
  return { status: "added", key };
}

export async function syncCenter(dois) {
  const center = await loadCenterBib();
  if (!center) {
    console.log(
      `\nNo sibling clone of the center site at ${CENTER_REPO.pathname} — skipped the` +
        " scienceofscience.github.io sync. Set CENTER_REPO to point at it if it lives elsewhere.",
    );
    return;
  }

  const pubs = [...(await read("data/publications.json")), ...(await read("data/manual-publications.json"))];
  const candidates = dois?.length
    ? pubs.filter((p) => p.doi && dois.map((d) => d.toLowerCase()).includes(p.doi.toLowerCase()))
    : pubs;
  const areas = await targetAreas();

  const results = [];
  for (const paper of candidates) {
    if (!inScope(paper, areas)) continue;
    results.push({ paper, ...(await syncOne(paper, center)) });
  }

  const added = results.filter((r) => r.status === "added");
  if (added.length) {
    await writeFile(CENTER_BIB, center.text);
  }

  console.log(`\nscienceofscience.github.io (Science of Science / STS scope):`);
  if (!results.length) {
    console.log("  not in scope — no change.");
  } else {
    for (const r of results) {
      const tag = r.status === "added" ? `added as ${r.key}` : "already there";
      console.log(`  ${tag}: ${r.paper.title.slice(0, 70)}`);
    }
    if (added.length) {
      console.log(
        `  ${added.length} new ${added.length === 1 ? "entry" : "entries"} written to` +
          " _bibliography/papers.bib — review the abstract/author formatting, then commit" +
          " and push in that repo.",
      );
    }
  }
  return results;
}

// Run standalone: `node scripts/sync-center.mjs [doi ...]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const dois = process.argv.slice(2);
  await syncCenter(dois.length ? dois : undefined);
}
