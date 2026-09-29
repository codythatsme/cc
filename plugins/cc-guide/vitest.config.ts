import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: "passed-only",
    name: "cc-plugin-cc-guide",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
});
