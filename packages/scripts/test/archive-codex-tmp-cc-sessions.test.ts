import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildMatchingThreadIdsSql,
  buildMatchingThreadPreviewSql,
  escapeSqlString,
  parseArchiveTmpCcSessionsArgs,
  parseThreadPreviewRows,
  renderHelpText,
  resolveCodexStateDbPath,
} from "../src/commands/archive-codex-tmp-cc-sessions.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { force: true, recursive: true });
  }
});

describe("archive-codex-tmp-cc-sessions", () => {
  it("defaults to archiving cc test temp dirs from ~/.codex", () => {
    const parsedArgs = parseArchiveTmpCcSessionsArgs(
      [],
      { CODEX_BIN: "/custom/codex" },
      "/Users/tester",
    );

    expect(parsedArgs.help).toBe(false);
    expect(parsedArgs.options).toEqual({
      codexBin: "/custom/codex",
      codexHome: path.join("/Users/tester", ".codex"),
      concurrency: 25,
      dryRun: false,
      patterns: [
        "*/cc-standalone-*",
        "*/cc-integration-*",
        "*/cc-integ-*",
        "*/cc-qa-smoke-*",
      ],
      yes: false,
    });
  });

  it("respects CODEX_HOME when choosing the default Codex state directory", () => {
    const parsedArgs = parseArchiveTmpCcSessionsArgs(
      [],
      { CODEX_HOME: "~/custom-codex" },
      "/Users/tester",
    );

    expect(parsedArgs.options.codexHome).toBe(
      path.join("/Users/tester", "custom-codex"),
    );
  });

  it("parses explicit cleanup options", () => {
    const parsedArgs = parseArchiveTmpCcSessionsArgs(
      [
        "--",
        "--dry-run",
        "--yes",
        "--pattern",
        "/tmp/custom-cc-*",
        "--codex-home=~/custom-codex",
        "--codex-bin",
        "~/bin/codex",
        "--concurrency=7",
      ],
      {},
      "/Users/tester",
    );

    expect(parsedArgs.options).toEqual({
      codexBin: path.join("/Users/tester", "bin", "codex"),
      codexHome: path.join("/Users/tester", "custom-codex"),
      concurrency: 7,
      dryRun: true,
      patterns: ["/tmp/custom-cc-*"],
      yes: true,
    });
  });

  it("accumulates repeated --pattern flags and replaces the defaults", () => {
    const parsedArgs = parseArchiveTmpCcSessionsArgs(
      ["--pattern", "*/cc-foo-*", "--pattern=*/cc-bar-*"],
      {},
      "/Users/tester",
    );

    expect(parsedArgs.options.patterns).toEqual(["*/cc-foo-*", "*/cc-bar-*"]);
  });

  it("rejects unknown or incomplete options", () => {
    expect(() => parseArchiveTmpCcSessionsArgs(["--wat"], {}, "/tmp")).toThrow(
      "Unknown option: --wat",
    );
    expect(() =>
      parseArchiveTmpCcSessionsArgs(["--pattern"], {}, "/tmp"),
    ).toThrow("Missing value for --pattern");
    expect(() =>
      parseArchiveTmpCcSessionsArgs(["--concurrency", "0"], {}, "/tmp"),
    ).toThrow("--concurrency must be a positive integer");
  });

  it("documents the command and default pattern", () => {
    const help = renderHelpText();
    expect(help).toContain("pnpm codex:archive-tmp-cc-sessions");
    expect(help).toContain("*/cc-standalone-*");
    expect(help).toContain("*/cc-integration-*");
    expect(help).toContain("*/cc-integ-*");
    expect(help).toContain("*/cc-qa-smoke-*");
    expect(help).toContain("repeatable");
    expect(help).toContain("state_<n>.sqlite");
  });

  it("resolves the highest numbered Codex state DB", () => {
    const codexHome = mkdtempSync(path.join(os.tmpdir(), "codex-home-"));
    tempDirs.push(codexHome);
    writeFileSync(path.join(codexHome, "state_4.sqlite"), "");
    writeFileSync(path.join(codexHome, "state_4.sqlite-wal"), "");
    writeFileSync(path.join(codexHome, "state_5.sqlite"), "");
    writeFileSync(path.join(codexHome, "state_5.sqlite.backup-old"), "");

    expect(resolveCodexStateDbPath(codexHome)).toBe(
      path.join(codexHome, "state_5.sqlite"),
    );
  });

  it("reports when no Codex state DB exists", () => {
    const codexHome = mkdtempSync(path.join(os.tmpdir(), "codex-home-"));
    tempDirs.push(codexHome);

    expect(() => resolveCodexStateDbPath(codexHome)).toThrow(
      `No Codex state DB found in ${codexHome}`,
    );
  });

  it("escapes SQLite string values used in generated queries", () => {
    expect(escapeSqlString("/tmp/cc-o'clock-*")).toBe("/tmp/cc-o''clock-*");
    expect(buildMatchingThreadIdsSql(["/tmp/cc-o'clock-*"])).toContain(
      "archived=0 AND (cwd GLOB '/tmp/cc-o''clock-*')",
    );
    expect(buildMatchingThreadPreviewSql(["/tmp/cc-*"])).toContain(
      "ORDER BY updated_at DESC LIMIT 10",
    );
  });

  it("ORs multiple GLOB patterns in the WHERE clause", () => {
    const sql = buildMatchingThreadIdsSql([
      "*/cc-standalone-*",
      "*/cc-integration-*",
      "*/cc-integ-*",
    ]);
    expect(sql).toContain(
      "archived=0 AND (cwd GLOB '*/cc-standalone-*' OR cwd GLOB '*/cc-integration-*' OR cwd GLOB '*/cc-integ-*')",
    );
  });

  it("parses sqlite preview rows", () => {
    const separator = "\u001f";
    const rows = parseThreadPreviewRows(
      [
        ["thr_1", "2026-04-15 13:40:15", "/tmp/cc-integ-one"].join(separator),
        ["thr_2", "2026-04-15 13:39:51", "/tmp/cc-integration-two"].join(
          separator,
        ),
      ].join("\n"),
    );

    expect(rows).toEqual([
      {
        cwd: "/tmp/cc-integ-one",
        id: "thr_1",
        updatedAt: "2026-04-15 13:40:15",
      },
      {
        cwd: "/tmp/cc-integration-two",
        id: "thr_2",
        updatedAt: "2026-04-15 13:39:51",
      },
    ]);
  });
});
