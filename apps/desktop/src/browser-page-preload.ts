import { contextBridge, ipcRenderer } from "electron";
import {
  CC_DESKTOP_BROWSER_GUEST_MESSAGE_CHANNEL,
  CC_DESKTOP_BROWSER_PAGE_BRIDGE_KEY,
  CC_DESKTOP_BROWSER_PAGE_WORLD_ID,
} from "./desktop-browser-ipc.js";

contextBridge.exposeInIsolatedWorld(
  CC_DESKTOP_BROWSER_PAGE_WORLD_ID,
  CC_DESKTOP_BROWSER_PAGE_BRIDGE_KEY,
  {
    postMessage(channel: unknown, data: unknown): void {
      ipcRenderer.send(CC_DESKTOP_BROWSER_GUEST_MESSAGE_CHANNEL, {
        channel,
        data,
      });
    },
  },
);
