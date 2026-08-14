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
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Different backgrounds, unique perspectives, and one lab.
      </p>

      <PeopleExplorer people={people} />
    </div>
  );
}
