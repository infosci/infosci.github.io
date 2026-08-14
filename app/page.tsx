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
      // aspect-square from sm up, where the grid has three columns to divide.
      // Below that the cards stack full width and a square would be a 327px tall
      // box holding three short lines.
      className={`flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-black/[.08] px-4 py-6 text-center sm:aspect-square dark:border-white/[.145] ${className ?? ""}`}
    >
      {/* h-10 rather than h-8: the atom and the microchip carry more internal
          detail than the marks they replaced, and at 32px their strokes nearly
          touched. */}
      <area.Icon className="h-10 w-8 text-black dark:text-zinc-50" />
      {/* Titles hold one line. At 14px the longest measures 214px and the card
          gives it 246px, so nowrap is safe — but it is only safe at this card
          width, and a narrower grid or a longer area name would clip. min-h-12
          is gone with the wrapping it used to reserve room for.

          The underline sits on the text span, not the anchor, so the arrow
          beside it is not underlined too. */}
      <a
        href={area.source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight whitespace-nowrap text-black dark:text-zinc-50"
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
      {/* Title and statement on the left, the triad on the right of them.
          
          The figure is sized under the height of the text beside it, not to its
          own natural size. The header's height is whichever of the two is
          taller, and the rule below has to land at 252px like the other three
          pages — at h-24 the figure was 96px against an 88px text block and
          pushed the rule to 260. h-20 keeps the text in charge. */}
      <div className="flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
            Yonsei DataLab
          </h1>
          {/* Set exactly as the other three pages set their standfirst — same
              size, same gap under the title. */}
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            We study people, data, and technology — and what happens where the
            three meet.
          </p>
        </div>
        <TriadFigure className="h-20 w-auto shrink-0 self-center text-black dark:text-zinc-50" />
      </div>

      <div className="mt-8 max-w-3xl border-b border-zinc-200 dark:border-zinc-800" />

      {/* Four cards, then the triad under them.
          
          The figure used to sit in the middle with the cards arranged around
          it, which read as a mapping — as though each card belonged to a vertex
          or an edge. It does not: every area draws on all three of people, data
          and technology. Underneath, the triad reads as the assumption the four
          areas rest on rather than a key to them. */}
      {/* max-w-xl, not max-w-3xl: 278px squares rather than 374px. The floor is
          set by the longest title on one line — "Science and Technology Studies"
          measures 214px at 14px, plus the arrow and the padding, so a card
          narrower than about 266px would wrap it. */}
      <div className="mt-10 grid w-full max-w-xl gap-5 sm:grid-cols-2">
        <AreaCard area={AREAS[0]} />
        <AreaCard area={AREAS[1]} />
        <AreaCard area={AREAS[2]} />
        <AreaCard area={AREAS[3]} />
      </div>
    </div>
  );
}
