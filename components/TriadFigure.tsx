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
const CY = 140;
const RT = 76; // centroid to each triangle vertex
const RC = 118; // the ring enclosing the triad

const point = (deg: number, radius: number) => ({
  x: CX + radius * Math.cos((deg * Math.PI) / 180),
  y: CY + radius * Math.sin((deg * Math.PI) / 180),
});

// -90° puts People at the top. Technology takes the right foot and Data the
// left; the two were the other way round until the lab swapped them.
const VERTICES = [
  { label: "People", angle: -90, lx: CX, ly: CY - RT - 16, anchor: "middle" as const },
  {
    label: "Technology",
    angle: 30,
    lx: point(30, RT).x + 10,
    ly: point(30, RT).y + 20,
    anchor: "start" as const,
  },
  {
    label: "Data",
    angle: 150,
    lx: point(150, RT).x - 10,
    ly: point(150, RT).y + 20,
    anchor: "end" as const,
  },
];

export function TriadFigure({ className }: { className?: string }) {
  const path =
    VERTICES.map((v, i) => {
      const p = point(v.angle, RT);
      return `${i === 0 ? "M" : "L"}${p.x} ${p.y}`;
    }).join(" ") + " Z";

  return (
    <svg
      viewBox="0 0 320 290"
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

      <g fill="currentColor" style={{ fontFamily: "inherit" }}>
        {VERTICES.map((v) => (
          <text
            key={v.label}
            x={v.lx}
            y={v.ly}
            textAnchor={v.anchor}
            fontSize={15}
            fontWeight={500}
          >
            {v.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
