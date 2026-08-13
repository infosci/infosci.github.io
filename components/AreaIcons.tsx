// Marks for the three research areas, drawn in ddun.ai's icon language: a
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

/** Three nodes and the edges between them — a citation graph. Science of
 * science studies the structure science makes of itself, so the sign is the
 * structure, not the subject. */
export function ScienceOfScienceIcon({ className }: IconProps) {
  return (
    <svg {...SHARED} className={className ?? "h-10 w-8"}>
      <circle cx="16" cy="12" r="3" />
      <circle cx="7" cy="29" r="3" />
      <circle cx="25" cy="29" r="3" />
      {/* Edges stop short of each node so the strokes never touch. */}
      <path d="M14.6 14.7 L8.4 26.3" />
      <path d="M17.4 14.7 L23.6 26.3" />
      <path d="M10 29 H22" />
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
