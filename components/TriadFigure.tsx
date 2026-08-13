// People, data and technology — the assumption the lab works from — drawn as a
// closed triad.
//
// The three research areas used to be text around this figure, each sitting
// outside "its" edge, which wrongly asserted that a field belongs to two of the
// three vertices. They are cards around the figure now, so the layout carries
// the relation instead: the triad is one object at the centre, and every area
// surrounds the whole of it.
//
// The ring is what closes the triad. Without it the drawing is three points and
// three lines; with it, it is a single thing the cards can sit around.
//
// Geometry is computed, not typed: vertices sit 120° apart on a circumcircle,
// and every label is placed by angle and radius from one centre.

const CX = 160;
const CY = 155;
const RT = 76; // centroid to each triangle vertex
const DOT = 5; // vertex dot radius
const CLEAR = 19; // gap between dot edge and label, identical for all three
const CAP = 11; // cap height at 15px, so a label below a dot clears by CLEAR too
const DESC = 4; // descender depth — "People" has one, so a label above a dot
// hangs lower than its baseline and would otherwise sit closer than the others
const RC = 148; // the ring, sized to clear the longest label

const point = (deg: number, radius: number) => ({
  x: CX + radius * Math.cos((deg * Math.PI) / 180),
  y: CY + radius * Math.sin((deg * Math.PI) / 180),
});

// -90° puts People at the top. Technology takes the right foot and Data the
// left; the two were the other way round until the lab swapped them.
//
// Labels are offset vertically from their dot, not radially outward from the
// centre. Radial placement looks even on paper — every label the same distance
// out — but the text runs horizontally while the offset runs diagonally, so
// each bottom label's inner edge swings back toward its own dot. "Technology"
// ended up overlapping its dot's vertical band while "People", sitting straight
// above, had a clean gap. Offsetting vertically gives all three the same
// clearance, which is what the eye actually reads.
const VERTICES = [
  { label: "People", angle: -90, above: true },
  { label: "Technology", angle: 30, above: false },
  { label: "Data", angle: 150, above: false },
];

// Baseline for a label sitting above or below its dot, with equal visible gap.
const labelY = (vertexY: number, above: boolean) =>
  above ? vertexY - DOT - CLEAR - DESC : vertexY + DOT + CLEAR + CAP;

export function TriadFigure({ className }: { className?: string }) {
  const path =
    VERTICES.map((v, i) => {
      const p = point(v.angle, RT);
      return `${i === 0 ? "M" : "L"}${p.x} ${p.y}`;
    }).join(" ") + " Z";

  return (
    <svg
      viewBox="0 0 320 312"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label="A triangle with People, Technology and Data at its vertices, enclosed by a ring"
    >
      {/* Fainter than the triangle: it encloses rather than competes. */}
      <circle
        cx={CX}
        cy={CY}
        r={RC}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.22}
      />

      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        opacity={0.5}
      />

      {VERTICES.map((v) => {
        const p = point(v.angle, RT);
        return <circle key={v.label} cx={p.x} cy={p.y} r={5} fill="currentColor" />;
      })}

      <g fill="currentColor" textAnchor="middle" style={{ fontFamily: "inherit" }}>
        {VERTICES.map((v) => {
          const p = point(v.angle, RT);
          return (
            <text
              key={v.label}
              x={p.x}
              y={labelY(p.y, v.above)}
              fontSize={15}
              fontWeight={500}
            >
              {v.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
