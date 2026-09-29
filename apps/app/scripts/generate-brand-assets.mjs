import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { logoSvg, renderPng } from "./brand-artwork.mjs";

const root = new URL("../../../", import.meta.url);
const outputs = new Map();
const light = { foreground: "#153c49" };
const dark = { foreground: "#f4fcff" };
const tile = { ...light, background: "#ffffff", scale: 0.84 };
const maskable = { ...tile, scale: 0.72 };
const desktop = {
  foreground: "#ffffff",
  background: "#103747",
  accent: "#197782",
  desktop: true,
  scale: 0.74,
};
const nightly = { ...desktop, background: "#9a5b08", accent: "#edbc36" };
const dev = { ...desktop, background: "#673b72", accent: "#bc718d" };

async function png(path, size, options, opaque = false) {
  outputs.set(path, await renderPng(logoSvg(options), size, size, opaque));
}

async function icns(path, options) {
  const entries = [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
    ["ic11", 32],
    ["ic12", 64],
    ["ic13", 256],
    ["ic14", 512],
  ];
  const chunks = [];
  for (const [type, size] of entries) {
    const data = await renderPng(logoSvg(options), size);
    const header = Buffer.alloc(8);
    header.write(type, 0, "ascii");
    header.writeUInt32BE(data.length + 8, 4);
    chunks.push(header, data);
  }
  const header = Buffer.alloc(8);
  header.write("icns", 0, "ascii");
  header.writeUInt32BE(
    chunks.reduce((size, chunk) => size + chunk.length, 8),
    4,
  );
  outputs.set(path, Buffer.concat([header, ...chunks]));
}

await png("assets/cc-logo.png", 1024, light);
await png("assets/cc-logo-white.png", 1024, dark);
await png("assets/cc-logo-dev.png", 1024, { foreground: "#915078" });
await png("assets/cc-logo-black-white-bg-discord.png", 1024, tile, true);
await png("apps/desktop/assets/icon.png", 1024, desktop);
await png("apps/desktop/assets/icon-nightly.png", 1024, nightly);
await png("apps/desktop/assets/icon-dev.png", 1024, dev);
await icns("apps/desktop/assets/icon.icns", desktop);
await icns("apps/desktop/assets/icon-nightly.icns", nightly);

for (const size of [192, 512]) {
  await png(`apps/app/public/icon-${size}.png`, size, tile);
  await png(`apps/app/public/icon-${size}-maskable.png`, size, maskable);
}
for (const app of ["app", "web"]) {
  await png(`apps/${app}/public/apple-touch-icon.png`, 180, tile, true);
  for (const size of [16, 32]) {
    await png(`apps/${app}/public/favicon-${size}x${size}.png`, size, light);
    await png(
      `apps/${app}/public/favicon-${size}x${size}-dark.png`,
      size,
      dark,
    );
    if (app === "app") {
      await png(`apps/${app}/public/favicon-${size}x${size}-dev.png`, size, {
        foreground: "#ad5383",
      });
    }
  }
}
await png("apps/web/src/assets/cc-icon.png", 192, light);
await png("apps/web/src/assets/cc-icon-dark.png", 192, dark);
await png("apps/mobile/assets/icon.png", 1024, tile, true);
await png("apps/mobile/assets/ios-icon-dark.png", 1024, {
  ...dark,
  scale: 0.84,
});
await png("apps/mobile/assets/splash-icon.png", 1024, light);
await png("apps/mobile/assets/splash-icon-dark.png", 1024, dark);
await png("apps/mobile/assets/android-icon-foreground.png", 1024, {
  ...light,
  scale: 0.62,
});
await png("apps/mobile/assets/android-icon-monochrome.png", 1024, {
  foreground: "#ffffff",
  scale: 0.62,
});
await png(
  "apps/mobile/assets/android-icon-background.png",
  1024,
  {
    foreground: "#ffffff",
    background: "#ffffff",
  },
  true,
);
await png("apps/mobile/assets/favicon.png", 48, light);

const connectIcon = await renderPng(logoSvg(tile), 192);
outputs.set(
  "apps/connect/src/cc-icon.ts",
  Buffer.from(
    `export const CC_ICON_DATA_URI =\n  "data:image/png;base64,${connectIcon.toString("base64")}";\n`,
  ),
);

const banner = await readFile(new URL("assets/cc-banner.svg", root), "utf8");
const bannerPng = await renderPng(banner, 2400, 1260, true);
outputs.set("assets/cc-banner.png", bannerPng);
outputs.set("apps/web/public/og.png", bannerPng);

for (const [path, content] of outputs) {
  await writeFile(new URL(path, root), content);
}
console.log(
  `Generated ${outputs.size} cc brand assets in ${fileURLToPath(root)}`,
);
