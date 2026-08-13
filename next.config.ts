import type { NextConfig } from "next";

// Static export: `next build` writes plain HTML/CSS/JS to out/, which is what
// GitHub Pages serves. No server, so no API routes, no middleware, no image
// optimization endpoint (hence images.unoptimized — photos are pre-sized by
// scripts/optimize-photos.mjs instead).
//
// BASE_PATH exists because the preview and the real site live at different
// depths: the preview is a project page under infosci.github.io/datalab-next/,
// while the live site is served at the root of datalab.yonsei.ac.kr. Every
// internal link and asset URL has to carry that prefix or the preview 404s, so
// it is set by the workflow rather than hardcoded — and is empty for production.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // GitHub Pages serves /people/ as /people/index.html; without this, exported
  // routes land as /people.html and every directory-style link 404s.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
