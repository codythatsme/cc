import { describe, expect, it } from "vitest";
import { withoutClaudeReporting } from "./privacy.js";

describe("Claude subprocess privacy", () => {
  it("overrides inherited opt-ins without changing authentication or model routing", () => {
    const inherited = {
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_BASE_URL: "https://provider.example",
      DISABLE_TELEMETRY: "",
      DISABLE_ERROR_REPORTING: "",
      DO_NOT_TRACK: "0",
      CLAUDE_CODE_ENABLE_TELEMETRY: "1",
      CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL: "1",
      OTEL_SDK_DISABLED: "false",
    };
    expect(withoutClaudeReporting(inherited)).toEqual({
      ...inherited,
      DISABLE_TELEMETRY: "1",
      DISABLE_ERROR_REPORTING: "1",
      DO_NOT_TRACK: "1",
      CLAUDE_CODE_ENABLE_TELEMETRY: "0",
      CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL: "0",
      OTEL_SDK_DISABLED: "true",
    });
    expect(inherited.CLAUDE_CODE_ENABLE_TELEMETRY).toBe("1");
  });
});
