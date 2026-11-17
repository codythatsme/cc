// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppTheme } from "@cc/domain";
import {
  FAVICON_COLOR_STORAGE_KEY,
  useFaviconColorSync,
} from "./favicon-color-preference";

const mocks = vi.hoisted(() => ({
  useSystemConfig: vi.fn(),
}));

vi.mock("@/hooks/queries/system-queries", () => ({
  useSystemConfig: mocks.useSystemConfig,
}));

function setSystemFaviconColor(
  faviconColor: typeof defaultAppTheme.faviconColor,
): void {
  mocks.useSystemConfig.mockReturnValue({
    data: {
      appearance: {
        ...defaultAppTheme,
        faviconColor,
      },
    },
  });
}

describe("favicon color server sync", () => {
  afterEach(() => {
    window.localStorage.clear();
    cleanup();
    vi.clearAllMocks();
  });

  it("mirrors the server tint into the first-paint cache", async () => {
    window.localStorage.setItem(FAVICON_COLOR_STORAGE_KEY, "teal");
    setSystemFaviconColor("purple");
    const { rerender } = renderHook(() => useFaviconColorSync());

    await waitFor(() =>
      expect(window.localStorage.getItem(FAVICON_COLOR_STORAGE_KEY)).toBe(
        "purple",
      ),
    );

    setSystemFaviconColor("default");
    rerender();

    await waitFor(() =>
      expect(window.localStorage.getItem(FAVICON_COLOR_STORAGE_KEY)).toBeNull(),
    );
  });
});

describe("favicon rendering", () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => null,
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: originalGetContext,
    });
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function stubDisplayMode(standalone: boolean): void {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(display-mode: standalone)" ? standalone : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    );
  }

  class FakeImage {
    static created = 0;
    static sources: string[] = [];
    naturalWidth = 32;
    naturalHeight = 32;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      FakeImage.created += 1;
      FakeImage.sources.push(value);
      queueMicrotask(() => this.onload?.());
    }
  }

  async function loadFreshModule() {
    return import("./favicon-color-preference");
  }

  it("places the chosen color behind the carbon mark without flattening its shading", async () => {
    stubDisplayMode(false);
    window.localStorage.setItem(FAVICON_COLOR_STORAGE_KEY, "blue");
    FakeImage.sources = [];
    vi.stubGlobal("Image", FakeImage);
    const compositingModes: string[] = [];
    const fillColors: string[] = [];
    const context = {
      drawImage: vi.fn(),
      globalCompositeOperation: "source-over",
      fillStyle: "",
      fillRect: () => {
        compositingModes.push(context.globalCompositeOperation);
        fillColors.push(context.fillStyle);
      },
    };
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => context,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,rendered-icon",
    );
    const module = await loadFreshModule();
    module.initializeFavicon();

    await waitFor(() => expect(context.drawImage).toHaveBeenCalledTimes(2));
    expect(compositingModes).toEqual(["destination-over", "destination-over"]);
    expect(fillColors).toEqual(["#0090ff", "#0090ff"]);
    expect(FakeImage.sources).toEqual([
      "/favicon-32x32.png",
      "/favicon-16x16.png",
    ]);
  });

  it("decodes each base glyph once across badge flips", async () => {
    stubDisplayMode(false);
    FakeImage.created = 0;
    vi.stubGlobal("Image", FakeImage);
    const module = await loadFreshModule();
    module.initializeFavicon();

    const initialProps: { badge: "none" | "unread" } = { badge: "unread" };
    const { rerender, unmount } = renderHook(
      ({ badge }: { badge: "none" | "unread" }) =>
        module.useFaviconBadge(badge),
      { initialProps },
    );
    await waitFor(() => expect(FakeImage.created).toBe(2));

    rerender({ badge: "none" });
    rerender({ badge: "unread" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(FakeImage.created).toBe(2);
    unmount();
  });

  it("skips favicon image work in standalone display mode", async () => {
    stubDisplayMode(true);
    FakeImage.created = 0;
    vi.stubGlobal("Image", FakeImage);
    const module = await loadFreshModule();
    module.initializeFavicon();

    const { unmount } = renderHook(() => module.useFaviconBadge("unread"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(FakeImage.created).toBe(0);
    unmount();
  });
});
