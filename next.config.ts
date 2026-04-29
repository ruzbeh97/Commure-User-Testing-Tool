import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/**': ['./node_modules/better-sqlite3/build/Release/*.node'],
  },
};

export default nextConfig;
