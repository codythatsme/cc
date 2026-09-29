import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: "passed-only",
    name: "cc-plugin-custom-instructions",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
});
