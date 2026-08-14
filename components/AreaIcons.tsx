// Marks for the research areas, drawn in ddun.ai's icon language: a
// 32x42 viewBox, 2.5 stroke, round caps and joins, no fill. Like the doors on
// ddun.ai/knowthyself these are abstract signs rather than illustrations — the
// point is one legible idea per area at 40px, not a picture of the field.
//
// Kept in one file because they are a set used in exactly one place; ddun.ai
// splits its icons per file because they are reused across many pages.

type IconProps = { className?: string };

const SHARED = {
  viewBox: "0 0 32 42",
  xmlns: "http://www.w3.org/2000/svg",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** An atom: a nucleus with three orbits. The mark was a triangle of linked
 * nodes — apt for a field that studies citation structure, but at 32px it read
 * as a generic network diagram rather than as science. The atom is the sign
 * everyone already knows, which is what a card title needs beside it. */
export function ScienceOfScienceIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <circle cx="16" cy="20" r="2.6" />
      {/* Three ellipses on one centre, 60° apart. */}
      <ellipse cx="16" cy="20" rx="11.5" ry="5" />
      <ellipse cx="16" cy="20" rx="11.5" ry="5" transform="rotate(60 16 20)" />
      <ellipse cx="16" cy="20" rx="11.5" ry="5" transform="rotate(120 16 20)" />
    </svg>
  );
}

/** A heart held inside a head. The lab's work here is depression and
 * suicidology, and a network or a pulse inside the head would describe the
 * method while saying nothing about the point of it. The earlier mark was a
 * plain circle around a pulse, which read as a gauge rather than a mind — the
 * open profile, with its gap at the jaw, is what makes it a head.
 *
 * A heart reads warmer than clinical. On this subject that is the right
 * register: the people behind the data are the reason for it. */
export function MentalHealthIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <path d="M23 32 v-4.5 a10.5 10.5 0 1 0 -8 3.2 v1.3" />
      <path d="M16.2 23 c-3.9 -3.2 -5.6 -5.4 -3.7 -7.6 c1.6 -1.8 3.7 -0.5 3.7 1 c0 -1.5 2.1 -2.8 3.7 -1 c1.9 2.2 0.2 4.4 -3.7 7.6 z" />
    </svg>
  );
}

/** A microchip: a die inside a package, with pins on all four sides. The mark
 * was a cog, which at this size read as a settings button rather than as
 * technology. A chip is unambiguous, and it is a made object — right for a
 * field that studies technology as something people build and live with. */
export function TechnologyStudiesIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <rect x="9" y="13" width="14" height="14" rx="2.5" />
      <rect x="13.5" y="17.5" width="5" height="5" rx="1" />
      {/* Two pins per side, so no edge is left bare. */}
      <path d="M13 13 V9" />
      <path d="M19 13 V9" />
      <path d="M13 27 V31" />
      <path d="M19 27 V31" />
      <path d="M9 17 H5" />
      <path d="M9 23 H5" />
      <path d="M23 17 H27" />
      <path d="M23 23 H27" />
    </svg>
  );
}

/** One point, ringed, among others that are not.
 *
 * The subject rules out most of what an icon might reach for, and rightly: no
 * imagery of harm, nothing clinical, nothing that would be grim to meet on a
 * homepage. What is left is the work itself — finding, in a population, the
 * person at risk — which is what the lab's grants describe and what a ring
 * around a single point says without saying anything else.
 *
 * The asymmetry is not decoration, it is the whole design. Drawn first with six
 * points spaced evenly around a centred ring, it was the theme toggle's sun
 * almost exactly — and that sun sits in the nav on the same page. Rays are
 * regular and short; a population is neither. So the ring sits up and to the
 * left and the points trail away from it, which no sun does.
 *
 * The points are also deliberately not joined. This is not a network; it is a
 * population, and at 40px a few dots and a ring could be read as either.
 */
export function SuicidologyIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <circle cx="11" cy="15" r="6.5" />
      <circle cx="11" cy="15" r="2" fill="currentColor" stroke="none" />
      {/* Irregular on purpose — spacing, distance and size all vary. */}
      <circle cx="24" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="24" cy="29" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="33" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="6" cy="29" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A person tied to two others: head and shoulders at the top, two plain nodes
 * below, three links closing the triangle. A bare node-and-edge graph was
 * rejected for the science of science card as too generic — here the shoulders
 * are what fix it, since they make the graph one of people rather than of
 * anything at all. Only the focal figure gets them; giving all three shoulders
 * left nowhere for the links to start. */
export function ComputationalSocialScienceIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <circle cx="16" cy="13" r="3" />
      <path d="M11 21.5 a5 5 0 0 1 10 0" />
      <circle cx="6" cy="31" r="2.6" />
      <circle cx="26" cy="31" r="2.6" />
      <path d="M11 21.8 L7.4 28.6" />
      <path d="M21 21.8 L24.6 28.6" />
      <path d="M8.6 31 H23.4" />
    </svg>
  );
}

/** An open book. The plainest sign of the humanities, left plain on purpose —
 * every attempt to add a "digital" flourish (a node, a cursor) turned to
 * clutter at this stroke weight. The company it keeps carries the rest. */
export function DigitalHumanitiesIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <path d="M16 15 C13 12 8 12 4 14 V30 C8 28 13 28 16 31" />
      <path d="M16 15 C19 12 24 12 28 14 V30 C24 28 19 28 16 31" />
    </svg>
  );
}
