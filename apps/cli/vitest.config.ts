import {
  defineWorkspaceTestConfig,
  sharedWorkerProjects,
} from "../../vitest.shared.js";

export default defineWorkspaceTestConfig({
  test: {
    silent: "passed-only",
    env: {
      CC_SERVER_URL: "http://127.0.0.1:49161",
      CC_HOST_DAEMON_PORT: "49162",
      CC_CLI_ERROR_LOG: "0",
    },
    projects: sharedWorkerProjects({
      pkgDir: __dirname,
      name: "@cc/cli",
      include: ["src/**/*.test.ts"],
    }),
  },
});
