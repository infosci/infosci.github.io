import Link from "next/link";
import {
  DigitalHumanitiesIcon,
  MentalHealthIcon,
  ScienceOfScienceIcon,
} from "@/components/AreaIcons";
import { TriadFigure } from "@/components/TriadFigure";

// The cards are fixed: a mark, the field's name, and the citation. Nothing on
// them is in our words — each title links to the field's standing reference,
// the thing that does not change from year to year, so the definitional work
// is done by the field rather than by us.
//
// Digital Humanities is cited differently on purpose. Science of science has a
// canonical review and mental health informatics has a professional body that
// states its scope; DH has neither, and its own literature treats "what is
// DH?" as the open question. Kirschenbaum's chapter is the honest citation —
// it argues the field is a methodological outlook rather than a fixed object.
const AREAS = [
  {
    id: "science-of-science",
    title: "Science of Science",
    Icon: ScienceOfScienceIcon,
    source: {
      href: "https://www.science.org/doi/10.1126/science.aao0185",
      label: "Fortunato et al., Science (2018)",
    },
  },
  {
    id: "mental-health-informatics",
    title: "Mental Health Informatics",
    Icon: MentalHealthIcon,
    source: {
      href: "https://amia.org/community/working-groups/mental-health-informatics",
      label: "AMIA Working Group",
    },
  },
  {
    id: "digital-humanities",
    title: "Digital Humanities",
    Icon: DigitalHumanitiesIcon,
    source: {
      href: "https://dhdebates.gc.cuny.edu/read/untitled-88c11800-9446-469b-a3be-3fdb36bfbd1e/section/f5640d43-b8eb-4d49-bc4b-eb31a16f3d06",
      label: "Kirschenbaum, Debates in the DH (2012)",
    },
  },
];


/** The arrow that says "this leaves the site". Deliberately not in
 * AreaIcons.tsx — that file holds the three research marks, drawn in ddun.ai's
 * 32x42 idiom; this is interface furniture at a different scale. */
function ExternalMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-600"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 16 L16 8" />
      <path d="M9.5 8 H16 V14.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Yonsei DataLab
      </h1>

      {/* No max-width here, unlike the other pages' prose: the line is meant to
          read as one unbroken statement, and a measure constraint wrapped it in
          two. It still wraps on narrow screens, which is right — forcing
          nowrap would push it off the side on a phone. */}
      <p className="mt-5 text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-400">
        We study people, data, and technology — and what happens where the three
        meet.
      </p>

      <div className="mt-14 grid w-full items-start gap-6 sm:grid-cols-3">
        {AREAS.map((area) => (
          <section
            key={area.id}
            className="flex h-full flex-col items-center gap-3 rounded-2xl border border-black/[.08] px-6 py-10 text-center dark:border-white/[.145]"
          >
              <area.Icon className="h-10 w-8 text-black dark:text-zinc-50" />
              {/* One line each. "Mental Health Informatics" is the constraint —
                  at text-2xl it wrapped in a third-width column, leaving the
                  three titles visually uneven. Dropped a size and pinned to
                  nowrap; the longest still clears the card at phone width. */}
              {/* The underline sits on the text span, not the anchor, so the
                  arrow beside it is not underlined too. */}
              <a
                href={area.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-xl font-semibold tracking-tight whitespace-nowrap text-black dark:text-zinc-50"
              >
                <span className="underline decoration-zinc-300 underline-offset-4 transition-colors group-hover:decoration-zinc-500 dark:decoration-zinc-700 dark:group-hover:decoration-zinc-400">
                  {area.title}
                </span>
                <ExternalMark />
              </a>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">{area.source.label}</p>
          </section>
        ))}
      </div>

      {/* Sized against the text column rather than the full width: at 5xl the
          circles became a banner and stopped reading as a diagram. */}
      <div className="mt-16 flex justify-center">
        <TriadFigure className="h-auto w-full max-w-md text-black dark:text-zinc-50" />
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
