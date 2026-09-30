import { readFile } from "node:fs/promises";
import sharp from "sharp";

export const brandCanvas = "#f1ede5";
const root = new URL("../../../", import.meta.url);
const marks = new Map();

async function markSource(appearance) {
  if (!marks.has(appearance)) {
    const path = appearance === "pearl" ? "mark-light.png" : "mark.png";
    marks.set(
      appearance,
      readFile(new URL(`assets/soft-carbon/${path}`, root)).then((source) =>
        sharp(source).trim().png().toBuffer(),
      ),
    );
  }
  return marks.get(appearance);
}

export async function renderMarkPng(
  size,
  { appearance = "carbon", background, scale = 0.9, monochrome = false } = {},
) {
  const source = await markSource(appearance);
  const extent = Math.round(size * scale);
  let mark = await sharp(source)
    .resize(extent, extent, { fit: "inside" })
    .png()
    .toBuffer();
  if (monochrome) {
    const { width, height } = await sharp(mark).metadata();
    const alpha = await sharp(mark)
      .ensureAlpha()
      .extractChannel("alpha")
      .threshold(32)
      .toBuffer();
    mark = await sharp({
      create: { width, height, channels: 3, background: "#ffffff" },
    })
      .joinChannel(alpha)
      .png()
      .toBuffer();
  }
  return sharp({
    create: {
      width: size,
      height: size,
      channels: background ? 3 : 4,
      background: background ?? "#00000000",
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

export async function renderAppIconPng(size, channel = "stable") {
  const source = await readFile(
    new URL("assets/soft-carbon/app-icon.png", root),
  );
  const icon = sharp(source).resize(size, size);
  if (channel !== "stable") {
    const color = channel === "nightly" ? "#d9a73f" : "#926a8c";
    const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><circle cx="793" cy="790" r="62" fill="${brandCanvas}"/><circle cx="793" cy="790" r="44" fill="${color}"/></svg>`;
    icon.composite([{ input: Buffer.from(badge) }]);
  }
  return icon.png().toBuffer();
}

export async function renderBannerPng() {
  const [svg, mark] = await Promise.all([
    readFile(new URL("assets/cc-banner.svg", root), "utf8"),
    markSource("carbon"),
  ]);
  const banner = svg.replace(
    'href="soft-carbon/mark.png"',
    `href="data:image/png;base64,${mark.toString("base64")}"`,
  );
  return sharp(Buffer.from(banner), { density: 144 })
    .resize(2400, 1260)
    .removeAlpha()
    .png()
    .toBuffer();
}
