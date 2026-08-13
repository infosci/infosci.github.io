// Downscale member photos copied out of the old site.
//
//   node scripts/optimize-photos.mjs
//
// al-folio shipped originals straight from the camera — 1969x1969 JPEGs,
// averaging over 1MB each, 28MB for 25 people. They are displayed at a few
// hundred pixels. This rewrites them in place as 480px WebP, which is more than
// enough for a 2x retina rendering of a ~240px portrait.
//
// sharp is a devDependency used only here; the site itself ships plain <img>
// tags at build time, so nothing at runtime depends on it.

import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const dir = new URL("../public/people", import.meta.url).pathname;
const SIZE = 480;

let before = 0;
let after = 0;
const renames = new Map();

for (const file of await readdir(dir)) {
  if (![".jpg", ".jpeg", ".png"].includes(extname(file).toLowerCase())) continue;

  const from = join(dir, file);
  const to = join(dir, `${basename(file, extname(file))}.webp`);
  before += (await stat(from)).size;

  await sharp(from)
    .resize(SIZE, SIZE, { fit: "cover", position: "top" })
    .webp({ quality: 82 })
    .toFile(to);

  after += (await stat(to)).size;
  await unlink(from);
  renames.set(`/people/${file}`, `/people/${basename(to)}`);
}

// members.json still points at the original filenames; rewrite those too so the
// two stay in step.
const dataPath = new URL("../data/members.json", import.meta.url);
const { readFile, writeFile } = await import("node:fs/promises");
const members = JSON.parse(await readFile(dataPath, "utf8"));
for (const m of members) if (m.photo && renames.has(m.photo)) m.photo = renames.get(m.photo);
await writeFile(dataPath, JSON.stringify(members, null, 2) + "\n");

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`${renames.size} photos: ${mb(before)}MB -> ${mb(after)}MB`);
