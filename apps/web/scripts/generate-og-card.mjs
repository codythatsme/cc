import { writeFile } from "node:fs/promises";
import { renderBannerPng } from "../../app/scripts/brand-artwork.mjs";

const output = new URL("../public/og.png", import.meta.url);
await writeFile(output, await renderBannerPng());
console.log(`Wrote ${output.pathname} (2400x1260)`);
