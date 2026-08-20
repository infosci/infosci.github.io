// Mirror lab papers into the center site's publications:
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
// The center site migrated from Jekyll/BibTeX to Next.js with a
// data/publications.json file whose shape matches this lab's own
// data/publications.json almost field-for-field (see its lib/publications.ts),
// so a synced entry is mostly a copy of the source paper: drop `selected`
// (no equivalent there), add `abstract` (real abstract text, which this
// lab's own publications.json doesn't carry).
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
const CENTER_PUBLICATIONS = new URL("data/publications.json", CENTER_REPO);

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

function paperAbstract(work) {
  const raw = work.abstract;
  if (!raw) return null;
  // Crossref wraps this in JATS tags (<jats:p>...</jats:p>).
  return clean(raw);
}

async function buildEntry(paper) {
  // Best-effort: some of this lab's own DOIs 404 on Crossref's /works (e.g. a
  // Zenodo dataset DOI that resolves fine but isn't a Crossref record), so a
  // missing abstract is normal, not an error worth surfacing.
  let abstract = null;
  if (paper.doi) {
    try {
      const work = await workByDoi(paper.doi);
      abstract = paperAbstract(work);
    } catch {
      abstract = null;
    }
  }
  const rest = { ...paper };
  delete rest.selected;
  return { ...rest, abstract };
}

async function loadCenterPublications() {
  let list;
  try {
    list = JSON.parse(await readFile(CENTER_PUBLICATIONS, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  const titles = new Set(list.map((p) => normTitle(p.title)));
  return { list, titles };
}

async function syncOne(paper, center) {
  if (center.titles.has(normTitle(paper.title))) return { status: "already-synced" };
  const entry = await buildEntry(paper);
  center.list.push(entry);
  center.titles.add(normTitle(paper.title));
  return { status: "added" };
}

export async function syncCenter(dois) {
  const center = await loadCenterPublications();
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
    await writeFile(CENTER_PUBLICATIONS, `${JSON.stringify(center.list, null, 2)}\n`);
  }

  console.log(`\nscienceofscience.github.io (Science of Science / STS scope):`);
  if (!results.length) {
    console.log("  not in scope — no change.");
  } else {
    for (const r of results) {
      const tag = r.status === "added" ? "added" : "already there";
      console.log(`  ${tag}: ${r.paper.title.slice(0, 70)}`);
    }
    if (added.length) {
      console.log(
        `  ${added.length} new ${added.length === 1 ? "entry" : "entries"} written to` +
          " data/publications.json — review the abstract, then commit and push in that repo.",
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
