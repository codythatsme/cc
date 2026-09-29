// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  clearLegacyLocalUiPreference,
  readLegacyLocalUiPreference,
} from "./legacy-local-preferences";

function seed(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

describe("legacy local ui preferences", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns undefined when nothing was stored and drops invalid values", () => {
    expect(
      readLegacyLocalUiPreference("sidebar.organizationMode"),
    ).toBeUndefined();
    seed("cc.sidebar.organizationMode", "by-color");
    expect(
      readLegacyLocalUiPreference("sidebar.organizationMode"),
    ).toBeUndefined();
    window.localStorage.setItem("cc.sidebar.collapsedProjects", "{not json");
    expect(
      readLegacyLocalUiPreference("sidebar.collapsedProjects"),
    ).toBeUndefined();
    seed("cc.sidebar.collapsedThreads", ["thr_a", 2]);
    expect(
      readLegacyLocalUiPreference("sidebar.collapsedThreads"),
    ).toBeUndefined();
  });

  it("reads values from their old browser keys", () => {
    seed("cc.sidebar.organizationMode", "machine");
    seed("cc.sidebar.collapsedThreads", ["thr_a", "thr_b"]);
    seed("cc.sidebar.navigationProvider", "docs/main");
    seed("cc.sidebar.visiblePluginPanels", ["docs/main"]);
    expect(readLegacyLocalUiPreference("sidebar.organizationMode")).toBe(
      "machine",
    );
    expect(readLegacyLocalUiPreference("sidebar.collapsedThreads")).toEqual([
      "thr_a",
      "thr_b",
    ]);
    expect(readLegacyLocalUiPreference("sidebar.navigationProvider")).toBe(
      "docs/main",
    );
    expect(readLegacyLocalUiPreference("sidebar.visiblePluginPanels")).toEqual([
      "docs/main",
    ]);
  });

  it("ignores retired folder-era and hidden-panel keys", () => {
    seed("cc.sidebar.folderSectionOrder", ["pinned", "folders"]);
    seed("cc.sidebar.collapsedFolders", ["proj_1::sec_1"]);
    seed("cc.sidebar.hiddenPluginPanels", ["docs/main"]);
    expect(
      readLegacyLocalUiPreference("sidebar.manualSectionOrder"),
    ).toBeUndefined();
    expect(
      readLegacyLocalUiPreference("sidebar.collapsedThreadSections"),
    ).toBeUndefined();
    expect(
      readLegacyLocalUiPreference("sidebar.pluginPanelOrder"),
    ).toBeUndefined();
    expect(
      readLegacyLocalUiPreference("sidebar.visiblePluginPanels"),
    ).toBeUndefined();
  });

  it("clears the old key and its retired predecessors", () => {
    seed("cc.sidebar.pluginPanelOrder", ["docs/main"]);
    seed("cc.sidebar.hiddenPluginPanels", ["docs/main"]);
    seed("cc.sidebar.collapsedThreadSections", ["proj_1::sec_1"]);
    seed("cc.sidebar.collapsedFolders", ["proj_1::sec_1"]);
    seed("cc.sidebar.manualSectionOrder", ["pinned"]);
    seed("cc.sidebar.folderSectionOrder", ["pinned"]);
    clearLegacyLocalUiPreference("sidebar.pluginPanelOrder");
    clearLegacyLocalUiPreference("sidebar.collapsedThreadSections");
    clearLegacyLocalUiPreference("sidebar.manualSectionOrder");
    for (const key of [
      "cc.sidebar.pluginPanelOrder",
      "cc.sidebar.hiddenPluginPanels",
      "cc.sidebar.collapsedThreadSections",
      "cc.sidebar.collapsedFolders",
      "cc.sidebar.manualSectionOrder",
      "cc.sidebar.folderSectionOrder",
    ]) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });
});
