import { describe, expect, it } from "vitest";
import {
  buildDesktopServerChoices,
  customServerId,
} from "../src/server-list.js";
import {
  BUILTIN_SERVER_NAME,
  createServerTargetStore,
} from "../src/server-target.js";

const LOCAL_URL = "http://127.0.0.1:38886";

function createStore() {
  return createServerTargetStore({
    storagePath: "/test/server-target.json",
    fs: {
      mkdir: async () => undefined,
      readFile: async () => "",
      writeFile: async () => undefined,
    },
  });
}

describe("buildDesktopServerChoices", () => {
  it("lists each account server once by hostname after adopting saved custom URLs", async () => {
    const store = createStore();
    const servers = [
      { handle: "brsbl", name: "default", url: "https://brsbl.cc.example.invalid" },
      {
        handle: "brsbl-bbox",
        name: "brsbl-bbox",
        url: "https://brsbl-bbox.cc.example.invalid",
      },
    ];
    await store.setConnectServer(servers[0]);
    await store.setCustomServerUrl("https://brsbl.cc.example.invalid");
    await store.setCustomServerUrl("https://brsbl-bbox.cc.example.invalid");
    await store.setCustomServerUrl("https://cc.example.com/team");

    await store.adoptConnectServers(servers);

    expect(buildDesktopServerChoices(store, servers, LOCAL_URL)).toEqual([
      {
        id: "builtin",
        name: BUILTIN_SERVER_NAME,
        origin: LOCAL_URL,
        kind: "local",
        active: false,
      },
      {
        id: "connect:brsbl",
        name: "brsbl.cc.example.invalid",
        origin: "https://brsbl.cc.example.invalid",
        kind: "account",
        active: false,
      },
      {
        id: "connect:brsbl-bbox",
        name: "brsbl-bbox.cc.example.invalid",
        origin: "https://brsbl-bbox.cc.example.invalid",
        kind: "account",
        active: false,
      },
      {
        id: customServerId("https://cc.example.com/team"),
        name: "cc.example.com",
        origin: "https://cc.example.com",
        kind: "custom",
        active: true,
      },
    ]);
  });

  it("labels account servers by their saved name, keeping a renamed custom URL's name", async () => {
    const store = createStore();
    const servers = [
      { handle: "brsbl", name: "default", url: "https://brsbl.cc.example.invalid" },
      {
        handle: "brsbl-bbox",
        name: "brsbl-bbox",
        url: "https://brsbl-bbox.cc.example.invalid",
      },
    ];
    await store.setCustomServerUrl("https://brsbl-bbox.cc.example.invalid", {
      name: "Devbox",
    });
    await store.setConnectServerName("brsbl", "  Studio   Mac ");

    await store.adoptConnectServers(servers);

    expect(buildDesktopServerChoices(store, servers, LOCAL_URL)).toEqual([
      {
        id: "builtin",
        name: BUILTIN_SERVER_NAME,
        origin: LOCAL_URL,
        kind: "local",
        active: false,
      },
      {
        id: "connect:brsbl",
        name: "Studio Mac",
        origin: "https://brsbl.cc.example.invalid",
        kind: "account",
        active: false,
      },
      {
        id: "connect:brsbl-bbox",
        name: "Devbox",
        origin: "https://brsbl-bbox.cc.example.invalid",
        kind: "account",
        active: true,
      },
    ]);

    await store.setConnectServerName("brsbl-bbox", null);
    expect(buildDesktopServerChoices(store, servers, LOCAL_URL)[2]).toEqual({
      id: "connect:brsbl-bbox",
      name: "brsbl-bbox.cc.example.invalid",
      origin: "https://brsbl-bbox.cc.example.invalid",
      kind: "account",
      active: true,
    });
  });
});
