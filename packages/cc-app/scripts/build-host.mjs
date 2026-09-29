import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNodeEsmEntry,
  copyDirectory,
  pruneUnreferencedChunks,
} from "../../../scripts/build-utils.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDir, "..");
const workspaceRoot = resolve(packageRoot, "..", "..");
const hostPackageRoot = resolve(packageRoot, "host-package");
const hostDaemonSource = resolve(workspaceRoot, "apps", "host-daemon", "dist");
const hostDaemonTarget = resolve(hostPackageRoot, "host-daemon", "dist");
const dependencyNames = [
  "@parcel/watcher",
  "fs-native-extensions",
  "node-pty",
  "npm",
  "pino",
  "pino-pretty",
  "pino-roll",
];
const hostDaemonFiles = [
  "cc-parcel-watcher-child.mjs",
  "cc-plugin-host-worker.mjs",
  "cc-provider-bridge-worker.mjs",
  "daemon-bundle.mjs",
];

const sourcePackageJson = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8"),
);
const dependencies = Object.fromEntries(
  dependencyNames.map((name) => {
    const version = sourcePackageJson.dependencies?.[name];
    if (typeof version !== "string") {
      throw new Error(`Missing cc host dependency ${name}`);
    }
    return [name, version];
  }),
);

await rm(hostPackageRoot, { force: true, recursive: true });
await buildNodeEsmEntry({
  cleanDist: true,
  entryPoint: resolve(packageRoot, "src", "bin", "cc-app.ts"),
  executable: true,
  outfile: resolve(hostPackageRoot, "dist", "cc-app.js"),
  packageRoot: hostPackageRoot,
  sourcemap: false,
});
await buildNodeEsmEntry({
  cleanDist: false,
  entryPoint: resolve(packageRoot, "src", "bin", "cc.ts"),
  executable: true,
  outfile: resolve(hostPackageRoot, "dist", "cc.js"),
  packageRoot: hostPackageRoot,
  sourcemap: false,
});
await buildNodeEsmEntry({
  cleanDist: false,
  entryPoint: resolve(packageRoot, "src", "bin", "cc-host-daemon.ts"),
  executable: true,
  outfile: resolve(hostPackageRoot, "dist", "cc-host-daemon.js"),
  packageRoot: hostPackageRoot,
  sourcemap: false,
});

await mkdir(hostDaemonTarget, { recursive: true });
await copyFile(
  resolve(hostDaemonSource, "cc"),
  resolve(hostDaemonTarget, "cc"),
);
await chmod(resolve(hostDaemonTarget, "cc"), 0o755);
await copyDirectory({
  from: resolve(hostDaemonSource, "cc-chunks"),
  to: resolve(hostDaemonTarget, "cc-chunks"),
});
await copyDirectory({
  from: resolve(hostDaemonSource, "plugin-sdk"),
  to: resolve(hostDaemonTarget, "plugin-sdk"),
});
await pruneUnreferencedChunks({
  chunkDir: resolve(hostDaemonTarget, "cc-chunks"),
  entry: resolve(hostDaemonTarget, "cc"),
});
for (const fileName of hostDaemonFiles) {
  await copyFile(
    resolve(hostDaemonSource, fileName),
    resolve(hostDaemonTarget, fileName),
  );
}

await copyFile(
  resolve(packageRoot, "README.md"),
  resolve(hostPackageRoot, "README.md"),
);
await writeFile(
  resolve(hostPackageRoot, "package.json"),
  `${JSON.stringify(
    {
      name: sourcePackageJson.name,
      version: sourcePackageJson.version,
      description: "cc enrolled host runtime",
      type: "module",
      os: sourcePackageJson.os,
      bin: {
        cc: "dist/cc.js",
        "cc-app": "dist/cc-app.js",
        "cc-host-daemon": "dist/cc-host-daemon.js",
      },
      files: ["dist", "host-daemon", "README.md"],
      engines: sourcePackageJson.engines,
      dependencies,
    },
    null,
    2,
  )}\n`,
);

process.stdout.write("cc-app: built enrolled host package\n");
