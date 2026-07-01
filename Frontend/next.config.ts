import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@jp/shared-types", "@jp/backend"],
};

export default nextConfig;
