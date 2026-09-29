import { readFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(
  new URL("../../../assets/cc-logo.svg", import.meta.url),
  "utf8",
);
const mark = source.match(/<path\s[^>]*\/>/u)?.[0];
if (!mark) throw new Error("cc-logo.svg must contain its canonical path");

export function logoSvg({
  foreground = "#153c49",
  background,
  scale = 1,
  desktop = false,
  accent = "#197782",
} = {}) {
  const inset = (512 - 512 * scale) / 2;
  const backdrop = desktop
    ? `<defs><linearGradient id="tile" x2="0.85" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="${background}"/></linearGradient></defs><rect x="52" y="52" width="408" height="408" rx="100" fill="url(#tile)"/><rect x="53" y="53" width="406" height="406" rx="99" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>`
    : background
      ? `<rect width="512" height="512" fill="${background}"/>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${backdrop}<g transform="translate(${inset} ${inset}) scale(${scale})">${mark.replace('stroke="#153c49"', `stroke="${foreground}"`)}</g></svg>`;
}

export function renderPng(svg, width, height = width, opaque = false) {
  const output = sharp(Buffer.from(svg), { density: 384 }).resize(
    width,
    height,
  );
  if (opaque) output.removeAlpha();
  return output.png().toBuffer();
}
