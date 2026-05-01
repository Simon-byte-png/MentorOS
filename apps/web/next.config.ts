import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@mentoros/ai",
    "@mentoros/db",
    "@mentoros/agents",
    "@mentoros/evals",
    "@mentoros/shared"
  ]
};

export default nextConfig;
