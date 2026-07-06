import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Monorepo: load .env.local from repo root (where Cognito + Anthropic keys live)
loadEnvConfig(join(dirname(fileURLToPath(import.meta.url)), ".."));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@jp/shared-types"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
