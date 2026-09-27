import type { NextConfig } from "next";

// TANIA is a pure static export (CLAUDE.md §1): no SSR, API routes, server
// actions or middleware. `npm run build` must emit `out/`.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
