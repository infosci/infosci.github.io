import {
  ComputationalSocialScienceIcon,
  DigitalHumanitiesIcon,
  HealthIcon,
  RetrievalIcon,
  ScienceOfScienceIcon,
  SuicidologyIcon,
  TechnologyStudiesIcon,
} from "@/components/AreaIcons";
import Link from "next/link";
import { TriadFigure } from "@/components/TriadFigure";
import { AREAS } from "@/lib/areas";
import publications from "@/data/publications.json";
import manual from "@/data/manual-publications.json";

/** The arrow that says "this leaves the site". Deliberately not in
 * AreaIcons.tsx — that file holds the research marks, drawn in ddun.ai's 32x42
 * idiom; this is interface furniture at a different scale. */
function ExternalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-600 ${className ?? ""}`}
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

/** The arrow for a link that stays on the site: no diagonal, since nothing
 *  leaves. */
function InwardMark() {
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
      <path d="M5 12 H18" />
      <path d="M13 7 L18 12 L13 17" />
    </svg>
  );
}

function AreaCard({ area }: { area: (typeof AREAS)[number] }) {
  const Icon = ICONS[area.id];
  // Every card leads to the same place: the publications list, searched for the
  // words that name this area. The chips on that page are Clarivate's and these
  // words are ours, which is the honest division — a card says what the lab
  // works on in the lab's own terms, and the search box it lands in shows
  // exactly which terms, editable by anyone who disagrees with them.
  //
  // Web of Science values were tried first and fitted two cards out of seven:
  // one Citation Topic held the suicide papers exactly, one Subject Category
  // held the health work, and nothing in Clarivate's schemes corresponds to the
  // other five. Keywords fit all seven, at the cost of being a claim we make
  // rather than one we cite — which is why they land somewhere visible and
  // editable rather than sitting inside a chip that looks authoritative.
  const to = `/publications/?q=${encodeURIComponent(area.q)}`;

  return (
    <section
      // aspect-square from sm up, where the grid has three columns to divide.
      // Below that the cards stack full width and a square would be a 327px tall
      // box holding three short lines.
      className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-black/[.08] px-3 py-6 text-center sm:aspect-square dark:border-white/[.145]"
    >
      {/* h-10 rather than h-8: the atom and the microchip carry more internal
          detail than the marks they replaced, and at 32px their strokes nearly
          touched. */}
      <Icon className="h-10 w-8 text-black dark:text-zinc-50" />

      {/* Titles hold one line. At 13px the longest — Science and Technology
          Studies, with its arrow — measures 206px against the 217px the card
          gives it. Eleven pixels, measured rather than assumed, and only safe
          at this card width: a narrower grid or a longer area name would clip,
          so measure again when adding a card.

          The underline sits on the text span, not the arrow beside it. */}
      <Link
        href={to}
        className="group inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-tight whitespace-nowrap text-black dark:text-zinc-50"
      >
        <span className="underline decoration-zinc-300 underline-offset-4 transition-colors group-hover:decoration-zinc-500 dark:decoration-zinc-700 dark:group-hover:decoration-zinc-400">
          {area.title}
        </span>
        <InwardMark />
      </Link>

      {/* zinc-500/400, not zinc-400/600. The original pair failed WCAG AA in
          both themes at this size — 2.51:1 on the light background and 2.72:1
          on the dark one, against 4.5:1 for text under 18px. Size keeps it
          secondary; color no longer has to.

          The title goes inward, so this line carries the outward link: the
          field's own reference stays one click away from every card. */}
      <a
        href={area.source.href}
        target="_blank"
        rel="noopener noreferrer"
        // Inline rather than inline-flex, so the mark follows the last word
        // instead of parking at the end of the first line. Several of these
        // labels wrap to two lines.
        className="text-xs text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <span className="underline decoration-zinc-300 underline-offset-2 dark:decoration-zinc-700">
          {area.source.label}
        </span>
        <ExternalMark className="ml-1 inline-block align-[-1px]" />
      </a>
    </section>
  );
}

// A mark per area, joined back on by id. The areas themselves are data in
// lib/areas.ts; this is the only part of a card that has to be a component.
const ICONS: Record<
  string,
  (props: { className?: string }) => React.JSX.Element
> = {
  "science-of-science": ScienceOfScienceIcon,
  "health-informatics": HealthIcon,
  "computational-suicidology": SuicidologyIcon,
  "science-and-technology-studies": TechnologyStudiesIcon,
  "computational-social-science": ComputationalSocialScienceIcon,
  "information-retrieval": RetrievalIcon,
  "digital-humanities": DigitalHumanitiesIcon,
};

/** How many papers a card's search reaches. The same matching the search box
 *  does: words inside a group must all appear, groups separated by "or" are
 *  alternatives. */
function reach(q: string) {
  const groups = q.toLowerCase().split(/\s+or\s+/);
  return [...publications, ...manual].filter((p) => {
    const hay = [
      p.title,
      (p.authors ?? []).join(" "),
      p.venue ?? p.journal ?? "",
      p.year ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return groups.some((g) => g.split(/\s+/).every((w) => hay.includes(w)));
  }).length;
}

// Biggest first, counted at build rather than decided. The order used to be
// accretion history — the first four in the order they were written, then each
// new card slotted in by a one-off judgement — which left no answer for where
// the next one goes, and no answer is how an order drifts.
//
// Size is the only rule here that stays true without anyone maintaining it, and
// it says something a reader can use: this lab is mostly science of science and
// health informatics. It moves as the collection grows, which is the point.
//
// Ties break on the order written above, so the two cards at 23 keep a stable
// relative position rather than swapping on an unrelated edit.
const ORDERED = [...AREAS]
  .map((area, i) => ({ area, i, n: reach(area.q) }))
  .sort((a, b) => b.n - a.n || a.i - b.i)
  .map((x) => x.area);

export default function Home() {
  return (
    <div className="pt-6 sm:pt-10">
      {/* Title and statement on the left, the triad on the right of them.
          
          The rule below has to land at 252px like the other three pages, so
          the header's height has to stay the text block's 88px — and the
          header takes the height of whichever child is taller. The figure is
          drawn at 176px and given -my-12, which leaves its margin box 80px:
          it overflows without occupying the space. The negative margin is
          scoped to sm because below it the figure sits under the text rather
          than beside it, where the overflow would bite into the standfirst
          and land on the rule.
          
          The translate is what buys the size. Centred on the text block the
          figure sits at y=176, and with the rule at 252 that caps it at 152px
          — the nav is 120px above, so the room exists, just not on that
          centre line. Moving it up 22px puts it on the middle of the band
          between the two instead, with 10px of clearance at each end. A
          transform does this without touching layout, so the header stays
          88px and the rule stays put.
          
          Sideways, width tracks height: 181px at this size. The row is 768px
          and the gap 16px, which leaves 571px for the text — the standfirst
          was cut to fit it, since at its old length it wrapped, the header
          grew to 112px and the rule fell to 276 on this page alone. */}
      <div className="flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
            Yonsei DataLab
          </h1>
          {/* Set exactly as the other three pages set their standfirst — same
              size, same gap under the title. It has to stay one line and
              inside 571px: a second line moves this page's rule off the
              position the other three hold. */}
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            We study people, data, and technology — and where the three meet.
          </p>
        </div>
        <TriadFigure className="h-44 w-auto shrink-0 self-center text-black sm:-my-12 sm:-translate-y-[22px] dark:text-zinc-50" />
      </div>

      <div className="mt-8 max-w-3xl border-b border-zinc-200 dark:border-zinc-800" />

      {/* Three across, and as many rows as there are cards — mapped rather than
          listed by index, since the list has grown twice and each time the grid
          had to be edited to match.
          
          The triad is not among them. It used to sit in the middle with the
          cards arranged around it, which read as a mapping — as though each
          card belonged to a vertex or an edge. It does not: every area draws on
          all three of people, data and technology, so the figure sits by the
          title instead.
          
          Three columns rather than two because two left a 212px hole down the
          middle of the block. It costs title size: 243px cards give 217px of
          room, under the 266px the longest title needs at 14px, which is why
          the titles are 13px and the padding px-3. */}
      <div className="mt-10 grid w-full max-w-3xl gap-5 sm:grid-cols-3">
        {ORDERED.map((area) => (
          <AreaCard key={area.id} area={area} />
        ))}
      </div>
    </div>
  );
}
