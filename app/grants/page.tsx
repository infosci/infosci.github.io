import type { Metadata } from "next";
import grants from "@/data/grants.json";

export const metadata: Metadata = { title: "Grants" };

type Grant = {
  id: string;
  title: string;
  duration: string | null;
  funder: string;
};

/** "2023 - 2026" to its two years. Null duration sorts last and counts as ended. */
function years(duration: string | null) {
  const m = duration?.match(/(\d{4})\s*-\s*(\d{4})/);
  return m ? { from: Number(m[1]), to: Number(m[2]) } : { from: 0, to: 0 };
}

// Newest first, by start year and then by end year, rather than by whatever
// order the records happen to sit in the file. Two 2019 grants were the wrong
// way round, and without this the next grant added lands wherever it was
// inserted instead of at the top.
function ordered(items: Grant[]) {
  return [...items].sort((a, b) => {
    const x = years(a.duration);
    const y = years(b.duration);
    return y.from - x.from || y.to - x.to;
  });
}

export default function GrantsPage() {
  // Whether a grant is still running is decided at build time, since the site
  // is a static export and there is no request to decide it at. A grant ending
  // this year therefore keeps saying "Active" until the next deploy. That is
  // accurate to within one deploy, and this site deploys on every push.
  const thisYear = new Date().getFullYear();
  const items = ordered(grants as Grant[]);

  return (
    <div className="max-w-3xl pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Grants
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Some years we&rsquo;re full, some years we&rsquo;re hungry. The work carries on either
        way.
      </p>

      <ul className="mt-14 space-y-10">
        {items.map((grant) => {
          // Mark the running ones rather than the finished ones: only two of
          // five are live, so this is the quieter mark, and "is this lab funded
          // now" is the question a reader actually arrives with.
          const active = years(grant.duration).to >= thisYear;
          return (
            <li key={grant.id}>
              <h2 className="max-w-2xl leading-snug font-medium text-black dark:text-zinc-50">
                {grant.title}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {[grant.duration, grant.funder].filter(Boolean).join(" · ")}
                {active && (
                  <>
                    {" · "}
                    <span className="text-black dark:text-zinc-200">Active</span>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
