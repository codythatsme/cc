import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DESKTOP_DOWNLOADS,
  DOWNLOAD_FALLBACK_URL,
  DOWNLOAD_RELEASE_ASSET_BASE_URL,
} from "./site";
import { handleDownload, handleSubscribe } from "./endpoints";

describe("marketing download redirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redirects macOS downloads to the current dmg asset", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          files: [
            { url: "cc-0.0.26-arm64.zip" },
            { url: "cc-0.0.26-arm64.dmg" },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleDownload("macos");

    expect(fetchMock).toHaveBeenCalledWith(
      DESKTOP_DOWNLOADS.macos.versionFeedUrl,
      { headers: { accept: "application/json" } },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${DOWNLOAD_RELEASE_ASSET_BASE_URL}/cc-0.0.26-arm64.dmg`,
    );
  });

  it("redirects Linux downloads to the AppImage from the Linux feed", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          files: [
            { url: "cc-0.42.1-x86_64.AppImage" },
            { url: "cc-0.42.1-x86_64.AppImage.blockmap" },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleDownload("linux");

    expect(fetchMock).toHaveBeenCalledWith(
      DESKTOP_DOWNLOADS.linux.versionFeedUrl,
      { headers: { accept: "application/json" } },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${DOWNLOAD_RELEASE_ASSET_BASE_URL}/cc-0.42.1-x86_64.AppImage`,
    );
  });

  it("never serves a macOS installer for a Linux request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ files: [{ url: "cc-0.42.1-arm64.dmg" }] }),
        );
      }),
    );

    const response = await handleDownload("linux");

    expect(response.headers.get("Location")).toBe(DOWNLOAD_FALLBACK_URL);
  });

  it("falls back to the release page when the feed has no dmg", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ files: [{ url: "notes.txt" }] }));
      }),
    );

    const response = await handleDownload("macos");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(DOWNLOAD_FALLBACK_URL);
  });

  it("only fetches the release feed when downloading", async () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleDownload("linux");

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      DESKTOP_DOWNLOADS.linux.versionFeedUrl,
      { headers: { accept: "application/json" } },
    );
    expect(response.headers.get("Location")).toBe(DOWNLOAD_FALLBACK_URL);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("marketing subscribe endpoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function subscribeRequest(email: unknown): Request {
    return new Request("https://cc.example.invalid/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  it("reports not-configured without Resend credentials", async () => {
    const response = await handleSubscribe(subscribeRequest("a@b.co"), {});
    expect(response.status).toBe(503);
  });

  it("adds a valid email to the Resend audience", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleSubscribe(subscribeRequest("a@b.co"), {
      RESEND_API_KEY: "re_test",
      RESEND_AUDIENCE_ID: "aud_test",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/audiences/aud_test/contacts",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects malformed emails without calling Resend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleSubscribe(subscribeRequest("not-an-email"), {
      RESEND_API_KEY: "re_test",
      RESEND_AUDIENCE_ID: "aud_test",
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
