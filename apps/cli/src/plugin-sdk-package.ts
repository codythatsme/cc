import {
  access,
  cp,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PLUGIN_SDK_VERSION } from "@cc/domain";
import { z } from "zod";

export const BUNDLED_PLUGIN_SDK_DIRECTORY = `.cc/plugin-sdk-${PLUGIN_SDK_VERSION}`;
export const BUNDLED_PLUGIN_SDK_SPECIFIER = `file:./${BUNDLED_PLUGIN_SDK_DIRECTORY}`;

const sdkManifestSchema = z
  .object({
    name: z.literal("@codythatsme/plugin-sdk"),
    version: z.literal(PLUGIN_SDK_VERSION),
    exports: z.record(z.string(), z.record(z.string(), z.string())),
  })
  .passthrough();

export async function resolveBundledPluginSdk(): Promise<string> {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    for (const candidate of [
      join(directory, "plugin-sdk"),
      join(directory, "packages", "plugin-sdk"),
    ]) {
      try {
        sdkManifestSchema.parse(
          JSON.parse(await readFile(join(candidate, "package.json"), "utf8")),
        );
        await access(join(candidate, "dist", "index.js"));
        await access(join(candidate, "bundled-types", "cc-plugin-sdk.d.ts"));
        return candidate;
      } catch {}
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(
    "The bundled cc plugin SDK is missing. Reinstall cc, or build @codythatsme/plugin-sdk build and build:types in the source checkout.",
  );
}

export async function vendorPluginSdk(rootDir: string): Promise<void> {
  const source = await resolveBundledPluginSdk();
  const target = join(rootDir, BUNDLED_PLUGIN_SDK_DIRECTORY);
  await mkdir(target, { recursive: true });
  const root = await realpath(rootDir);
  const destination = await realpath(target);
  const within = relative(root, destination);
  if (within === ".." || within.startsWith(`..${sep}`)) {
    throw new Error("The plugin SDK directory must stay inside the plugin.");
  }
  const manifest = sdkManifestSchema.parse(
    JSON.parse(await readFile(join(source, "package.json"), "utf8")),
  );
  // The workspace copy is private to avoid accidental npm publication, but a
  // vendored SDK is installed as a normal local dependency in an external
  // plugin and must retain normal package metadata.
  delete manifest.private;
  delete manifest.devDependencies;
  delete manifest.scripts;
  for (const entry of Object.values(manifest.exports)) delete entry.source;
  await Promise.all([
    cp(join(source, "dist"), join(target, "dist"), {
      recursive: true,
      dereference: true,
    }),
    cp(join(source, "bundled-types"), join(target, "bundled-types"), {
      recursive: true,
      dereference: true,
    }),
    cp(join(source, "README.md"), join(target, "README.md")),
    writeFile(
      join(target, "package.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
  ]);
  for (const license of [
    join(source, "LICENSE"),
    join(source, "..", "..", "LICENSE"),
  ]) {
    try {
      await cp(license, join(target, "LICENSE"));
      return;
    } catch {}
  }
  throw new Error("The bundled cc plugin SDK license is missing.");
}
