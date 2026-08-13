// People, data and technology at the vertices; the lab's three research areas
// arranged around the outside.
//
// This replaced a Venn of three circles, which read as a stock diagram. A
// triangle states the same relation more quietly: three things held apart at
// equal distance, with everything else happening in the space between them.
//
// Geometry is computed rather than eyeballed. The vertices sit 120° apart on a
// circumcircle about the centroid, so the triangle is equilateral. Each area
// label sits directly outward from the midpoint of an edge — that is, rotated
// 60° from the vertices — which is the only arrangement that keeps all three
// equidistant from the shape and from each other.
//
// NOTE ON MEANING: an area placed outside an edge reads as belonging to the two
// vertices at that edge's ends. That is an assertion about the fields, not a
// neutral layout, so the pairings here are deliberate and worth checking.
//
// Everything is currentColor, so the figure follows the theme toggle.

const CX = 280;
const CY = 178;
const RT = 92; // centroid to each vertex
// Edge midpoints sit at the inradius, RT/2. Labels go a fixed step beyond
// that, not on some larger circle — at 108 they floated free of the shape.
const RL = 80;

// -90° puts a vertex at the top; the other two follow at 120° intervals.
const VERTEX_ANGLES = [-90, 30, 150];
const point = (deg: number, radius: number) => ({
  x: CX + radius * Math.cos((deg * Math.PI) / 180),
  y: CY + radius * Math.sin((deg * Math.PI) / 180),
});

const VERTICES = [
  { label: "People", ...point(VERTEX_ANGLES[0], RT), lx: CX, ly: CY - RT - 18, anchor: "middle" as const },
  {
    label: "Data",
    ...point(VERTEX_ANGLES[1], RT),
    lx: point(VERTEX_ANGLES[1], RT).x + 16,
    ly: point(VERTEX_ANGLES[1], RT).y + 22,
    anchor: "start" as const,
  },
  {
    label: "Technology",
    ...point(VERTEX_ANGLES[2], RT),
    lx: point(VERTEX_ANGLES[2], RT).x - 16,
    ly: point(VERTEX_ANGLES[2], RT).y + 22,
    anchor: "end" as const,
  },
];

// Edge midpoint directions: 60° offset from the vertices, so each label sits
// outside the edge joining the two vertices it draws on.
//
//   90°  is the Data–Technology edge   -> Digital Humanities: corpora, computed
//   210° is the Technology–People edge -> Mental Health Informatics, which AMIA
//                                          places at "the interface of
//                                          informatics and mental health"
//   330° is the People–Data edge       -> Science of Science: scientists and the
//                                          record they leave behind
//
// Each field of course touches all three. These are the two that dominate.
const AREAS = [
  { label: "Digital Humanities", ...point(90, RL), anchor: "middle" as const, dy: 14 },
  { label: "Mental Health Informatics", ...point(210, RL), anchor: "end" as const, dy: 0 },
  { label: "Science of Science", ...point(330, RL), anchor: "start" as const, dy: 0 },
];

export function TriadFigure({ className }: { className?: string }) {
  const path = VERTICES.map((v, i) => `${i === 0 ? "M" : "L"}${v.x} ${v.y}`).join(" ") + " Z";

  return (
    <svg
      viewBox="0 0 560 300"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label="A triangle with People, Data and Technology at its vertices, and the lab's three research areas arranged around it"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        opacity={0.5}
      />

      {VERTICES.map((v) => (
        <circle key={v.label} cx={v.x} cy={v.y} r={5} fill="currentColor" />
      ))}

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

        {/* Muted and a size down: the vertices are the frame, the areas are what
            sits in it. Same order of importance as the cards above. */}
        {AREAS.map((a) => (
          <text
            key={a.label}
            x={a.x}
            y={a.y + a.dy}
            textAnchor={a.anchor}
            fontSize={13}
            opacity={0.55}
          >
            {a.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
