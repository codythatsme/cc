import { describe, expect, it } from "vitest";
import { getFilePreviewLeaseBaseUrl } from "./file-content-urls";

describe("getFilePreviewLeaseBaseUrl", () => {
  it.each([
    [
      "/api/v1/file-previews/lease-1/readme.md",
      "/api/v1/file-previews/lease-1",
    ],
    [
      "https://cc.test/api/v1/file-previews/lease-2/docs/readme.md",
      "https://cc.test/api/v1/file-previews/lease-2",
    ],
    ["/workspace/file-previews/not-a-lease/readme.md", null],
  ])("extracts only a file-preview API lease from %s", (url, expected) => {
    expect(getFilePreviewLeaseBaseUrl(url)).toBe(expected);
  });
});
