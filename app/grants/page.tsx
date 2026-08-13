import type { Metadata } from "next";
import grants from "@/data/grants.json";

export const metadata: Metadata = { title: "Grants" };

type Grant = {
  id: string;
  title: string;
  duration: string | null;
  funder: string;
};

export default function GrantsPage() {
  const items = grants as Grant[];

  return (
    <div className="max-w-3xl pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Grants
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Funded research led at DataLab.
      </p>

      <ul className="mt-14 space-y-10">
        {items.map((grant) => (
          <li key={grant.id}>
            <h2 className="max-w-2xl leading-snug font-medium text-black dark:text-zinc-50">
              {grant.title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-500">
              {[grant.duration, grant.funder].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
