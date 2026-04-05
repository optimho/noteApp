import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bun:sqlite"],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "bun:sqlite",
      ];
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      "bun:sqlite": "bun:sqlite",
    },
  },
};

export default nextConfig;
