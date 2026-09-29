import {
  defineWorkspaceTestConfig,
  sharedWorkerProjects,
} from "../../vitest.shared.js";

export default defineWorkspaceTestConfig({
  test: {
    silent: "passed-only",
    env: {
      CC_DATA_DIR: "/tmp/cc-host-daemon-test",
      CC_SERVER_URL: "http://127.0.0.1:49161",
      CC_HOST_DAEMON_PORT: "49162",
    },
    testTimeout: 15_000,
    projects: sharedWorkerProjects({
      pkgDir: __dirname,
      name: "@cc/host-daemon",
      include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    }),
  },
});
