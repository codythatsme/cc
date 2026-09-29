export function withoutClaudeReporting(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return {
    ...env,
    DISABLE_TELEMETRY: "1",
    DISABLE_ERROR_REPORTING: "1",
    DO_NOT_TRACK: "1",
    CLAUDE_CODE_ENABLE_TELEMETRY: "0",
    CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL: "0",
    OTEL_SDK_DISABLED: "true",
  };
}
