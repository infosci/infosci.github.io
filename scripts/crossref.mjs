// Crossref lookup + normalization, shared by add-paper.mjs and migrate-bib.mjs.
//
// Everything the publication list renders comes from here, so this file is the
// single place where Crossref's shape is translated into ours. Crossref is
// authoritative for bibliographic facts (title, authors, venue, date); the
// fields *we* own — selected, pdf, code, note — are never written here and are
// preserved across refetches by mergeRecord() below.

// Crossref asks that automated callers identify themselves; doing so also puts
// us in their faster "polite" pool. https://api.crossref.org/swagger-ui
const MAILTO = "yonseidatalab@gmail.com";
const UA = `datalab-next (https://datalab.yonsei.ac.kr; mailto:${MAILTO})`;

// Crossref returns publisher-supplied JATS/HTML inside titles and journal names
// — real examples from this lab's own papers: "Information Processing &amp;
// Management", titles wrapped in <i> or <scp>. Strip tags, then decode the
// handful of entities that actually show up. Left as text, these render as
// literal "&amp;" on the page.
const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&#38;": "&",
  "&#39;": "'",
};

export function clean(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

async function crossref(path, params) {
  const url = new URL(`https://api.crossref.org${path}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  url.searchParams.set("mailto", MAILTO);

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Crossref ${res.status} for ${url.pathname}`);
  return (await res.json()).message;
}

// Crossref splits authors into given/family and *preserves submission order*,
// which is the whole point — author order is meaning in this field. Some records
// carry consortium entries with only `name`, so fall back to that.
function authorsOf(work) {
  return (work.author ?? []).map((a) =>
    clean(a.name ?? [a.given, a.family].filter(Boolean).join(" ")),
  );
}

// `published` covers print and online; `issued` is the older field some records
// still use. Take whichever exists — date-parts is [[year, month, day]].
function dateOf(work) {
  const parts =
    work.published?.["date-parts"]?.[0] ?? work.issued?.["date-parts"]?.[0] ?? [];
  return { year: parts[0] ?? null, month: parts[1] ?? null };
}

export function normalize(work) {
  const { year, month } = dateOf(work);
  return {
    doi: work.DOI ?? null,
    title: clean(work.title?.[0] ?? ""),
    authors: authorsOf(work),
    journal: clean(work["container-title"]?.[0] ?? ""),
    volume: clean(work.volume ?? "") || null,
    issue: clean(work.issue ?? "") || null,
    pages: clean(work.page ?? "") || null,
    year,
    month,
    type: work.type ?? null,
    url: work.URL ?? (work.DOI ? `https://doi.org/${work.DOI}` : null),
  };
}

// DOIs copied out of publisher links arrive with cruft glued on: Emerald adds
// "/full/html", Frontiers "/full", SAGE "?icid=...", Liebert "?doi=...". None of
// that is part of the DOI, and Crossref 404s on all of it. Produce the plausible
// candidates longest-first — a DOI suffix may legitimately contain slashes, so
// trimming path segments is a guess that has to be verified by actually
// resolving, not assumed.
export function doiCandidates(input) {
  const bare = String(input)
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/[.,;]+$/, "");
  const trimmed = bare.split(/[?#]/)[0];

  const out = [];
  const push = (d) => {
    if (d && /^10\.\d{4,}\/.+/.test(d) && !out.includes(d)) out.push(d);
  };
  push(trimmed);
  const parts = trimmed.split("/");
  // Keep at least "10.prefix/suffix" — never trim below two segments.
  for (let end = parts.length - 1; end >= 2; end--) push(parts.slice(0, end).join("/"));
  return out;
}

// The raw Crossref work, before normalize() collapses given/family into one
// display string. sync-center.mjs needs given/family kept apart to write
// "Family, Given" — the order BibTeX expects and normalize()'s output cannot
// be reversed out of correctly for multi-word names.
export async function workByDoi(doi) {
  const candidates = doiCandidates(doi);
  if (!candidates.length) throw new Error(`"${doi}" is not a DOI`);

  let last;
  for (const candidate of candidates) {
    try {
      return await crossref(`/works/${encodeURIComponent(candidate)}`);
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

export async function byDoi(doi) {
  return normalize(await workByDoi(doi));
}

// Fallback for the papers that predate DOIs in our .bib. Crossref's relevance
// score is unbounded, so it is only meaningful next to the returned title —
// callers must confirm the match rather than trust the number alone.
export async function byTitle(title, journal) {
  const msg = await crossref("/works", {
    "query.bibliographic": [title, journal].filter(Boolean).join(" "),
    // Without this, a title search can land on the JMIR/bioRxiv *preprint*
    // rather than the published article — it happened on this lab's own
    // "Deep Learning in Biomedical Science" paper during migration.
    filter: "type:journal-article",
    rows: "3",
  });
  const items = msg.items ?? [];
  if (!items.length) return null;

  // Prefer an exact title match among the candidates over Crossref's own
  // ranking; the score is not comparable across queries and ranked a completely
  // unrelated paper first for one entry in this bibliography.
  const key = (s) => (s ?? "").toLowerCase().replace(/\W+/g, "");
  const hit = items.find((i) => key(i.title?.[0]) === key(title)) ?? items[0];
  return { ...normalize(hit), matchScore: Math.round(hit.score ?? 0) };
}

// Fields the site owns and Crossref must never clobber. Refetching a paper
// updates its bibliographic facts (a preprint gaining volume/pages, say) while
// leaving every editorial choice made about it intact.
//
// `venue` overrides the container name on display. Crossref gives proceedings
// their full formal title — "Proceedings of the 32nd ACM SIGKDD Conference on
// Knowledge Discovery and Data Mining V.2" — which is correct but unreadable
// next to a journal name. Set it to the conventional short form.
// `displayYear` overrides the year used for grouping and sorting. Springer
// publishes conference proceedings in LNCS the following calendar year, so
// Crossref dates the JIST 2012 paper to 2013 — correct as a publication date,
// wrong as the year a reader is looking for. Set it only when the two genuinely
// differ; the normal case is to leave it null and let Crossref decide.
export const OWNED_FIELDS = ["selected", "pdf", "code", "note", "venue", "displayYear"];

export function mergeRecord(existing, fetched) {
  const merged = { ...fetched };
  for (const field of OWNED_FIELDS) {
    merged[field] = existing?.[field] ?? (field === "selected" ? false : null);
  }
  return merged;
}

// Dice coefficient over character bigrams — enough to tell "…association
// prediction" from "…association predictions" (a typo in our .bib) apart from
// two genuinely different papers, without pulling in a dependency. Crossref's
// own relevance score cannot do this: it ranked a completely unrelated paper
// first for one entry in this bibliography.
export function titleSimilarity(a, b) {
  const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const bigrams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };

  const [x, y] = [norm(a), norm(b)];
  if (!x || !y) return 0;
  if (x === y) return 1;

  const [gx, gy] = [bigrams(x), bigrams(y)];
  let shared = 0;
  for (const [g, n] of gx) shared += Math.min(n, gy.get(g) ?? 0);
  const total = [...gx.values()].reduce((s, n) => s + n, 0) +
    [...gy.values()].reduce((s, n) => s + n, 0);
  return (2 * shared) / total;
}

// Newest first, and stable for papers sharing a month so the file does not
// churn between runs.
//
// By displayYear where a record has one, which is what the comment on
// OWNED_FIELDS above promises and what the site does. Sorting on the raw year
// put the JIST 2012 paper a row away from where every view shows it.
export function sortRecords(records) {
  return [...records].sort(
    (a, b) =>
      ((b.displayYear ?? b.year) ?? 0) - ((a.displayYear ?? a.year) ?? 0) ||
      (b.month ?? 0) - (a.month ?? 0) ||
      (a.title ?? "").localeCompare(b.title ?? ""),
  );
}
