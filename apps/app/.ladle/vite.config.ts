import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolveCurrentDevInstanceConfig } from "@cc/config/runtime";
import { forkablePluginPaths } from "../vite-forkable-plugin-paths.js";
import { sharedUiEnvSeam } from "../vite-shared-ui-seam.js";

const repoRoot = path.resolve(__dirname, "../../..");
const devInstance = resolveCurrentDevInstanceConfig(repoRoot);
const trustedDevAppHeaders = {
  origin: devInstance.serverUrl,
};

export default defineConfig({
  plugins: [
    forkablePluginPaths(path.resolve(__dirname, "../src")),
    sharedUiEnvSeam(),
    tailwindcss(),
  ],
  cacheDir: "node_modules/.vite/ladle",
  worker: {
    format: "es",
  },
  resolve: {
    conditions: ["source"],
    dedupe: ["react", "react-dom"],
    alias: {
      "@codythatsme/plugin-sdk/app": path.resolve(__dirname, "./plugin-sdk-app.ts"),
      "@": path.resolve(__dirname, "../src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        "process.env.NODE_ENV": '"development"',
      },
    },
  },
  server: {
    allowedHosts: [".cc.example.invalid"],
    proxy: {
      "/api": {
        target: devInstance.serverUrl,
        changeOrigin: true,
        headers: trustedDevAppHeaders,
      },
      "/ws": {
        target: devInstance.serverUrl,
        changeOrigin: true,
        ws: true,
        headers: trustedDevAppHeaders,
      },
    },
  },
});
