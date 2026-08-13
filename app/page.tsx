import Link from "next/link";

// The three areas as cards, matching ddun.ai's gate: rounded-2xl, a hairline
// border, centered copy. Name and one line each — the people/data/technology
// breakdown that lived here made the cards read as spec sheets.
const AREAS = [
  {
    title: "Science of Science",
    blurb: "How research gets made, and what makes it matter.",
  },
  {
    title: "Mental Health Informatics",
    blurb: "What data reveals about mental health, and the people it reaches.",
  },
  {
    title: "Digital Humanities",
    blurb: "Computational readings of the cultural and historical record.",
  },
];

export default function Home() {
  return (
    <div className="pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Yonsei DataLab
      </h1>

      <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-400">
        We study people, data, and technology — and what happens where the three
        meet.
      </p>

      {/* items-stretch (the grid default) plus h-full on each card makes all
          three share the tallest card's height, so the row stays even however
          the blurbs wrap. */}
      <div className="mt-14 grid w-full gap-6 sm:grid-cols-3">
        {AREAS.map((area) => (
          <section
            key={area.title}
            className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-black/[.08] px-6 py-10 text-center dark:border-white/[.145]"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              {area.title}
            </h2>
            <p className="max-w-xs text-base text-balance text-zinc-600 dark:text-zinc-400">
              {area.blurb}
            </p>
          </section>
        ))}
      </div>

      <Link
        href="/publications/"
        className="mt-14 inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/[.06]"
      >
        Read our work
      </Link>
    </div>
  );
}
