import {
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { bundleTargets } from "./bundle-manifest.mjs";
import {
  createNativeExternalPatterns,
  externalPackagePatterns,
  finalizeSplitOutput,
  splitOutputOptions,
} from "../../../scripts/build-utils.mjs";
import { zodLocaleStubPlugin } from "../../../packages/plugin-build/src/zod-locale-stub.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDir, "..");
const workspaceRoot = resolve(packageRoot, "..", "..");

async function main() {
  for (const target of bundleTargets) {
    await mkdir(dirname(target.outfile), { recursive: true });
    const split = target.splitting ? splitOutputOptions(target.outfile) : null;
    if (split) {
      // Chunk names carry content hashes; drop the previous build's chunks.
      await rm(split.chunkDir, { force: true, recursive: true });
    }
    await build({
      banner: {
        js: target.banner,
      },
      bundle: true,
      conditions: ["source"],
      entryPoints: [target.entryPoint],
      external: [
        ...createNativeExternalPatterns({
          bundledPackages: target.bundledPackages,
        }),
        ...externalPackagePatterns(target.externalPackages ?? []),
      ],
      format: "esm",
      legalComments: "none",
      minify: true,
      plugins: [zodLocaleStubPlugin()],
      ...(split ? split.esbuild : { outfile: target.outfile }),
      platform: "node",
      sourcemap: false,
      target: "node22",
    });
    if (split) {
      await finalizeSplitOutput(target.outfile);
    }
    if (target.executable) {
      await chmod(target.outfile, 0o755);
    }
    const bundleStats = await stat(target.outfile);
    console.log(`${target.label}: ${bundleStats.size} bytes`);
  }

  const sdkSource = resolve(workspaceRoot, "packages", "plugin-sdk");
  const sdkTarget = resolve(packageRoot, "dist", "plugin-sdk");
  await rm(sdkTarget, { recursive: true, force: true });
  await mkdir(sdkTarget, { recursive: true });
  const sdkManifest = JSON.parse(
    await readFile(resolve(sdkSource, "package.json"), "utf8"),
  );
  delete sdkManifest.devDependencies;
  delete sdkManifest.scripts;
  for (const entry of Object.values(sdkManifest.exports)) delete entry.source;
  await Promise.all([
    cp(resolve(sdkSource, "dist"), resolve(sdkTarget, "dist"), {
      recursive: true,
    }),
    cp(
      resolve(sdkSource, "bundled-types"),
      resolve(sdkTarget, "bundled-types"),
      { recursive: true },
    ),
    copyFile(resolve(sdkSource, "README.md"), resolve(sdkTarget, "README.md")),
    copyFile(resolve(workspaceRoot, "LICENSE"), resolve(sdkTarget, "LICENSE")),
    writeFile(
      resolve(sdkTarget, "package.json"),
      `${JSON.stringify(sdkManifest, null, 2)}\n`,
    ),
  ]);

  const titleCommandPath = resolve(
    workspaceRoot,
    "apps",
    "cli",
    "bin",
    "title",
  );
  const outputTitleCommandPath = resolve(packageRoot, "dist", "title");
  await copyFile(titleCommandPath, outputTitleCommandPath);
  await chmod(outputTitleCommandPath, 0o755);
}

void main().catch((error) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
