// Read a markdown file from content/ at build time, splitting off its YAML-ish
// frontmatter. Deliberately not gray-matter: the frontmatter here is a handful
// of flat "key: value" lines, and a dependency to parse that would not earn its
// place. If a page ever needs nested or typed frontmatter, swap this out rather
// than growing it.
//
// Called only from Server Components, which run at build time under
// output: "export" — no filesystem access happens in the browser.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type MarkdownDoc = {
  meta: Record<string, string>;
  body: string;
};

export function readMarkdown(name: string): MarkdownDoc {
  const raw = readFileSync(join(process.cwd(), "content", `${name}.md`), "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: raw.trim() };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(match[0].length).trim() };
}
