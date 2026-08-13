// One-time migration of people and projects out of the al-folio site.
//
//   node scripts/migrate-content.mjs ../infosci.github.io
//
// Members live one-per-file in _projects/ (al-folio reused its "projects"
// collection for people — hence the confusing directory name). Funded projects
// live in _pages/about_project_N.md as plain "Key: value" text. Both are small
// and regular enough to parse directly; after this runs the JSON is the source
// of truth and the old repo is no longer consulted.

import { readFile, writeFile, readdir, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/migrate-content.mjs <path-to-al-folio-repo>");
  process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

// ── people ──────────────────────────────────────────────────────────────────
const memberDir = join(src, "_projects");
const members = [];
const photoOut = join(root, "public/people");
await mkdir(photoOut, { recursive: true });

// Categories the lab does not publish. The old site achieved the same thing by
// omitting them from display_categories, so these people were never on the
// public page; dropping them here keeps a re-run from quietly adding them.
const HIDDEN_ROLES = new Set(["research interns"]);

for (const file of (await readdir(memberDir)).filter((f) => f.endsWith(".md"))) {
  const fm = frontmatter(await readFile(join(memberDir, file), "utf8"));
  if (!fm.title) continue;
  if (fm.category && HIDDEN_ROLES.has(fm.category)) continue;

  // Photos are referenced as "assets/img/people/x.png"; copy each into
  // public/people/ so the new site carries no dependency on the old repo.
  let photo = null;
  if (fm.img) {
    const from = join(src, fm.img);
    if (existsSync(from)) {
      await copyFile(from, join(photoOut, basename(fm.img)));
      photo = `/people/${basename(fm.img)}`;
    }
  }

  members.push({
    slug: file.replace(/\.md$/, ""),
    name: fm.title,
    role: fm.category ?? null,
    photo,
    link: fm.redirect || null,
    // al-folio sorted by this within a category; keep it so the ordering the
    // lab already chose survives the move.
    order: Number(fm.importance) || 999,
  });
}

members.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
await writeFile(join(root, "data/members.json"), JSON.stringify(members, null, 2) + "\n");

// ── funded projects ─────────────────────────────────────────────────────────
const projects = [];
for (const file of (await readdir(join(src, "_pages")))
  .filter((f) => /^about_project_\d+\.md$/.test(f))
  .sort()) {
  const text = await readFile(join(src, "_pages", file), "utf8");
  const grab = (key) =>
    text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? null;

  const title = grab("Title");
  if (!title) continue;
  projects.push({
    id: file.replace(/\.md$/, ""),
    title,
    terms: (grab("Terms") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    duration: grab("Duration"),
    funder: grab("Funder") ?? "National Research Foundation of Korea",
  });
}

// Newest first by the year the duration starts.
projects.sort((a, b) => (parseInt(b.duration ?? "0") || 0) - (parseInt(a.duration ?? "0") || 0));
await writeFile(join(root, "data/projects.json"), JSON.stringify(projects, null, 2) + "\n");

const byRole = members.reduce((acc, m) => ({ ...acc, [m.role]: (acc[m.role] ?? 0) + 1 }), {});
console.log(`${members.length} members (${members.filter((m) => m.photo).length} with photos)`);
for (const [role, n] of Object.entries(byRole)) console.log(`   ${n}  ${role}`);
console.log(`${projects.length} projects`);
