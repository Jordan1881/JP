import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@jp/shared-types", "@jp/backend"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
