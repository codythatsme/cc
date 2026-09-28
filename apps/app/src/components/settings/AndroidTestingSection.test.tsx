// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sdk } from "@/lib/sdk";
import { AndroidTestingSection } from "./AndroidTestingSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function renderSection() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AndroidTestingSection />
    </QueryClientProvider>,
  );
}
it("offers the published version and an APK download", async () => {
  vi.spyOn(sdk.system, "androidApp").mockResolvedValue({
    version: "0.39.0",
    versionCode: 17,
    size: 1024,
    sha256: "a".repeat(64),
  });
  renderSection();
  const link = await screen.findByRole("link", { name: "Download APK" });
  expect(link.getAttribute("href")).toBe("/install/bb-android.apk");
  expect(screen.getByText(/Version 0.39.0 · Build 17/)).toBeTruthy();
});
it("does not offer a broken download for a missing build", async () => {
  vi.spyOn(sdk.system, "androidApp").mockResolvedValue(null);
  renderSection();
  await screen.findByText("No Android test build has been published yet.");
  expect(screen.queryByRole("link")).toBeNull();
});
it("offers retry after a metadata request fails", async () => {
  vi.spyOn(sdk.system, "androidApp").mockRejectedValue(new Error("offline"));
  renderSection();
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});
