import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./worker/security-headers";

const nextConfig: NextConfig = {
  // The Cloudflare Worker adds these headers itself; hosts without it, such as
  // Vercel, depend on this list.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
