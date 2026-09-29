import { describe, expect, it } from "vitest";
import { threadScope } from "../src/thread-event-scope.js";
import type { ThreadEvent } from "../src/provider-event.js";
import {
  fromProviderExternalThreadName,
  normalizeProviderThreadNameEvent,
  toProviderExternalThreadName,
} from "../src/thread-name-tags.js";

describe("thread name tags", () => {
  it("round-trips user-provided literal cc-prefixed titles", () => {
    const providerName = toProviderExternalThreadName("[cc] Literal");

    expect(providerName).toBe("[cc] [cc] Literal");
    expect(fromProviderExternalThreadName(providerName)).toBe("[cc] Literal");
  });

  it("normalizes provider title events by stripping one cc tag", () => {
    const event = {
      type: "thread/name/updated",
      threadId: "t1",
      providerThreadId: "p1",
      scope: threadScope(),
      threadName: toProviderExternalThreadName("[cc] Literal"),
    } satisfies ThreadEvent;

    expect(normalizeProviderThreadNameEvent(event)).toEqual({
      ...event,
      threadName: "[cc] Literal",
    });
  });
});
