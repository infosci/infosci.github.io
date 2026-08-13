import type { Metadata } from "next";
import { getPublicationsByYear, type Publication } from "@/lib/publications";

export const metadata: Metadata = { title: "Publications" };

// "Journal of Informetrics 20(1), 101766" — assembled rather than templated,
// because online-first papers legitimately have no volume, issue, or pages yet
// and the punctuation has to survive their absence.
//
// pub.venue, when set, replaces the container name only — the locator still
// follows, so page ranges survive the shortening.
function venue(pub: Publication) {
  const issue = pub.issue ? `(${pub.issue})` : "";
  const locator = [`${pub.volume ?? ""}${issue}`.trim(), pub.pages].filter(Boolean).join(", ");
  return [pub.venue ?? pub.journal, locator].filter(Boolean).join(" ");
}

export default function PublicationsPage() {
  const years = getPublicationsByYear();

  return (
    <div className="max-w-3xl pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Publications
      </h1>

      <div className="mt-14 space-y-12">
        {years.map(({ year, items }) => (
          <section key={year ?? "undated"}>
            <h2 className="text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
              {year ?? "Undated"}
            </h2>
            <ul className="mt-5 space-y-7">
              {items.map((pub) => (
                <li key={pub.doi ?? pub.title}>
                  <h3 className="leading-snug font-medium text-black dark:text-zinc-50">
                    {pub.url ? (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {pub.title}
                      </a>
                    ) : (
                      pub.title
                    )}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {pub.authors.join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{venue(pub)}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
