import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaperPage, getPaperSlugs } from "@/lib/paper-pages";

// One static page per paper, so every node in the network has somewhere to go
// and every paper has an address that can be sent to someone.
//
// The title links out to the publisher and nothing here pretends to be the
// paper: there are no abstracts in this data. What this page has that no view
// on the site has is all three Web of Science schemes on one paper with the
// basis of each stated, and the papers it shares a title with.

export function generateStaticParams() {
  return getPaperSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const paper = getPaperPage(slug);
  if (!paper) return {};
  return {
    title: paper.title,
    // The citation, not a summary — there is no abstract to summarise, and a
    // description that repeats the title helps nobody.
    description: [
      paper.authors.join(", "),
      paper.venue,
      paper.year ?? undefined,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/** A labelled line in the record. Values wrap; the label does not. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </dd>
    </div>
  );
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paper = getPaperPage(slug);
  if (!paper) notFound();

  const locator = [
    [paper.volume, paper.issue && `(${paper.issue})`].filter(Boolean).join(""),
    paper.pages,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-3xl pt-6 sm:pt-10">
      {/* Smaller than a page title: this is a record about a paper, not the
          paper, and setting it at 48px would claim otherwise. */}
      <h1 className="text-2xl leading-snug font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
        {paper.url ? (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-400"
          >
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h1>

      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        {paper.authors.join(", ")}
      </p>
      <p className="mt-1 text-zinc-500 dark:text-zinc-400">
        {[paper.venue, locator, paper.year].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-8 max-w-3xl border-b border-zinc-200 dark:border-zinc-800" />

      <dl className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {paper.doi && (
          <Row label="DOI">
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-700"
            >
              {paper.doi}
            </a>
          </Row>
        )}

        {/* Each scheme says how it was assigned, because the three are not the
            same kind of claim: two follow the journal and one follows what the
            paper cites. */}
        <Row label="Subject Categories">
          {paper.categories.length ? paper.categories.join(" · ") : "—"}
          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
            Assigned to the venue
          </span>
        </Row>

        <Row label="Research Areas">
          {paper.areas.length ? paper.areas.join(" · ") : "—"}
          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
            Assigned to the venue · Clarivate&rsquo;s broader scheme
          </span>
        </Row>

        <Row label="Citation Topic">
          {paper.topic ? (
            <>
              {paper.topic.meso}
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Assigned to the paper · within {paper.topic.macro}
              </span>
            </>
          ) : (
            <>
              Not assigned
              {/* Said plainly rather than left blank. A recent paper usually has
                  no topic yet, and a reader should be able to tell that from a
                  paper the Core Collection does not index at all. */}
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                The Core Collection has no Citation Topic for this paper yet
              </span>
            </>
          )}
        </Row>

        {paper.labAreas.length > 0 && (
          <Row label="In the lab">
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {paper.labAreas.map((area) => (
                <Link
                  key={area.title}
                  href={`/publications/?q=${encodeURIComponent(area.q)}`}
                  className="underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-700"
                >
                  {area.title}
                </Link>
              ))}
            </span>
          </Row>
        )}
      </dl>

      {paper.related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
            Shares a title with
          </h2>
          {/* The same rule that draws a line in the network, and read from the
              network itself rather than recomputed, so the two cannot drift. */}
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Two or more words in common, ignoring ordinary ones like{" "}
            <em>of, the</em> and <em>with</em>.
          </p>
          <ul className="mt-6 space-y-6">
            {paper.related.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/publications/${other.slug}/`}
                  className="leading-snug font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {other.title}
                </Link>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {other.year} · shares{" "}
                  <span className="text-black dark:text-zinc-200">
                    {other.words.join(", ")}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/publications/"
        className="mt-16 inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/[.06]"
      >
        All publications
      </Link>
    </div>
  );
}
