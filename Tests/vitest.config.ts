import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@frontend": resolve(root, "Frontend"),
      "@backend": resolve(root, "Backend/src"),
    },
  },
  test: {
    include: ["Frontend/**/*.test.ts", "Backend/**/*.test.ts"],
    environment: "node",
  },
});
