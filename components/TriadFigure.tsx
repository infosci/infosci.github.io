// Two layers, one inside the other.
//
// Inside: people, data and technology, the assumption the lab works from.
// Around it: the three research areas, each of which draws on all three.
//
// The enclosing ring is the whole point of the drawing. An earlier version put
// each area outside the edge joining "its" two vertices, which asserted that
// digital humanities is data-and-technology, mental health informatics is
// technology-and-people, and so on. That is wrong: every one of these fields
// uses all three. The ring closes the triad into a single object, so an area
// sitting outside it relates to the whole rather than to an edge or a vertex.
// The areas fall between vertices only because that is where the text fits.
//
// Geometry is computed, not typed: vertices sit 120° apart on a circumcircle,
// and every label is placed by angle and radius from one centre.

const CX = 320;
const CY = 175;
const RT = 76; // centroid to each triangle vertex
const RC = 118; // the ring enclosing the triad
const RA = 140; // area labels, outside the ring

const point = (deg: number, radius: number) => ({
  x: CX + radius * Math.cos((deg * Math.PI) / 180),
  y: CY + radius * Math.sin((deg * Math.PI) / 180),
});

// -90° puts a vertex at the top; the others follow at 120° intervals.
const VERTICES = [
  { label: "People", angle: -90, lx: CX, ly: CY - RT - 16, anchor: "middle" as const },
  {
    label: "Data",
    angle: 30,
    lx: point(30, RT).x + 10,
    ly: point(30, RT).y + 20,
    anchor: "start" as const,
  },
  {
    label: "Technology",
    angle: 150,
    lx: point(150, RT).x - 10,
    ly: point(150, RT).y + 20,
    anchor: "end" as const,
  },
];

// Placed where the text has room — between vertices — not to signal a pairing.
const AREAS = [
  { label: "Digital Humanities", angle: 90, anchor: "middle" as const, dy: 4 },
  { label: "Science of Science", angle: 210, anchor: "end" as const, dy: 0 },
  { label: "Mental Health Informatics", angle: 330, anchor: "start" as const, dy: 0 },
];

export function TriadFigure({ className }: { className?: string }) {
  const path =
    VERTICES.map((v, i) => {
      const p = point(v.angle, RT);
      return `${i === 0 ? "M" : "L"}${p.x} ${p.y}`;
    }).join(" ") + " Z";

  return (
    <svg
      viewBox="0 0 640 350"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label="People, Data and Technology at the vertices of a triangle, enclosed by a ring, with the lab's three research areas arranged around the outside"
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

        {/* Muted and a size down — the triad is the frame, the areas are what
            gets built on it. Same order of importance as the cards above. */}
        {AREAS.map((a) => {
          const p = point(a.angle, RA);
          return (
            <text
              key={a.label}
              x={p.x}
              y={p.y + a.dy}
              textAnchor={a.anchor}
              fontSize={13}
              opacity={0.55}
            >
              {a.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
