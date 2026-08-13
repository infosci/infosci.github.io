// People, data, technology — and the region where all three overlap.
//
// A Venn rather than a triangle of nodes: the homepage line is "what happens
// where the three meet", and only overlapping areas can show a meeting.
//
// Geometry, because eyeballing it went wrong the first time. The three centres
// sit on a circle of radius R about a shared centroid, 120° apart, so the
// arrangement is equilateral and no pair is more intertwined than another. A
// triple intersection exists only while the centre spacing R·√3 stays under
// r·√3 — that is, while R < r — and R is well under half of r here, which is
// what keeps the middle region large enough to mark.
//
// The centroid is the one point inside all three circles, so that is where the
// dot goes. Labels sit in each circle's outer lobe, the only part no other
// circle crosses; the coordinates below were checked against the distance to
// all three centres rather than placed by eye.
//
// Everything is currentColor, so the figure follows the theme toggle without a
// second definition.

const R = 42; // centroid to each circle's centre
const r = 78; // circle radius

const CIRCLES = [
  { cx: 123.6, cy: 124, label: "People", lx: 95, ly: 90 },
  { cx: 196.4, cy: 124, label: "Data", lx: 225, ly: 90 },
  { cx: 160, cy: 187, label: "Technology", lx: 160, ly: 240 },
];

const CENTROID = { x: 160, y: 145 };

export function TriadFigure({ className }: { className?: string }) {
  return (
    <svg
      // Cropped to the drawing rather than padded: content spans x 45–274,
      // y 46–265, so this leaves an even margin on every side.
      viewBox="30 30 260 250"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label="Three overlapping circles labelled People, Data and Technology, meeting at the centre"
    >
      <g fill="none" stroke="currentColor" strokeWidth={1.75} opacity={0.5}>
        {CIRCLES.map((c) => (
          <circle key={c.label} cx={c.cx} cy={c.cy} r={r} />
        ))}
      </g>

      <circle cx={CENTROID.x} cy={CENTROID.y} r={8} fill="currentColor" />

      <g
        fill="currentColor"
        fontSize={15}
        fontWeight={500}
        textAnchor="middle"
        // Inherit the page face rather than the browser's SVG default serif.
        style={{ fontFamily: "inherit" }}
      >
        {CIRCLES.map((c) => (
          <text key={c.label} x={c.lx} y={c.ly}>
            {c.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
