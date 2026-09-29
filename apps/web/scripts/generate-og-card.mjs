import { readFile, writeFile } from "node:fs/promises";
import { renderPng } from "../../app/scripts/brand-artwork.mjs";

const source = new URL("../../../assets/cc-banner.svg", import.meta.url);
const output = new URL("../public/og.png", import.meta.url);
const svg = await readFile(source, "utf8");
await writeFile(output, await renderPng(svg, 2400, 1260, true));
console.log(`Wrote ${output.pathname} (2400x1260)`);
