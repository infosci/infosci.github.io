import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import members from "@/data/members.json";
import { asset } from "@/lib/assets";

export const metadata: Metadata = { title: "People" };

type Member = {
  slug: string;
  name: string;
  role: string | null;
  photo: string | null;
  link: string | null;
  order: number;
};

// Fixed order rather than however the data happens to sort. "research interns"
// is deliberately absent: the old site never rendered that category either, and
// the lab confirmed it should stay off the site. scripts/migrate-content.mjs
// drops those records, so they are not in the data to begin with.
const ROLE_ORDER = [
  "principal investigator",
  "doctoral students",
  "master's students",
  "visiting scholars",
  "alumni",
  "past visiting scholars",
];

function grouped() {
  const all = members as Member[];
  return ROLE_ORDER.map((role) => ({
    role,
    people: all.filter((m) => m.role === role).sort((a, b) => a.order - b.order),
  })).filter((g) => g.people.length > 0);
}

function Person({ person }: { person: Member }) {
  const body = (
    <>
      {person.photo ? (
        <Image
          // asset(), not the bare path — next/image does not add basePath.
          src={asset(person.photo)}
          alt=""
          width={240}
          height={240}
          className="aspect-square w-full rounded-lg object-cover"
        />
      ) : (
        <div className="aspect-square w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      )}
      <span className="mt-2.5 block text-center text-sm leading-snug font-normal text-black dark:text-zinc-50">
        {person.name}
      </span>
    </>
  );

  if (!person.link) return <div>{body}</div>;

  // Internal pages (currently just the PI's) route through next/link, which
  // applies basePath and keeps navigation client-side. Everything else points
  // at an external profile and opens in a new tab.
  const className = "group block transition-opacity hover:opacity-80";
  return person.link.startsWith("/") ? (
    <Link href={person.link} className={className}>
      {body}
    </Link>
  ) : (
    <a href={person.link} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  );
}

export default function PeoplePage() {
  const groups = grouped();

  return (
    <div className="pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        People
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Different fields, different countries, the same questions.
      </p>

      <div className="mt-14 space-y-14">
        {groups.map(({ role, people }) => (
          <section key={role}>
            <h2 className="text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
              {role}
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
              {people.map((person) => (
                <li key={person.slug}>
                  <Person person={person} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
