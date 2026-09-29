import { realpathSync } from "node:fs";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CC_CLI_REEXEC_ENV, maybeReexecViaCcCli } from "../cc-cli-reexec.js";

describe("maybeReexecViaCcCli", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "cc-cli-reexec-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function writeExecutable(name: string): Promise<string> {
    const path = join(tempRoot, name);
    await writeFile(path, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    await chmod(path, 0o755);
    return path;
  }

  it("no-ops when CC_CLI is unset", () => {
    const reexec = vi.fn();
    maybeReexecViaCcCli({
      env: {},
      currentExecutablePath: "/tmp/current-cc",
      reexec,
    });
    expect(reexec).not.toHaveBeenCalled();
  });

  it("no-ops when CC_CLI equals the current executable", async () => {
    const path = await writeExecutable("cc");
    const reexec = vi.fn();
    maybeReexecViaCcCli({
      env: { CC_CLI: path },
      currentExecutablePath: path,
      reexec,
    });
    expect(reexec).not.toHaveBeenCalled();
  });

  it("no-ops when already in a re-exec hop", async () => {
    const current = await writeExecutable("current");
    const target = await writeExecutable("target");
    const reexec = vi.fn();
    maybeReexecViaCcCli({
      env: { CC_CLI: target, [CC_CLI_REEXEC_ENV]: "1" },
      currentExecutablePath: current,
      reexec,
    });
    expect(reexec).not.toHaveBeenCalled();
  });

  it("re-execs to CC_CLI when it differs from the current entry", async () => {
    const current = await writeExecutable("current");
    const target = await writeExecutable("target");
    const reexec = vi.fn();
    maybeReexecViaCcCli({
      env: { CC_CLI: target, CC_SERVER_URL: "http://127.0.0.1:1" },
      currentExecutablePath: current,
      argv: ["status", "--json"],
      reexec,
    });
    expect(reexec).toHaveBeenCalledOnce();
    expect(reexec.mock.calls[0]?.[0]).toEqual({
      target: realpathSync(target),
      argv: ["status", "--json"],
      env: expect.objectContaining({
        CC_CLI: target,
        CC_SERVER_URL: "http://127.0.0.1:1",
        [CC_CLI_REEXEC_ENV]: "1",
      }),
    });
  });

  it("no-ops when CC_CLI path is missing", async () => {
    const current = await writeExecutable("current");
    const reexec = vi.fn();
    maybeReexecViaCcCli({
      env: { CC_CLI: join(tempRoot, "does-not-exist") },
      currentExecutablePath: current,
      reexec,
    });
    expect(reexec).not.toHaveBeenCalled();
  });
});
