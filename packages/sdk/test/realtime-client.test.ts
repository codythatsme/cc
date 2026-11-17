import { expect, it, vi } from "vitest";
import { createCcSdk } from "../src/core.js";
import { createHttpTransport } from "../src/transport-http.js";
import type { CcRealtimeSocket } from "../src/transport.js";

it("closes a failing socket once even when close reports another error", () => {
  let closes = 0;
  const sockets: CcRealtimeSocket[] = [];
  const sdk = createCcSdk({
    transport: createHttpTransport({
      baseUrl: "http://cc.test",
      runtime: "node",
      websocket: () => {
        const socket: CcRealtimeSocket = {
          close() {
            closes += 1;
            socket.onerror?.();
          },
          onclose: null,
          onerror: null,
          onmessage: null,
          onopen: null,
          readyState: 0,
          send() {},
        };
        sockets.push(socket);
        return socket;
      },
    }),
  });

  const unsubscribe = sdk.subscribe({
    event: "thread:changed",
    callback: () => {},
  });
  const [socket] = sockets;
  expect(socket).toBeDefined();
  expect(() => socket?.onerror?.()).not.toThrow();
  expect(closes).toBe(1);
  unsubscribe();
});

it("reconnects after a first connection fails without a close event", async () => {
  vi.useFakeTimers();
  try {
    const sockets: CcRealtimeSocket[] = [];
    const sdk = createCcSdk({
      transport: createHttpTransport({
        baseUrl: "http://cc.test",
        runtime: "node",
        websocket: () => {
          const socket: CcRealtimeSocket = {
            close() {},
            onclose: null,
            onerror: null,
            onmessage: null,
            onopen: null,
            readyState: 0,
            send() {},
          };
          sockets.push(socket);
          return socket;
        },
      }),
    });

    const unsubscribe = sdk.subscribe({
      event: "thread:changed",
      callback: () => {},
    });
    expect(sockets).toHaveLength(1);
    sockets[0]?.onerror?.();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets.length).toBeGreaterThan(1);
    unsubscribe();
  } finally {
    vi.useRealTimers();
  }
});
