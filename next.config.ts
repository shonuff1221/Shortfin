import type { NextConfig } from "next";

// Base path by deploy target — no env needed for either:
//  - Local/gateway (nginx subpath /platform): default
//  - Vercel (root domain): VERCEL=1 is set automatically by the platform -> ""
// Override locally with BASE_PATH if ever needed.
const BASE = process.env.VERCEL
  ? ""
  : process.env.BASE_PATH ?? "/platform";

// Server-side API origin for the same-origin rewrites:
//  - Local: the brain API on the box (default)
//  - Vercel: set API_ORIGIN=https://<gateway-domain>/brain-api (nginx routes /brain-api -> :8890)
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8890";

const nextConfig: NextConfig = {
  basePath: BASE || undefined,
  assetPrefix: BASE || undefined,
  async rewrites() {
    // Same-origin API: browser calls <base>/api/* -> brain API (no CORS ever).
    // (Rewrite sources are auto-prefixed with basePath.)
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${API_ORIGIN}/health`,
      },
    ];
  },
};

export default nextConfig;
