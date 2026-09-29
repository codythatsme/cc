import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logoSvg, renderPng } from "./brand-artwork.mjs";

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(appDir, "public");
const checkOnly = process.argv.includes("--check");
const faviconColorValues = {
  red: "#e5484d",
  orange: "#f76b15",
  yellow: "#ffba18",
  green: "#30a46c",
  teal: "#12a594",
  blue: "#0090ff",
  purple: "#8e4ec6",
  pink: "#d6409f",
};
const icons = [
  { file: "icon-192.png", size: 192, scale: 0.84 },
  { file: "icon-512.png", size: 512, scale: 0.84 },
  { file: "icon-192-maskable.png", size: 192, scale: 0.72 },
  { file: "icon-512-maskable.png", size: 512, scale: 0.72 },
  { file: "apple-touch-icon.png", size: 180, scale: 0.84 },
];
const mismatches = [];

async function writeOrCheck(fileName, content) {
  const filePath = join(publicDir, fileName);
  if (!checkOnly) {
    await writeFile(filePath, content);
    return;
  }
  if (!existsSync(filePath) || !(await readFile(filePath)).equals(content)) {
    mismatches.push(fileName);
  }
}

const baseManifest = JSON.parse(
  await readFile(join(publicDir, "manifest.webmanifest"), "utf8"),
);

for (const size of [192, 512]) {
  await writeOrCheck(
    `icon-monochrome-${size}.png`,
    await renderPng(logoSvg({ foreground: "#ffffff", scale: 0.84 }), size),
  );
}

for (const [color, foreground] of Object.entries(faviconColorValues)) {
  for (const { file, size, scale } of icons) {
    await writeOrCheck(
      file.replace(/\.png$/u, `-${color}.png`),
      await renderPng(
        logoSvg({ foreground, background: "#ffffff", scale }),
        size,
        size,
        true,
      ),
    );
  }
  await writeOrCheck(
    `manifest-${color}.webmanifest`,
    Buffer.from(
      `${JSON.stringify(
        {
          ...baseManifest,
          icons: baseManifest.icons.map((icon) =>
            icon.purpose === "monochrome"
              ? icon
              : { ...icon, src: icon.src.replace(/\.png$/u, `-${color}.png`) },
          ),
        },
        null,
        2,
      )}\n`,
    ),
  );
}

if (mismatches.length > 0) {
  console.error(
    [
      "Generated PWA icon assets are out of date:",
      ...mismatches.map((fileName) => `  ${fileName}`),
      "Run `pnpm --filter @cc/app generate:pwa-icons`.",
    ].join("\n"),
  );
  process.exitCode = 1;
}
