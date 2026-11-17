import { defineWorkspaceTestConfig } from "../../vitest.shared.js";

export default defineWorkspaceTestConfig({
  test: {
    name: "@cc/render-invariants",
    include: ["src/**/*.test.ts"],
    globalSetup: ["../integration/global-setup.ts"],
    fileParallelism: true,
    maxWorkers: 3,
    hookTimeout: 240_000,
    testTimeout: 90_000,
    env: {
      CC_DATA_DIR: "/tmp/cc-render-invariants-test",
      CC_SERVER_PORT: "49171",
      CC_SERVER_URL: "http://127.0.0.1:49171",
      CC_HOST_DAEMON_PORT: "49172",
    },
  },
});
