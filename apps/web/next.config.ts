import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true
  },
  transpilePackages: ["@learn-bot/ai-contracts", "@learn-bot/core", "@learn-bot/domain-packs", "@learn-bot/ui"]
};

export default nextConfig;
