import { describe, expect, it } from "vitest";
import {
  resolveDesktopBridgePath,
  resolveDesktopIconPath,
  resolveDesktopMachineInstallerPath,
  type DesktopPathContext,
} from "../src/app-paths.js";

describe("desktop app paths", () => {
  it("resolves the packaged cc-app bridge beside the active asar", () => {
    const paths: DesktopPathContext = {
      appPath: "/Applications/cc.app/Contents/Resources/app.asar",
      isPackaged: true,
      resourcesPath: "/Applications/cc.app/Contents/Resources",
    };

    expect(resolveDesktopBridgePath({ paths })).toBe(
      "/Applications/cc.app/Contents/Resources/app.asar.unpacked/dist/cc-app-bridge.mjs",
    );
  });

  it("resolves the universal packaged cc-app bridge beside the selected arch asar", () => {
    const paths: DesktopPathContext = {
      appPath: "/Applications/cc.app/Contents/Resources/app-arm64.asar",
      isPackaged: true,
      resourcesPath: "/Applications/cc.app/Contents/Resources",
    };

    expect(resolveDesktopBridgePath({ paths })).toBe(
      "/Applications/cc.app/Contents/Resources/app-arm64.asar.unpacked/dist/cc-app-bridge.mjs",
    );
  });

  it("resolves the machine installer inside the cc-app package beside the bridge", () => {
    expect(
      resolveDesktopMachineInstallerPath(
        "/Applications/cc.app/Contents/Resources/app.asar.unpacked/dist/cc-app-bridge.mjs",
      ),
    ).toBe(
      "/Applications/cc.app/Contents/Resources/app.asar.unpacked/node_modules/cc-app/server/dist/assets/install-machine.sh",
    );
  });

  it("uses the release-specific icon inside packaged apps", () => {
    const paths: DesktopPathContext = {
      appPath: "/Applications/cc Nightly.app/Contents/Resources/app.asar",
      isPackaged: true,
      resourcesPath: "/Applications/cc Nightly.app/Contents/Resources",
    };

    expect(
      resolveDesktopIconPath({
        packagedIconFileName: "icon-nightly.png",
        paths,
      }),
    ).toBe(
      "/Applications/cc Nightly.app/Contents/Resources/app.asar/assets/icon-nightly.png",
    );
  });

  it("keeps the development icon independent of the release channel", () => {
    const paths: DesktopPathContext = {
      appPath: "/checkout/apps/desktop",
      isPackaged: false,
      resourcesPath: "/checkout/apps/desktop",
    };

    expect(
      resolveDesktopIconPath({
        packagedIconFileName: "icon-nightly.png",
        paths,
      }),
    ).toBe("/checkout/apps/desktop/assets/icon-dev.png");
  });
});
