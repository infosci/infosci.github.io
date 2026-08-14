import type { Metadata } from "next";
import PublicationsExplorer from "@/components/PublicationsExplorer";
import { getFacetData } from "@/lib/publication-facets";
import { getNetwork } from "@/lib/publication-network";

export const metadata: Metadata = { title: "Publications" };

export default function PublicationsPage() {
  const { papers, schemes } = getFacetData();
  const network = getNetwork();

  return (
    <div className="max-w-5xl pt-6 sm:pt-10">
      <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Publications
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Every paper has a shelf life. These are ours, newest first.
      </p>

      <div className="mt-8 max-w-3xl border-b border-zinc-200 dark:border-zinc-800" />

      <PublicationsExplorer papers={papers} schemes={schemes} network={network} />
    </div>
  );
}
