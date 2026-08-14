import {
  DigitalHumanitiesIcon,
  MentalHealthIcon,
  ScienceOfScienceIcon,
  TechnologyStudiesIcon,
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
    // 4S: the field's international body, founded 1975, and the parallel to
    // AMIA on the mental health card. Its page describes the field it fosters
    // as "social studies of science, technology, and medicine", noting that
    // field "includes Science and Technology Studies".
    //
    // Three other candidates were tried and rejected, each for a different
    // reason worth remembering: EASST matched this card's exact phrase but is
    // the European association, not the international one; the Handbook of STS
    // is the field's standard reference but its page reads as a book listing;
    // Harvard's "What is STS?" is purpose-built to define the field but speaks
    // for one programme rather than for the field.
    id: "science-and-technology-studies",
    title: "Science and Technology Studies",
    Icon: TechnologyStudiesIcon,
    source: {
      href: "https://www.4sonline.org/what_is_4s.php",
      label: "Society for Social Studies of Science (4S)",
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

function AreaCard({
  area,
  className,
}: {
  area: (typeof AREAS)[number];
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-black/[.08] px-5 py-6 text-center dark:border-white/[.145] ${className ?? ""}`}
    >
      {/* h-10 rather than h-8: the atom and the microchip carry more internal
          detail than the marks they replaced, and at 32px their strokes nearly
          touched. */}
      <area.Icon className="h-10 w-8 text-black dark:text-zinc-50" />
      {/* Titles wrap. They were pinned to one line while "Mental Health
          Informatics" was the longest; "Science and Technology Studies" does
          not fit a quarter-width card at any size worth reading, so nowrap
          gave way to text-balance, which splits the two-line titles evenly
          rather than leaving one word stranded.

          The underline sits on the text span, not the anchor, so the arrow
          beside it is not underlined too. */}
      <a
        href={area.source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex min-h-12 items-center gap-1.5 text-base font-semibold tracking-tight text-balance text-black dark:text-zinc-50"
      >
        <span className="underline decoration-zinc-300 underline-offset-4 transition-colors group-hover:decoration-zinc-500 dark:decoration-zinc-700 dark:group-hover:decoration-zinc-400">
          {area.title}
        </span>
        <ExternalMark />
      </a>
      {/* zinc-500/400, not zinc-400/600. The original pair failed WCAG AA in
          both themes at this size — 2.51:1 on the light background and 2.72:1
          on the dark one, against 4.5:1 for text under 18px. Size keeps it
          secondary; colour no longer has to. */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{area.source.label}</p>
    </section>
  );
}

export default function Home() {
  return (
    <div className="pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Yonsei DataLab
      </h1>

      {/* Set exactly as the other three pages set their standfirst — same size,
          same gap under the title — so the rule below lands at the same height
          on all four. It used to run larger here, which pushed the rule down
          and made the home page sit differently from the rest of the site. */}
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        We study people, data, and technology — and what happens where the three
        meet.
      </p>

      <div className="mt-8 max-w-3xl border-b border-zinc-200 dark:border-zinc-800" />

      {/* The triad sits in the middle with the cards around it: one card either
          side and one beneath, so the figure is enclosed rather than captioned.
          On a phone the grid collapses to a single column and the order becomes
          card, figure, card, card — the figure still sits among them. */}
      <div className="mt-10 grid w-full gap-5 sm:grid-cols-3">
        <AreaCard area={AREAS[0]} />

        {/* Spans both rows so the triad sits level with the four cards rather
            than above them; auto-placement flows the remaining cards around it.

            order-first on mobile, where the grid collapses to one column: in
            DOM order the figure sits second, which stacked it between the
            first card and the other three and broke the run. Leading with it
            also reads better — the triad is the assumption, the cards are what
            is built on it. */}
        <TriadFigure className="mx-auto h-auto w-full max-w-[17rem] self-center text-black max-sm:order-first sm:row-span-2 dark:text-zinc-50" />

        <AreaCard area={AREAS[1]} />
        <AreaCard area={AREAS[2]} />
        <AreaCard area={AREAS[3]} />
      </div>
    </div>
  );
}
