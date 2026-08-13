// next/link prefixes basePath automatically. next/image does NOT — the Next
// docs are explicit that you must put basePath in front of `src` yourself
// (node_modules/next/dist/docs/.../basePath.md). Same for any raw <img>, <a
// href> or fetch() pointing at something in public/.
//
// Getting this wrong is silent: the build succeeds, the page renders, and every
// image 404s only once deployed under a subpath. It did exactly that on the
// first preview deploy — all 25 member photos were broken.
//
// Read at build time, which is when every page here is rendered (output:
// "export"), so no NEXT_PUBLIC_ prefix is required.
export const BASE_PATH = process.env.BASE_PATH ?? "";

/** Prefix a public/ asset path with basePath. Pass a root-relative path. */
export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
