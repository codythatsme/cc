import {
  defineWorkspaceTestConfig,
  sharedWorkerProjects,
} from "../../vitest.shared.js";

export default defineWorkspaceTestConfig({
  test: {
    silent: "passed-only",
    server: {
      deps: {
        external: [
          /\.(?:builtin-host|host-build-bridge)-test-[^/]+\/dist\/host\.js/u,
        ],
      },
    },
    projects: sharedWorkerProjects({
      pkgDir: __dirname,
      name: "@cc/plugin-build",
      include: ["src/**/*.test.ts"],
    }),
  },
});
