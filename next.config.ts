import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['libsql', '@libsql/client'],
};

export default nextConfig;
