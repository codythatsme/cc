import { afterEach, describe, expect, it, vi } from "vitest";
import { createCliCcSdk } from "../client.js";

describe("createCliCcSdk", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    { threadId: "thr_caller", callerHeader: "thr_caller" },
    { threadId: undefined, callerHeader: null },
  ])(
    "marks requests as CLI requests with caller thread $callerHeader",
    async ({ threadId, callerHeader }) => {
      vi.stubEnv("CC_THREAD_ID", threadId);
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          new Response(JSON.stringify({ ok: true, archivedThreadIds: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await createCliCcSdk("http://server").threads.archive({
        threadId: "thr_target",
      });

      const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
      expect(headers.get("x-cc-cli")).toBe("1");
      expect(headers.get("x-cc-caller-thread")).toBe(callerHeader);
    },
  );
});
