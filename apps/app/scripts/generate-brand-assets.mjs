import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  brandCanvas,
  renderAppIconPng,
  renderBannerPng,
  renderMarkPng,
} from "./brand-artwork.mjs";

const root = new URL("../../../", import.meta.url);
const outputs = new Map();
const checkOnly = process.argv.includes("--check");
const carbon = {};
const pearl = { appearance: "pearl" };
const tile = { background: brandCanvas, scale: 0.76 };
const maskable = { ...tile, scale: 0.66 };

async function png(path, size, options = {}, opaque = false) {
  let content = await renderMarkPng(size, options);
  if (opaque) {
    content = await sharp(content)
      .flatten({ background: options.background ?? brandCanvas })
      .png()
      .toBuffer();
  }
  outputs.set(path, content);
}

async function icns(path, channel) {
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
    const data = await renderAppIconPng(size, channel);
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

await png("assets/cc-logo.png", 1024, carbon);
await png("assets/cc-logo-white.png", 1024, pearl);
await png("assets/cc-logo-dev.png", 1024, carbon);
await png("assets/cc-logo-black-white-bg-discord.png", 1024, tile, true);
await png("apps/app/src/assets/cc-mark.png", 512, carbon);
await png("apps/app/src/assets/cc-mark-light.png", 512, pearl);
for (const channel of ["stable", "nightly", "dev"]) {
  const suffix = channel === "stable" ? "" : `-${channel}`;
  outputs.set(
    `apps/desktop/assets/icon${suffix}.png`,
    await renderAppIconPng(1024, channel),
  );
  if (channel !== "dev") {
    await icns(`apps/desktop/assets/icon${suffix}.icns`, channel);
  }
}

for (const size of [192, 512]) {
  await png(`apps/app/public/icon-${size}.png`, size, tile);
  await png(`apps/app/public/icon-${size}-maskable.png`, size, maskable);
}
for (const app of ["app", "web"]) {
  await png(`apps/${app}/public/apple-touch-icon.png`, 180, tile, true);
  for (const size of [16, 32]) {
    await png(`apps/${app}/public/favicon-${size}x${size}.png`, size, carbon);
    await png(
      `apps/${app}/public/favicon-${size}x${size}-dark.png`,
      size,
      pearl,
    );
    if (app === "app") {
      await png(`apps/${app}/public/favicon-${size}x${size}-dev.png`, size, {
        ...tile,
        background: "#d9c8d6",
      });
    }
  }
}
await png("apps/web/src/assets/cc-icon.png", 192, carbon);
await png("apps/web/src/assets/cc-icon-dark.png", 192, pearl);
await png("apps/mobile/assets/icon.png", 1024, tile, true);
await png("apps/mobile/assets/ios-icon-dark.png", 1024, {
  ...pearl,
  scale: 0.76,
});
await png("apps/mobile/assets/splash-icon.png", 1024, carbon);
await png("apps/mobile/assets/splash-icon-dark.png", 1024, pearl);
await png("apps/mobile/assets/android-icon-foreground.png", 1024, {
  scale: 0.62,
});
await png("apps/mobile/assets/android-icon-monochrome.png", 1024, {
  scale: 0.62,
  monochrome: true,
});
outputs.set(
  "apps/mobile/assets/android-icon-background.png",
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: brandCanvas },
  })
    .png()
    .toBuffer(),
);
await png("apps/mobile/assets/favicon.png", 48, carbon);

const connectIcon = await renderMarkPng(192, tile);
outputs.set(
  "apps/connect/src/cc-icon.ts",
  Buffer.from(
    `export const CC_ICON_DATA_URI =\n  "data:image/png;base64,${connectIcon.toString("base64")}";\n`,
  ),
);

const bannerPng = await renderBannerPng();
outputs.set("assets/cc-banner.png", bannerPng);
outputs.set("apps/web/public/og.png", bannerPng);

const mismatches = [];
for (const [path, content] of outputs) {
  if (checkOnly) {
    const existing = await readFile(new URL(path, root)).catch(() => null);
    if (!existing?.equals(content)) mismatches.push(path);
  } else {
    await writeFile(new URL(path, root), content);
  }
}
if (mismatches.length > 0) {
  console.error(
    `Generated brand assets are out of date:\n${mismatches.join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `${checkOnly ? "Verified" : "Generated"} ${outputs.size} Soft Carbon brand assets in ${fileURLToPath(root)}`,
  );
}
