import type { Metadata } from "next";
import projects from "@/data/projects.json";

export const metadata: Metadata = { title: "Projects" };

type Project = {
  id: string;
  title: string;
  terms: string[];
  duration: string | null;
  funder: string;
};

export default function ProjectsPage() {
  const items = projects as Project[];

  return (
    <div className="max-w-3xl pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Projects
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Funded research at DataLab.
      </p>

      <ul className="mt-14 space-y-10">
        {items.map((project) => (
          <li key={project.id}>
            <h2 className="max-w-2xl leading-snug font-medium text-black dark:text-zinc-50">
              {project.title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-500">
              {[project.duration, project.funder].filter(Boolean).join(" · ")}
            </p>
            {project.terms.length > 0 && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {project.terms.join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
