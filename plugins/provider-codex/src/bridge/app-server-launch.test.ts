import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAppServerLaunch } from "./bridge.js";

afterEach(() => vi.unstubAllEnvs());

describe("Codex Account Pool launch", () => {
  it("adds an in-memory base URL and environment-backed hub header", () => {
    vi.stubEnv("CODEX_OPENAI_BASE_URL", "https://cc.example/pool/v1");
    vi.stubEnv("CODEX_POOL_AUTH_TOKEN", "secret-machine-token");
    const launch = resolveAppServerLaunch();
    expect(launch.command).toBe("codex");
    expect(launch.args).toContain(
      'openai_base_url="https://cc.example/pool/v1"',
    );
    expect(launch.args).toContain('model_provider="cc-account-pool"');
    expect(launch.args).toContain(
      'model_providers.cc-account-pool.env_http_headers.x-cc-account-pool-token="CODEX_POOL_AUTH_TOKEN"',
    );
    expect(launch.args).toContain(
      "model_providers.cc-account-pool.supports_websockets=false",
    );
    expect(JSON.stringify(launch.args)).not.toContain("secret-machine-token");
  });

  it("leaves Codex's default transport alone when the pool is not routed", () => {
    const launch = resolveAppServerLaunch({});
    expect(launch).toEqual({
      command: "codex",
      args: [
        "app-server",
        "-c",
        "analytics.enabled=false",
        "-c",
        'otel.exporter="none"',
        "-c",
        'otel.trace_exporter="none"',
        "-c",
        'otel.metrics_exporter="none"',
      ],
    });
    expect(JSON.stringify(launch.args)).not.toContain("supports_websockets");
  });

  it("does not partially route when either required variable is missing", () => {
    vi.stubEnv("CODEX_OPENAI_BASE_URL", "https://cc.example/pool/v1");
    expect(resolveAppServerLaunch()).toEqual({
      command: "codex",
      args: [
        "app-server",
        "-c",
        "analytics.enabled=false",
        "-c",
        'otel.exporter="none"',
        "-c",
        'otel.trace_exporter="none"',
        "-c",
        'otel.metrics_exporter="none"',
      ],
    });
  });
});

describe("Codex Account Pool isolation", () => {
  it.each([
    { label: "base URL", env: { CODEX_OPENAI_BASE_URL: "" } },
    { label: "hub token", env: { CODEX_POOL_AUTH_TOKEN: "" } },
    {
      label: "both values",
      env: { CODEX_OPENAI_BASE_URL: "", CODEX_POOL_AUTH_TOKEN: "" },
    },
  ])(
    "drops pool routing when an inherited $label is neutralised with an empty value",
    (args) => {
      const launch = resolveAppServerLaunch({
        CODEX_OPENAI_BASE_URL: "https://parent.example/pool/v1",
        CODEX_POOL_AUTH_TOKEN: "inherited-parent-token",
        ...args.env,
      });
      expect(launch).toEqual({
        command: "codex",
        args: [
          "app-server",
          "-c",
          "analytics.enabled=false",
          "-c",
          'otel.exporter="none"',
          "-c",
          'otel.trace_exporter="none"',
          "-c",
          'otel.metrics_exporter="none"',
        ],
      });
      expect(JSON.stringify(launch.args)).not.toContain("parent.example");
      expect(JSON.stringify(launch.args)).not.toContain(
        "inherited-parent-token",
      );
    },
  );
});

it("overrides inherited analytics configuration for custom app-server launches", () => {
  const launch = resolveAppServerLaunch({
    CC_CODEX_BRIDGE_APP_SERVER_COMMAND: "custom-codex",
    CC_CODEX_BRIDGE_APP_SERVER_ARGS: JSON.stringify([
      "app-server",
      "-c",
      "analytics.enabled=true",
    ]),
  });
  expect(launch.args.lastIndexOf("analytics.enabled=false")).toBeGreaterThan(
    launch.args.indexOf("analytics.enabled=true"),
  );
  expect(launch.args).toContain('otel.exporter="none"');
  expect(launch.args).toContain('otel.trace_exporter="none"');
  expect(launch.args).toContain('otel.metrics_exporter="none"');
});
