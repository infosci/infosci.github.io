import type { Metadata } from "next";
import PeopleExplorer, { type Member } from "@/components/PeopleExplorer";
import members from "@/data/members.json";

export const metadata: Metadata = { title: "People" };

// Shuffled at build time, not sorted by seniority. The point is that the grid
// carries no ranking: whoever appears first does so by arithmetic rather than
// by standing.
//
// Seeded rather than Math.random, for two reasons. A random draw during render
// would differ between the server pass and hydration, and React would replace
// the whole grid on load. And a fixed seed keeps builds reproducible, so a diff
// of the output shows real changes instead of a reshuffle. Change SEED — or
// swap it for a build timestamp — to deal a new order.
const SEED = 0x5eed1a8;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(people: Member[]) {
  const rand = mulberry32(SEED);
  const out = [...people];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function PeoplePage() {
  const people = shuffled(members as Member[]);

  return (
    <div className="pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        People
      </h1>
      {/* The line and the color toggle are one idea. The photographs are
          everyone at their brightest — graduation, a trip, good light — and the
          work that earned those moments happened in hours nobody photographed.
          The line names the photographs directly, which is what ties it to the
          switch: turning the page to mono is what those hours looked like.
          
          Deliberately not explained anywhere near the switch. A reader who has
          read this line and then flips it gets it at once, and a caption saying
          "mono represents unseen effort" would take a small thing and make it
          heavy. */}
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        What you see is the bright part. It was made in hours nobody
        photographed.
      </p>

      <div className="mt-8 max-w-3xl border-b border-zinc-200 dark:border-zinc-800" />

      {/* Held to the rule's width. The grid used to run the full column, 256px
          wider than the line above it, which made the page look like it had two
          different edges. Four columns in 768px also brings the photos down
          from 241px to 177px, which is plenty for a face. */}
      <div className="max-w-3xl">
        <PeopleExplorer people={people} />
      </div>
    </div>
  );
}
