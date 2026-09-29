import { watch } from "node:fs";
import { homedir } from "node:os";
import { access, readFile, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { Command, Option } from "commander";
import { z } from "zod";
import { derivePluginId, jsonValueSchema } from "@cc/domain";
import { pluginCliCall, RESERVED_CC_CLI_COMMANDS } from "@cc/domain/plugin-cli";
import type {
  InstalledPlugin as PluginEntry,
  PluginApplyUpdateResult,
  PluginCatalogInstallPlan,
  PluginCatalogResolvedSource,
  PluginCatalogSearchResult,
  PluginUpdateCheckEntry as PluginUpdateResult,
} from "@cc/server-contract";
import { PLUGIN_SDK_VERSION } from "@cc/domain";
import { CcHttpError, pluginMutationResponseSchema } from "@cc/sdk";
import { parseDataDirEnvValue, resolveProdDataDir } from "@cc/config/runtime";
import {
  migratePluginToPackageLayout,
  resolvePluginSdkLayout,
  scaffoldPlugin,
  setPluginSdkPin,
  type PluginPackageLayoutMigration,
} from "@cc/templates/plugin-scaffold";
import { action } from "../action.js";
import { cliFetch, createCliCcSdk } from "../client.js";
import {
  buildPluginApp,
  buildPluginHost,
  buildPluginServer,
  createPluginDevLoop,
  PLUGIN_TOOLCHAIN_PINS,
  resolvePluginBuildToolchain,
  type PluginBuildToolchain,
} from "@cc/plugin-build";
import { runPluginCliCommand } from "../plugin-cli-proxy.js";
import { resolveCcCliVersion } from "../version.js";
import {
  BUNDLED_PLUGIN_SDK_SPECIFIER,
  vendorPluginSdk,
} from "../plugin-sdk-package.js";

import { outputJson, type JsonOutputOptions } from "./helpers.js";
import { renderBorderlessTable } from "../table.js";

interface NewPluginTarget {
  packageName: string;
  directoryName: string;
}

export function resolveNewPluginTarget(name: string): NewPluginTarget | null {
  const packageName = name.startsWith("@")
    ? name
    : name.startsWith("cc-plugin-")
      ? name
      : `cc-plugin-${name}`;
  if (
    !/^(?:@[a-z0-9][a-z0-9-]*\/)?cc-plugin-[a-z0-9][a-z0-9-]*$/.test(
      packageName,
    )
  ) {
    return null;
  }
  const pluginId = derivePluginId(packageName);
  if (RESERVED_CC_CLI_COMMANDS.includes(pluginId)) return null;
  return {
    packageName,
    directoryName: `cc-plugin-${pluginId}`,
  };
}

function toolchainBaseDir(): string {
  const configured = process.env.CC_DATA_DIR;
  const dataDir =
    configured === undefined || configured.trim().length === 0
      ? resolveProdDataDir({ homeDir: homedir() })
      : parseDataDirEnvValue({ homeDir: homedir(), rawDataDir: configured });
  return join(dataDir, "plugins");
}

async function cliBuildToolchain(): Promise<PluginBuildToolchain> {
  return resolvePluginBuildToolchain(toolchainBaseDir(), {
    onFetchStart: () => {
      const pins = Object.entries(PLUGIN_TOOLCHAIN_PINS)
        .map(([name, version]) => `${name}@${version}`)
        .join(", ");
      console.log("Downloading the plugin build toolchain (one time)…");
      console.log(`  ${pins}`);
    },
    onFetchDone: (elapsedMs) => {
      console.log(`Toolchain ready (${(elapsedMs / 1000).toFixed(1)}s)`);
    },
  });
}

async function searchCatalog(
  baseUrl: string,
  query: string,
): Promise<PluginCatalogSearchResult[]> {
  return (await createCliCcSdk(baseUrl).plugins.catalog.search({ query }))
    .results;
}

const pluginSettingDescriptorSchema = z.object({
  type: z.enum(["string", "number", "boolean", "select", "project"]),
  label: z.string(),
  description: z.string().optional(),
  secret: z.literal(true).optional(),
  default: z.union([z.string(), z.number().finite(), z.boolean()]).optional(),
  options: z.array(z.string()).optional(),
});
const negativeNumberValuePattern =
  /^-(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const pluginSettingsResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  schema: z.record(z.string(), pluginSettingDescriptorSchema).optional(),
  values: z.record(z.string(), z.unknown()).optional(),
});
const pluginTokenResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  token: z.string().optional(),
});
const pluginLogsResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  lines: z.array(z.string()).optional(),
});
const pluginPackageSummarySchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
});
const pluginManifestSchema = z.object({
  cc: z
    .object({
      server: z.unknown().optional(),
      app: z.unknown().optional(),
      host: z.unknown().optional(),
    })
    .optional(),
});
const secretSettingValueSchema = z.object({ set: z.boolean().optional() });

async function readPluginManifest(
  rootDir: string,
): Promise<z.infer<typeof pluginManifestSchema> | null> {
  try {
    const raw: unknown = JSON.parse(
      await readFile(join(rootDir, "package.json"), "utf8"),
    );
    return pluginManifestSchema.parse(raw);
  } catch {
    return null;
  }
}

const LEGACY_PLUGIN_SDK_LAYOUT_MESSAGE =
  "This plugin uses the legacy vendored SDK layout. Its SDK types will not be updated.\n" +
  "Please run `cc plugin migrate` to update to the latest SDK types.";

async function checkPluginSdkLayout(rootDir: string): Promise<void> {
  const layout = await resolvePluginSdkLayout(rootDir);
  if (layout.kind === "package") {
    warnIfSdkPinIsStale(layout.pin);
    return;
  }
  console.warn(LEGACY_PLUGIN_SDK_LAYOUT_MESSAGE);
}

const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/;

function warnIfSdkPinIsStale(pin: string | null): void {
  if (pin === null || !EXACT_VERSION_PATTERN.test(pin)) return;
  if (pin === PLUGIN_SDK_VERSION || pin === BUNDLED_PLUGIN_SDK_SPECIFIER)
    return;
  console.warn(
    `This plugin pins @codythatsme/plugin-sdk ${pin}; this cc's SDK is ${PLUGIN_SDK_VERSION} — \`cc plugin types\` updates the pin.`,
  );
}

function printMigrationPlan(plan: PluginPackageLayoutMigration): void {
  if (plan.pin !== null) {
    console.log(
      `  package.json   devDependencies "@codythatsme/plugin-sdk": ${plan.pin.from ?? "(none)"} → ${plan.pin.to}`,
    );
  }
  if (plan.movedFromDependencies) {
    console.log(
      '  package.json   move "@codythatsme/plugin-sdk" from dependencies to devDependencies',
    );
  }
  if (plan.enginesFloor !== null) {
    console.log(
      `  package.json   engines.ccPluginSdk: ${plan.enginesFloor.from ?? "(none)"} → ${plan.enginesFloor.to}`,
    );
  }
  for (const key of plan.removedPathMaps) {
    console.log(`  tsconfig.json  remove compilerOptions.paths "${key}"`);
  }
  for (const entry of plan.removedIncludes) {
    console.log(`  tsconfig.json  remove include entry "${entry}"`);
  }
  for (const file of plan.deletedFiles) {
    console.log(`  delete         ${file}`);
  }
  if (plan.removedTypesDir) {
    console.log("  delete         types/ (empty after the deletions above)");
  }
  for (const file of plan.rewrittenImports) {
    console.log(
      `  rewrite        ${file.path} (${file.imports} import${file.imports === 1 ? "" : "s"} of "@cc/plugin-sdk" → "@codythatsme/plugin-sdk")`,
    );
  }
}

function samePlan(
  approved: PluginPackageLayoutMigration,
  current: PluginPackageLayoutMigration,
): boolean {
  return JSON.stringify(approved) === JSON.stringify(current);
}

async function requirePluginManifest(
  rootDir: string,
): Promise<z.infer<typeof pluginManifestSchema>> {
  const manifest = await readPluginManifest(rootDir);
  if (!manifest) {
    console.error(
      `No readable package.json in ${rootDir} — run from a plugin directory or pass its path.`,
    );
    process.exit(1);
  }
  if (typeof manifest.cc?.server !== "string") {
    console.error(
      `${rootDir} is not a cc plugin — package.json has no "cc.server" entry.`,
    );
    process.exit(1);
  }
  return manifest;
}

const scaffoldPackageSchema = z.object({
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
});

async function unresolvedScaffoldPackages(
  targetDir: string,
): Promise<string | null> {
  let declared: string[];
  try {
    const manifest = scaffoldPackageSchema.parse(
      JSON.parse(await readFile(join(targetDir, "package.json"), "utf8")),
    );
    declared = [
      ...Object.keys(manifest.dependencies),
      ...Object.keys(manifest.devDependencies),
    ];
  } catch {
    return "the generated package.json could not be read back";
  }
  const missing: string[] = [];
  for (const name of declared) {
    if (!(await isPackageInstalled(targetDir, name))) {
      missing.push(name);
    }
  }
  return missing.length === 0
    ? null
    : `${missing.sort().join(", ")} missing from node_modules`;
}

async function isPackageInstalled(
  targetDir: string,
  name: string,
): Promise<boolean> {
  const segments = name.split("/");
  let dir = targetDir;
  for (;;) {
    try {
      await access(join(dir, "node_modules", ...segments));
      return true;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return false;
      dir = parent;
    }
  }
}

const NPM_FAILURE_DETAIL_LINES = 8;

function npmOutputTail(output: unknown): string {
  if (typeof output !== "string") return "";
  return output.trim().split("\n").slice(-NPM_FAILURE_DETAIL_LINES).join("\n");
}

function npmFailureDetail(cause: unknown): string {
  if (typeof cause !== "object" || cause === null) return "";
  const stderr = "stderr" in cause ? npmOutputTail(cause.stderr) : "";
  const stdout = "stdout" in cause ? npmOutputTail(cause.stdout) : "";
  const text = stderr || stdout;
  if (text === "") return "";
  return `\n${text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")}`;
}

async function installScaffoldDependencies(
  targetDir: string,
): Promise<boolean> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  try {
    await promisify(execFile)(
      "npm",
      ["install", "--include=dev", "--no-fund", "--no-audit"],
      { cwd: targetDir },
    );
  } catch (cause) {
    console.warn(
      `Could not run npm install — run it in the plugin directory before \`cc plugin build\`.${npmFailureDetail(cause)}`,
    );
    return false;
  }
  const problem = await unresolvedScaffoldPackages(targetDir);
  if (problem !== null) {
    console.warn(
      `npm install reported success but ${problem} — run \`npm install --include=dev\` in the plugin directory before \`cc plugin build\`.`,
    );
    return false;
  }
  console.log("Installed dependencies (npm install).");
  return true;
}

type PluginSettingDescriptor = z.infer<typeof pluginSettingDescriptorSchema>;
type PluginSettingsResult = z.infer<typeof pluginSettingsResultSchema>;

async function callPlugins(
  baseUrl: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<unknown> {
  const response = await cliFetch(`${baseUrl}/api/v1/plugins${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Unexpected response from /api/v1/plugins${path} (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!response.ok && ![400, 404, 422].includes(response.status)) {
    throw new Error(`/api/v1/plugins${path} failed: HTTP ${response.status}`);
  }
  return parsed;
}

const UPDATE_STATUS_LABELS: Record<PluginUpdateResult["outcome"], string> = {
  current: "current",
  "update-available": "update available",
  pinned: "pinned",
  incompatible: "incompatible",
  unavailable: "unavailable",
};

function blockedSummary(result: PluginUpdateResult): string {
  if (!result.blocked) return "—";
  return `${result.blocked.version}: ${result.blocked.reasons.join("; ")}`;
}

function updateDetail(result: PluginUpdateResult): string {
  return result.detail ?? result.blocked?.reasons.join("; ") ?? "";
}

async function confirmPluginAction(
  prompt: string,
  refusal: string,
  yes: boolean,
): Promise<void> {
  if (yes) return;
  if (!process.stdin.isTTY) {
    console.error(refusal);
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${prompt} [y/N] `)).trim().toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") {
    console.log("Aborted.");
    process.exit(1);
  }
}

function outputMutationJson(
  opts: JsonOutputOptions,
  result: { ok: boolean },
): boolean {
  if (!outputJson(opts, result)) return false;
  if (!result.ok) process.exit(1);
  return true;
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function formatAbsoluteDate(value: number): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

function dualInterpretationError(source: string): string {
  return (
    `Could not resolve "${source}" as either a catalog plugin or a path on disk. ` +
    "Use a Git repository URL, path:<path>, npm:<package>, git:<url>[@<ref>], or " +
    "git:<url>@<semver-range> to choose an interpretation explicitly."
  );
}

function withGitTagPrefix(source: string, tagPrefix: string): string {
  const at = source.lastIndexOf("@");
  const spec = at <= 0 ? "" : source.slice(at + 1);
  if (
    (!source.startsWith("git:") && !/^https?:\/\//iu.test(source)) ||
    spec.length === 0
  ) {
    throw new Error(
      "--tag-prefix applies to a git: source with a semver range, such as git:github.com/acme/repo@^1.2.0.",
    );
  }
  if (spec.startsWith("semver:") || spec.startsWith("ref:")) {
    throw new Error(
      `Use --tag-prefix or an explicit "${spec.split(":")[0] ?? ""}:" spec, not both.`,
    );
  }
  return `${source.slice(0, at)}@semver:${tagPrefix}:${spec}`;
}

function hasPathSyntax(source: string): boolean {
  return (
    source.includes("/") ||
    source.includes("\\") ||
    source.startsWith(".") ||
    source.startsWith("~")
  );
}

async function existsOnDisk(source: string): Promise<boolean> {
  try {
    await access(resolve(source));
    return true;
  } catch {
    return false;
  }
}

type InstallIntent =
  | { kind: "source"; source: string; summary: string }
  | { kind: "catalog"; plan: PluginCatalogInstallPlan };

const QUALIFIED_ENTRY_PATTERN = /^([a-z0-9][a-z0-9-]*)@([a-z0-9][a-z0-9-]*)$/u;

function installPlan(
  baseUrl: string,
  args: { entryId: string; marketplace?: string },
): Promise<PluginCatalogInstallPlan> {
  return createCliCcSdk(baseUrl).plugins.catalog.installPlan(args);
}

async function resolveInstallIntent(
  baseUrl: string,
  input: string,
): Promise<InstallIntent> {
  if (
    ["path:", "npm:", "git:", "builtin:"].some((prefix) =>
      input.startsWith(prefix),
    )
  ) {
    if (input.startsWith("path:")) {
      const path = resolve(input.slice(5));
      return {
        kind: "source",
        source: `path:${path}`,
        summary: `Installing ${path}`,
      };
    }
    return { kind: "source", source: input, summary: `Installing ${input}` };
  }
  if (/^https?:\/\//iu.test(input)) {
    return { kind: "source", source: input, summary: `Installing ${input}` };
  }
  if (hasPathSyntax(input)) {
    const path = resolve(input);
    return {
      kind: "source",
      source: `path:${path}`,
      summary: `Installing ${path}`,
    };
  }

  const qualified = QUALIFIED_ENTRY_PATTERN.exec(input);
  if (qualified !== null) {
    const [, entryId, marketplace] = qualified;
    return {
      kind: "catalog",
      plan: await installPlan(baseUrl, {
        entryId: entryId ?? "",
        marketplace: marketplace ?? "",
      }),
    };
  }
  if (!input.includes("@")) {
    const listed = (await searchCatalog(baseUrl, input)).some(
      (candidate) => candidate.entryId === input,
    );
    if (listed) {
      return {
        kind: "catalog",
        plan: await installPlan(baseUrl, { entryId: input }),
      };
    }
  }
  if (!(await existsOnDisk(input)))
    throw new Error(dualInterpretationError(input));

  const path = resolve(input);
  return {
    kind: "source",
    source: `path:${path}`,
    summary: `Installing ${path}`,
  };
}

function resolvedSourceLines(source: PluginCatalogResolvedSource): string[] {
  if (source.kind === "npm") {
    const spec = source.range ?? source.tag ?? "latest";
    return [
      `  npm package: ${source.package}@${spec}`,
      ...(source.registry === undefined
        ? []
        : [`  registry: ${source.registry}`]),
    ];
  }
  const lines = [`  git repository: ${source.url}`];
  if (source.subdir !== undefined) {
    lines.push(`  subdirectory: ${source.subdir}`);
  }
  if (source.ref !== undefined) lines.push(`  ref: ${source.ref}`);
  if (source.range !== undefined) {
    const prefix =
      source.tagPrefix === undefined ? "" : ` (tags ${source.tagPrefix}vX.Y.Z)`;
    lines.push(`  semver range: ${source.range}${prefix}`);
  }
  if (source.resolvedTag !== undefined) {
    lines.push(`  resolves to tag: ${source.resolvedTag}`);
  }
  if (source.resolvedCommit !== undefined) {
    lines.push(`  resolves to commit: ${source.resolvedCommit}`);
  }
  if (source.unresolvedReason !== undefined) {
    lines.push(`  not resolved right now: ${source.unresolvedReason}`);
  }
  return lines;
}

function installPlanSummary(plan: PluginCatalogInstallPlan): string {
  if (plan.kind === "bundled") {
    return `Installing ${plan.displayName}, bundled with CC (${plan.source})`;
  }
  if (plan.official) {
    return `Installing ${plan.displayName} from the ${plan.marketplaceDisplayName} marketplace, reviewed by CC (${plan.source})`;
  }
  const author =
    plan.author.url === null
      ? plan.author.name
      : `${plan.author.name} (${plan.author.url})`;
  return [
    `Installing ${plan.displayName} (${plan.entryId}@${plan.marketplace})`,
    `  marketplace: ${plan.marketplaceDisplayName} — a third-party marketplace, not reviewed by CC`,
    `  author: ${author}`,
    ...resolvedSourceLines(plan.resolvedSource),
  ].join("\n");
}

function printPlugin(plugin: PluginEntry): void {
  const state = plugin.enabled ? plugin.status : "disabled";
  const detail = plugin.statusDetail ? `  (${plugin.statusDetail})` : "";
  console.log(`${plugin.id}@${plugin.version}  ${state}${detail}`);
  console.log(`  source: ${plugin.source}`);
  const stats = plugin.handlerStats;
  if (stats && stats.count > 0) {
    const errors = stats.errorCount > 0 ? `, ${stats.errorCount} errors` : "";
    console.log(
      `  handlers: ${stats.count} calls / ${formatMs(stats.totalMs)} total / ${formatMs(stats.maxMs)} max${errors}`,
    );
  }
  for (const service of plugin.services ?? []) {
    console.log(`  service ${service.name}: ${service.state}`);
  }
  for (const schedule of plugin.schedules ?? []) {
    const last = schedule.lastStatus ? `, last: ${schedule.lastStatus}` : "";
    const error = schedule.lastError ? ` (${schedule.lastError})` : "";
    console.log(
      `  schedule ${schedule.name} (${schedule.cron}): next ${new Date(schedule.nextRunAt).toISOString()}${last}${error}`,
    );
  }
  if (plugin.cliCommand) {
    const collisionNote = RESERVED_CC_CLI_COMMANDS.includes(
      plugin.cliCommand.name,
    )
      ? ` (core command "cc ${plugin.cliCommand.name}" takes precedence)`
      : "";
    console.log(
      `  command: ${pluginCliCall(plugin.id, plugin.cliCommand.name)} — ${plugin.cliCommand.summary}${collisionNote}`,
    );
  }
}

function exitWithError(result: { error?: string }): never {
  console.error(result.error ?? "Command failed");
  process.exit(1);
}

function sdkErrorMessage(error: unknown): string {
  if (error instanceof CcHttpError) {
    return error.message.replace(/^HTTP \d+: /u, "");
  }
  return error instanceof Error ? error.message : String(error);
}

function printSettings(result: PluginSettingsResult): void {
  const schema = result.schema ?? {};
  const values = result.values ?? {};
  const keys = Object.keys(schema);
  if (keys.length === 0) {
    console.log("This plugin declares no settings.");
    return;
  }
  for (const key of keys) {
    const descriptor = schema[key];
    if (!descriptor) continue;
    const meta = [
      descriptor.type,
      ...(descriptor.secret ? ["secret"] : []),
      ...(descriptor.options
        ? [`options: ${descriptor.options.join("|")}`]
        : []),
    ].join(", ");
    let display: string;
    if (descriptor.secret) {
      const value = secretSettingValueSchema.safeParse(values[key]);
      display = value.success && value.data.set ? "[set]" : "[not set]";
    } else {
      const value = values[key];
      display = value === undefined ? "(unset)" : JSON.stringify(value);
    }
    console.log(`${key} = ${display}  (${meta})`);
    console.log(
      `  ${descriptor.label}${descriptor.description ? ` — ${descriptor.description}` : ""}`,
    );
  }
}

function parseSettingValue(
  descriptor: PluginSettingDescriptor,
  key: string,
  raw: string,
): string | number | boolean {
  if (descriptor.type === "boolean") {
    if (raw === "true") return true;
    if (raw === "false") return false;
    console.error(`Setting "${key}" is a boolean — pass true or false.`);
    process.exit(1);
  }
  if (descriptor.type === "select" && !descriptor.options?.includes(raw)) {
    console.error(
      `Setting "${key}" must be one of: ${descriptor.options?.join(", ") ?? ""}`,
    );
    process.exit(1);
  }
  if (descriptor.type === "number") {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      value = undefined;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    console.error(`Setting "${key}" is a number — pass a finite number.`);
    process.exit(1);
  }
  return raw;
}

export function registerPluginCommands(
  program: Command,
  getUrl: () => string,
): void {
  const plugin = program
    .command("plugin")
    .description("Manage CC plugins")
    .enablePositionalOptions();

  const rpc = plugin
    .command("rpc")
    .description("Inspect discoverable plugin RPC methods");
  rpc
    .command("list [plugin-id]")
    .option("--method <name>", "Filter by exact method name")
    .option("--json", "Output JSON")
    .action(
      action(
        async (
          pluginId: string | undefined,
          opts: JsonOutputOptions & { method?: string },
        ) => {
          const methods = await createCliCcSdk(
            getUrl(),
          ).plugins.experimental_discoverRpc({ pluginId, method: opts.method });
          if (opts.json) {
            outputJson(opts, methods);
            return;
          }
          if (methods.length === 0) console.log("No discoverable RPC methods.");
          for (const method of methods)
            console.log(
              `${method.pluginId}  ${method.method}  ${method.methodDescription ?? method.registrationDescription ?? ""}`,
            );
        },
      ),
    );
  rpc
    .command("call <plugin-id> <method>")
    .description("Call a plugin RPC method with server-side schema validation")
    .option(
      "--input-file <path>",
      "Read JSON input from a file; defaults to null",
    )
    .option("--json", "Output JSON")
    .action(
      action(
        async (
          pluginId: string,
          method: string,
          opts: JsonOutputOptions & { inputFile?: string },
        ) => {
          const input =
            opts.inputFile === undefined
              ? null
              : jsonValueSchema.parse(
                  JSON.parse(await readFile(opts.inputFile, "utf8")),
                );
          const result = await createCliCcSdk(getUrl()).plugins.callRpc({
            pluginId,
            method,
            input,
            outputSchema: jsonValueSchema,
          });
          if (opts.json) {
            outputJson(opts, result);
            return;
          }
          console.log(JSON.stringify(result, null, 2));
        },
      ),
    );

  rpc
    .command("inspect <plugin-id> [method]")
    .option("--json", "Output JSON")
    .action(
      action(
        async (
          pluginId: string,
          method: string | undefined,
          opts: JsonOutputOptions,
        ) => {
          const methods = await createCliCcSdk(
            getUrl(),
          ).plugins.experimental_discoverRpc({ pluginId, method });
          if (opts.json) {
            outputJson(opts, methods);
            return;
          }
          if (methods.length === 0) console.log("No discoverable RPC methods.");
          for (const method of methods) {
            console.log(`${method.pluginId} · ${method.method}`);
            if (method.registrationDescription !== null)
              console.log(method.registrationDescription);
            if (method.methodDescription !== null)
              console.log(method.methodDescription);
            console.log(
              "Input schema:",
              JSON.stringify(method.inputSchema, null, 2),
            );
            console.log(
              "Output schema:",
              JSON.stringify(method.outputSchema, null, 2),
            );
          }
        },
      ),
    );

  plugin
    .command("search <query>")
    .description(
      "Search every plugin the store lists: the plugins bundled with the app, the reserved cc-community marketplace catalog CC reviews, and any third-party marketplace added on this host. The Marketplace column names the source; only cc-community is reviewed by CC",
    )
    .option("--json", "Output JSON")
    .action(
      action(async (query: string, opts: JsonOutputOptions) => {
        const results = await searchCatalog(getUrl(), query);
        if (opts.json) {
          outputJson(opts, results);
          return;
        }
        const showMarketplace = results.some((result) => !result.official);
        const showInstalls = results.some((result) => result.installs !== null);
        const rows = results.map((result) => [
          result.displayName,
          result.description,
          result.category ?? "Uncategorized",
          ...(showMarketplace ? [result.marketplaceDisplayName] : []),
          ...(showInstalls
            ? [
                result.installs === null
                  ? ""
                  : result.installs.toLocaleString("en-US"),
              ]
            : []),
          result.installed
            ? "✓ installed"
            : result.compatible
              ? "compatible"
              : `requires newer cc${result.incompatibleReason ? `: ${result.incompatibleReason}` : ""}`,
        ]);
        console.log(
          renderBorderlessTable(
            {
              head: [
                "Name",
                "Description",
                "Category",
                ...(showMarketplace ? ["Marketplace"] : []),
                ...(showInstalls ? ["Installs"] : []),
                "Status",
              ],
              colWidths: [
                showMarketplace ? 22 : 24,
                showMarketplace ? 30 : 38,
                24,
                ...(showMarketplace ? [22] : []),
                ...(showInstalls ? [10] : []),
                showMarketplace ? 34 : 40,
              ],
              trimTrailingWhitespace: true,
            },
            rows,
          ),
        );
      }),
    );

  plugin
    .command("list")
    .description("List installed plugins and their status")
    .option("--json", "Output JSON")
    .action(
      action(async (opts: JsonOutputOptions) => {
        const result = await createCliCcSdk(getUrl()).plugins.list();
        if (opts.json) {
          outputJson(opts, result);
          return;
        }
        if (result.plugins.length === 0) {
          console.log("No plugins installed.");
          return;
        }
        for (const entry of result.plugins) {
          printPlugin(entry);
        }
      }),
    );

  plugin
    .command("source <id>")
    .description("Show an installed plugin's resolved source and history")
    .option("--json", "Output JSON")
    .action(
      action(async (id: string, opts: JsonOutputOptions) => {
        const source = await createCliCcSdk(getUrl()).plugins.getSource({
          pluginId: id,
        });
        if (opts.json) {
          outputJson(opts, source);
          return;
        }
        console.log(`${id}`);
        console.log(`  requested: ${source.requested}`);
        console.log(`  resolved: ${source.resolved}`);
        if (source.subdirectory !== undefined) {
          console.log(`  subdirectory: ${source.subdirectory}`);
        }
        if (source.range !== undefined) console.log(`  range: ${source.range}`);
        if (source.tagPrefix !== undefined) {
          console.log(`  tag prefix: ${source.tagPrefix}`);
        }
        if (source.resolvedTag !== undefined) {
          console.log(`  tag: ${source.resolvedTag}`);
        }
        if (source.registry) console.log(`  registry: ${source.registry}`);
        if (source.integrity) console.log(`  integrity: ${source.integrity}`);
        if (source.engines.cc) {
          console.log(`  engines.cc: ${source.engines.cc}`);
        }
        if (source.engines.ccPluginSdk) {
          console.log(`  engines.ccPluginSdk: ${source.engines.ccPluginSdk}`);
        }
        if (source.installedAt !== undefined) {
          console.log(`  installed: ${formatAbsoluteDate(source.installedAt)}`);
        }
        if (source.history.length === 0) {
          console.log("  history: none");
          return;
        }
        console.log("  history:");
        for (const entry of source.history) {
          console.log(
            `    ${entry.version}  ${formatAbsoluteDate(entry.activatedAt)}`,
          );
        }
      }),
    );

  plugin
    .command("install <source>")
    .description(
      "Install a catalog entry by name or <entry>@<marketplace>, a Git repository URL, a local path, builtin:<name>, git:<url>[@<ref|semver-range>], or npm:<name>@<version>. A catalog entry from a third-party marketplace is not reviewed by CC, so its confirmation names the marketplace, the author, and the exact resolved source (managed sources validate engines ranges and build artifacts; bundled plugin ids are reserved)",
    )
    .option(
      "--subdirectory <path>",
      "Install one plugin directory of a multi-plugin git:/path: repository",
    )
    .option(
      "--plugin <name>",
      "Install the .cc/plugins.json entry with this name (git:/path: repositories)",
    )
    .option(
      "--tag-prefix <prefix>",
      "Resolve a git: semver range over <prefix>vX.Y.Z tags (monorepo tagging)",
    )
    .option("--yes", "Skip the confirmation prompt")
    .option("--json", "Output JSON")
    .action(
      action(
        async (
          source: string,
          opts: JsonOutputOptions & {
            yes?: boolean;
            subdirectory?: string;
            plugin?: string;
            tagPrefix?: string;
          },
        ) => {
          if (opts.subdirectory !== undefined && opts.plugin !== undefined) {
            throw new Error(
              "Use --subdirectory or --plugin, not both: --plugin resolves a name from .cc/plugins.json to a subdirectory.",
            );
          }
          const requested =
            opts.tagPrefix === undefined
              ? source
              : withGitTagPrefix(source, opts.tagPrefix);
          const intent = await resolveInstallIntent(getUrl(), requested);
          if (intent.kind === "catalog" && opts.tagPrefix !== undefined) {
            throw new Error(
              `"${source}" is a catalog entry; --tag-prefix applies to git: sources only.`,
            );
          }
          if (
            intent.kind === "catalog" &&
            (opts.subdirectory !== undefined || opts.plugin !== undefined)
          ) {
            throw new Error(
              `"${source}" is a catalog entry; --subdirectory and --plugin apply to git: and path: repositories only.`,
            );
          }
          let summary =
            intent.kind === "source"
              ? intent.summary
              : installPlanSummary(intent.plan);
          if (intent.kind === "source" && intent.source.startsWith("path:")) {
            const path = intent.source.slice(5);
            try {
              const raw: unknown = JSON.parse(
                await readFile(join(path, "package.json"), "utf8"),
              );
              const pkg = pluginPackageSummarySchema.parse(raw);
              if (pkg.name !== undefined) {
                summary = `Installing ${pkg.name}@${pkg.version ?? "?"} from ${path}`;
                const pluginId = derivePluginId(pkg.name);
                const { plugins } =
                  await createCliCcSdk(getUrl()).plugins.list();
                const installed = plugins.find((p) => p.id === pluginId);
                if (
                  installed !== undefined &&
                  installed.source.startsWith("path:") &&
                  installed.rootDir !== path
                ) {
                  summary = `${summary}\nThis moves "${pluginId}" from ${installed.rootDir}; its settings, secrets, and schedules are kept.`;
                }
              }
            } catch {}
          }
          if (opts.subdirectory !== undefined) {
            summary = `${summary} (subdirectory ${opts.subdirectory})`;
          }
          if (opts.plugin !== undefined) {
            summary = `${summary} (collection plugin ${opts.plugin})`;
          }
          if (!opts.json) {
            console.log(summary);
            console.log(
              "Plugins are full-trust code running inside the CC server. " +
                "They can read all local CC data, including other plugins' secrets.",
            );
          }
          await confirmPluginAction(
            "Install?",
            "Refusing to install without confirmation — re-run with --yes.",
            opts.yes === true,
          );
          const plugin =
            intent.kind === "source"
              ? await createCliCcSdk(getUrl()).plugins.install({
                  source: intent.source,
                  ...(opts.subdirectory === undefined
                    ? {}
                    : { subdirectory: opts.subdirectory }),
                  ...(opts.plugin === undefined ? {} : { plugin: opts.plugin }),
                })
              : await createCliCcSdk(getUrl()).plugins.catalog.install(
                  intent.plan.kind === "marketplace"
                    ? {
                        entryId: intent.plan.entryId,
                        marketplace: intent.plan.marketplace,
                        ...(intent.plan.official
                          ? {}
                          : { confirmedSource: intent.plan.resolvedSource }),
                      }
                    : { entryId: intent.plan.entryId },
                );
          const result = { ok: true as const, plugin };
          if (opts.json) {
            outputJson(opts, result);
            return;
          }
          console.log("Installed:");
          printPlugin(plugin);
        },
      ),
    );

  plugin
    .command("outdated")
    .description("Check installed plugins for compatible updates")
    .option("--json", "Output the raw update results as JSON")
    .action(
      action(async (opts: JsonOutputOptions) => {
        const results = await createCliCcSdk(getUrl()).plugins.checkUpdates();
        if (opts.json) {
          outputJson(opts, results);
          return;
        }
        const rows = results.map((result) => [
          result.id,
          result.installed.display,
          result.candidate?.display ?? "—",
          blockedSummary(result),
          `${UPDATE_STATUS_LABELS[result.outcome]}${result.devMode ? " [dev build: engines.cc not enforced]" : ""}`,
        ]);
        console.log(
          renderBorderlessTable(
            {
              head: [
                "Plugin",
                "Installed",
                "Latest compatible",
                "Blocked newer",
                "Status",
              ],
              colWidths: [22, 20, 22, 42, 54],
              trimTrailingWhitespace: true,
            },
            rows,
          ),
        );
      }),
    );

  plugin
    .command("update [id]")
    .description("Update one plugin, or all plugins with --all")
    .option("--all", "Update every plugin with a compatible update")
    .option("--yes", "Skip confirmation prompts")
    .action(
      action(
        async (
          id: string | undefined,
          opts: {
            all?: boolean;
            yes?: boolean;
          },
        ) => {
          if ((id === undefined) === !opts.all) {
            console.error("Specify exactly one plugin id or --all.");
            process.exit(1);
          }
          const sdk = createCliCcSdk(getUrl());
          const results = await sdk.plugins.checkUpdates(
            id === undefined ? {} : { pluginId: id },
          );
          const sources = new Map<string, string>();
          if (results.some((result) => result.outcome === "update-available")) {
            const list = await sdk.plugins.list();
            for (const entry of list.plugins)
              sources.set(entry.id, entry.sourceDisplay);
          }

          for (const result of results) {
            const source = sources.get(result.id) ?? "unknown source";
            const detail = updateDetail(result);
            const shouldAttempt = result.outcome === "update-available";

            if (!shouldAttempt) {
              if (result.outcome === "pinned") {
                console.log(
                  `${result.id}: skipped — pinned${detail ? ` (${detail})` : ""}; remove and reinstall with a tracking npm range, git branch, or git semver range to receive updates (remove deletes the plugin's settings, secrets, and schedules). A local path plugin updates with \`cc plugin reload\`; move it with \`cc plugin install path:<new directory>\`.`,
                );
              } else if (result.outcome === "incompatible") {
                console.log(
                  `${result.id}: skipped — incompatible${detail ? `: ${detail}` : "."}`,
                );
              } else if (result.outcome === "unavailable") {
                console.log(
                  `${result.id}: skipped — unavailable${detail ? `: ${detail}` : "."}`,
                );
              } else {
                console.log(
                  `${result.id}: current (${result.installed.display}).`,
                );
              }
              continue;
            }

            const target = result.candidate?.display ?? "latest compatible";
            console.log(
              `${result.id}: ${result.installed.display} → ${target} from ${source}. Plugins are full-trust code.`,
            );
            await confirmPluginAction(
              "Update and activate?",
              "Refusing to update without confirmation — re-run with --yes.",
              opts.yes === true,
            );

            let mutation: PluginApplyUpdateResult;
            try {
              mutation = await sdk.plugins.applyUpdate({
                pluginId: result.id,
              });
            } catch (error) {
              exitWithError({ error: sdkErrorMessage(error) });
            }
            if (mutation.applied) {
              console.log(
                `${result.id}: updated and activated ${mutation.from.display} → ${mutation.to?.display ?? target}.`,
              );
            } else {
              console.log(
                `${result.id}: ${mutation.outcome}${mutation.detail ? ` — ${mutation.detail}` : ""}`,
              );
            }
          }
        },
      ),
    );

  plugin
    .command("new <name>")
    .description(
      "Scaffold a plugin in ./cc-plugin-<name>; accepts @scope/cc-plugin-<name>",
    )
    .action(
      action(async (name: string) => {
        const target = resolveNewPluginTarget(name);
        if (target === null) {
          console.error(
            `Invalid or reserved plugin name "${name}" — use a non-core name, cc-plugin-name, or @scope/cc-plugin-name.`,
          );
          process.exit(1);
        }
        const { directoryName, packageName } = target;
        const targetDir = resolve(process.cwd(), directoryName);
        await scaffoldPlugin({
          targetDir,
          packageName,
          ccVersion: resolveCcCliVersion(),
          sdkSpecifier: BUNDLED_PLUGIN_SDK_SPECIFIER,
        });
        console.log(`Created ${directoryName}/ (${packageName}).`);
        await vendorPluginSdk(targetDir);
        const installed = await installScaffoldDependencies(targetDir);
        console.log("Next steps:");
        console.log(`  cd ${directoryName}`);
        if (!installed) {
          console.log("  npm install --include=dev");
        }
        console.log("  cc plugin install .");
      }),
    );

  plugin
    .command("types [path]")
    .description(
      "Sync a package-layout plugin's @codythatsme/plugin-sdk surface to the running cc (default: cwd): repin the npm devDependency and the declared type-only devDependencies of the packages cc shims at runtime (sonner, vaul, the portal radix families, ...); legacy vendored-layout plugins must migrate first",
    )
    .option(
      "--check",
      "Report whether the SDK surface is current; write nothing",
    )
    .action(
      action(async (path: string | undefined, opts: { check?: boolean }) => {
        const rootDir = resolve(process.cwd(), path ?? ".");
        const manifest = await requirePluginManifest(rootDir);
        const hasApp = typeof manifest.cc?.app === "string";
        const layout = await resolvePluginSdkLayout(rootDir);
        if (layout.kind === "vendored") {
          console.error(LEGACY_PLUGIN_SDK_LAYOUT_MESSAGE);
          process.exit(1);
        }
        if (layout.kind === "package") {
          if (opts.check) {
            console.log(
              `This plugin uses the npm package @codythatsme/plugin-sdk; pin is ${layout.pin ?? "not declared"}, host is ${PLUGIN_SDK_VERSION}.`,
            );
            const pending = await setPluginSdkPin({
              rootDir,
              sdkVersion: PLUGIN_SDK_VERSION,
              sdkSpecifier: BUNDLED_PLUGIN_SDK_SPECIFIER,
              dryRun: true,
            });
            if (pending === null) {
              console.log(
                "The declarations are in node_modules/@codythatsme/plugin-sdk/bundled-types/ — read them for exact signatures.",
              );
              return;
            }
            if (pending.pin !== null || pending.movedFromDependencies) {
              console.error(
                pending.pin === null
                  ? 'Move "@codythatsme/plugin-sdk" from dependencies to devDependencies — cc provides its runtime (`cc plugin types` does it for you).'
                  : `Set "@codythatsme/plugin-sdk" to ${PLUGIN_SDK_VERSION} in devDependencies and re-run npm install (\`cc plugin types\` does it for you).`,
              );
            }
            for (const shim of pending.shimmedTypePins) {
              console.error(
                shim.movedFromDependencies
                  ? `Move "${shim.name}" from dependencies to devDependencies at ${shim.to} — cc shims it at runtime and never bundles it (\`cc plugin types\` does it for you).`
                  : `Set "${shim.name}" to ${shim.to} in devDependencies — the version this cc shims at runtime (\`cc plugin types\` does it for you).`,
              );
            }
            process.exit(1);
          }
          await vendorPluginSdk(rootDir);
          const changed = await setPluginSdkPin({
            rootDir,
            sdkVersion: PLUGIN_SDK_VERSION,
            sdkSpecifier: BUNDLED_PLUGIN_SDK_SPECIFIER,
          });
          if (changed === null) {
            console.log(
              `@codythatsme/plugin-sdk is already pinned to ${PLUGIN_SDK_VERSION} — this cc's SDK version${hasApp ? ", and the declared runtime-shimmed packages are at this cc's versions" : ""}.`,
            );
            console.log(
              "The declarations are in node_modules/@codythatsme/plugin-sdk/bundled-types/ — read them for exact signatures.",
            );
            return;
          }
          if (changed.pin !== null) {
            console.log(
              `@codythatsme/plugin-sdk: ${changed.pin.from ?? "(not declared)"} → ${changed.pin.to} in devDependencies.`,
            );
          }
          if (changed.movedFromDependencies) {
            console.log(
              "Moved @codythatsme/plugin-sdk from dependencies to devDependencies.",
            );
          }
          for (const shim of changed.shimmedTypePins) {
            console.log(
              `${shim.name}: ${shim.from ?? "(not declared)"} → ${shim.to} in devDependencies${shim.movedFromDependencies ? " (moved from dependencies)" : ""}.`,
            );
          }
          console.log(
            "Run `npm install` in the plugin directory to install the pinned declarations.",
          );
          return;
        }
      }),
    );

  plugin
    .command("migrate [path]")
    .description(
      "Switch a plugin that vendors types/ to the @codythatsme/plugin-sdk npm package (default: cwd): pin the devDependency, drop the tsconfig path map, delete the vendored declarations, and rewrite pre-rename @cc/plugin-sdk imports in the plugin's sources; prints the plan and asks first",
    )
    .option("--yes", "Skip the confirmation prompt")
    .action(
      action(async (path: string | undefined, opts: { yes?: boolean }) => {
        const rootDir = resolve(process.cwd(), path ?? ".");
        await requirePluginManifest(rootDir);
        const layout = await resolvePluginSdkLayout(rootDir);
        const plan = await migratePluginToPackageLayout({
          rootDir,
          sdkVersion: PLUGIN_SDK_VERSION,
          sdkSpecifier: BUNDLED_PLUGIN_SDK_SPECIFIER,
          dryRun: true,
        });
        if (!plan.changed) {
          console.log(
            `Already migrated: this plugin uses the @codythatsme/plugin-sdk npm package (pin ${layout.pin ?? "not declared"}).`,
          );
          return;
        }
        console.log(
          layout.kind === "vendored"
            ? `${rootDir} vendors its SDK declarations. Migrating to the @codythatsme/plugin-sdk npm package will:`
            : `${rootDir} is missing part of the @codythatsme/plugin-sdk npm package layout. Completing the migration will:`,
        );
        printMigrationPlan(plan);
        await confirmPluginAction(
          "Apply these changes?",
          "Refusing to migrate without confirmation — re-run with --yes to apply the plan above.",
          opts.yes ?? false,
        );
        const confirmedPlan = await migratePluginToPackageLayout({
          rootDir,
          sdkVersion: PLUGIN_SDK_VERSION,
          sdkSpecifier: BUNDLED_PLUGIN_SDK_SPECIFIER,
          dryRun: true,
        });
        if (!samePlan(plan, confirmedPlan)) {
          console.error(
            "The plugin changed while awaiting confirmation — nothing was written. Re-run `cc plugin migrate` to see the current plan.",
          );
          process.exit(1);
        }
        const applied = await migratePluginToPackageLayout({
          rootDir,
          sdkVersion: PLUGIN_SDK_VERSION,
          sdkSpecifier: BUNDLED_PLUGIN_SDK_SPECIFIER,
        });
        console.log("Migrated to the @codythatsme/plugin-sdk npm package.");
        if (plan.removedTypesDir && !applied.removedTypesDir) {
          console.warn(
            `Warning: ${join(rootDir, "types")} still exists — a file appeared in it during the migration, so it was left in place along with the tsconfig "types" include.`,
          );
        }
        await vendorPluginSdk(rootDir);
        console.log(
          "Run `npm install` in the plugin directory to install the pinned declarations.",
        );
      }),
    );

  plugin
    .command("build [path]")
    .description(
      "Compile the plugin into dist/: the cc.server backend bundle (server.js, server.meta.json), plus, when declared, the cc.app frontend bundle (app.js, app.css, app.meta.json) and the self-contained cc.host daemon bundle (host.js, host.js.map, host.meta.json) — which carries the plugin's host RPC entry, its provider bridge, or both; each *.meta.json stamps SDK/identity metadata; no server required",
    )
    .action(
      action(async (path: string | undefined) => {
        const rootDir = resolve(process.cwd(), path ?? ".");
        const ccVersion = resolveCcCliVersion();
        const manifest = await readPluginManifest(rootDir);
        const hasApp = typeof manifest?.cc?.app === "string";
        const hasHost = typeof manifest?.cc?.host === "string";
        await checkPluginSdkLayout(rootDir);
        const toolchain = await cliBuildToolchain();
        const server = await buildPluginServer(rootDir, ccVersion, toolchain);
        const files = [server.jsPath, server.mapPath, server.metaPath];
        if (hasApp) {
          const app = await buildPluginApp(rootDir, ccVersion, toolchain);
          files.push(app.jsPath, app.cssPath, app.metaPath);
        }
        if (hasHost) {
          const host = await buildPluginHost(rootDir, ccVersion, toolchain);
          files.push(host.jsPath, host.mapPath, host.metaPath);
        }
        for (const file of files) {
          console.log(relative(process.cwd(), file));
        }
      }),
    );

  plugin
    .command("dev [path]")
    .description(
      "Watch a plugin's sources: rebuild its frontend (unminified, for readable stack traces), host, and provider-bridge bundles when declared, then reload it on every change (Ctrl+C to stop)",
    )
    .action(
      action(async (path: string | undefined) => {
        const rootDir = resolve(process.cwd(), path ?? ".");
        const manifest = await requirePluginManifest(rootDir);
        const hasApp = typeof manifest.cc?.app === "string";
        const hasHost = typeof manifest.cc?.host === "string";
        await checkPluginSdkLayout(rootDir);
        const realDir = await realpath(rootDir).catch(() => rootDir);
        const list = await createCliCcSdk(getUrl()).plugins.list();
        const entry = list.plugins.find(
          (candidate) =>
            candidate.rootDir === rootDir || candidate.rootDir === realDir,
        );
        if (!entry) {
          console.error(
            `This directory is not installed as a plugin — run \`cc plugin install ${path ?? "."}\` first, then re-run \`cc plugin dev\`.`,
          );
          process.exit(1);
        }
        const loop = createPluginDevLoop({
          pluginId: entry.id,
          // Re-read per cycle: a plugin can add or drop cc.app/cc.host while
          // being watched, and a stale snapshot would demand a build that can
          // never succeed again.
          targets: async () => {
            const current = await requirePluginManifest(rootDir);
            return {
              hasApp: typeof current.cc?.app === "string",
              hasHost: typeof current.cc?.host === "string",
            };
          },
          buildApp: async () => {
            await buildPluginApp(
              rootDir,
              resolveCcCliVersion(),
              await cliBuildToolchain(),
              { minify: false },
            );
          },
          buildHost: async () => {
            await buildPluginHost(
              rootDir,
              resolveCcCliVersion(),
              await cliBuildToolchain(),
            );
          },
          reloadPlugin: async () => {
            const result = pluginMutationResponseSchema.parse(
              await callPlugins(
                getUrl(),
                `/reload?id=${encodeURIComponent(entry.id)}`,
                "POST",
              ),
            );
            if (!result.ok) throw new Error(result.error ?? "reload failed");
          },
          log: (line) => console.log(line),
        });
        const watcher = watch(
          rootDir,
          { recursive: true },
          (_event, filename) => {
            if (typeof filename === "string" && filename.length > 0) {
              loop.handleChange(filename);
            }
          },
        );
        console.log(
          `Watching ${rootDir} for plugin "${entry.id}"${hasApp || hasHost ? ` (${[hasApp ? "frontend" : null, hasHost ? "host" : null].filter(Boolean).join(" + ")} rebuild + reload on change)` : " (reload on change)"} — Ctrl+C to stop.`,
        );
        await new Promise<void>((resolveDone) => {
          const stop = (): void => {
            watcher.close();
            loop.dispose();
            resolveDone();
          };
          process.once("SIGINT", stop);
          process.once("SIGTERM", stop);
        });
      }),
    );

  plugin
    .command("reload [id]")
    .description("Reload one plugin, or all plugins")
    .option("--json", "Output JSON")
    .action(
      action(async (id: string | undefined, opts: JsonOutputOptions) => {
        const query = id ? `?id=${encodeURIComponent(id)}` : "";
        const response = pluginMutationResponseSchema.parse(
          await callPlugins(getUrl(), `/reload${query}`, "POST"),
        );
        const result =
          id !== undefined &&
          response.ok &&
          !response.plugins?.some((entry) => entry.id === id)
            ? { ok: false as const, error: `unknown plugin "${id}"` }
            : response;
        if (outputMutationJson(opts, result)) return;
        const reloaded =
          id === undefined
            ? (result.plugins ?? [])
            : (result.plugins ?? []).filter((entry) => entry.id === id);
        for (const entry of reloaded) {
          printPlugin(entry);
        }
        if (!result.ok) exitWithError(result);
      }),
    );

  for (const [name, description] of [
    ["enable", "Enable an installed plugin"],
    ["disable", "Disable an installed plugin (its code is unloaded)"],
  ] as const) {
    plugin
      .command(`${name} <id>`)
      .description(description)
      .option("--json", "Output JSON")
      .action(
        action(async (id: string, opts: JsonOutputOptions) => {
          const result = pluginMutationResponseSchema.parse(
            await callPlugins(
              getUrl(),
              `/${encodeURIComponent(id)}/${name}`,
              "POST",
            ),
          );
          if (outputMutationJson(opts, result)) return;
          if (!result.ok || !result.plugin) exitWithError(result);
          printPlugin(result.plugin);
        }),
      );
  }

  plugin
    .command("safe-mode [state]")
    .description(
      "Show plugin safe mode, or turn it on or off. `on` stops every plugin you installed (official store plugins included) while plugins included with cc keep running; `off` restarts the ones that were enabled and exits 1 if any fail to start",
    )
    .option("--json", "Output JSON")
    .action(
      action(async (state: string | undefined, opts: JsonOutputOptions) => {
        if (state !== undefined && state !== "on" && state !== "off") {
          exitWithError({ error: `expected "on" or "off", got "${state}"` });
        }
        const plugins = createCliCcSdk(getUrl()).plugins;
        const updated =
          state === undefined
            ? null
            : await plugins.experimental_setSafeMode({
                enabled: state === "on",
              });
        const result = updated ?? (await plugins.experimental_getSafeMode());
        const problems = updated?.problems ?? [];
        if (opts.json) {
          outputJson(opts, result);
        } else {
          console.log(`Plugin safe mode is ${result.enabled ? "on" : "off"}.`);
          for (const problem of problems) console.error(problem);
        }
        if (problems.length > 0) process.exit(1);
      }),
    );

  plugin
    .command("config <id> [action] [key] [value]")
    .description(
      "Show a plugin's settings, or change them: config <id> set <key> <value> | config <id> unset <key>",
    )
    .option("--json", "Output JSON")
    .allowUnknownOption()
    .allowExcessArguments()
    .action(
      action(
        async (
          id: string,
          actionName: string | undefined,
          key: string | undefined,
          value: string | undefined,
          opts: JsonOutputOptions,
          command: Command,
        ) => {
          const rawArgs = (program as Command & { rawArgs: string[] }).rawArgs;
          const terminatorIndex = rawArgs.indexOf("--");
          const valueIsOption =
            value?.startsWith("-") === true &&
            (terminatorIndex < 0 ||
              terminatorIndex > rawArgs.lastIndexOf(value));
          const valueIsUnknownOption =
            valueIsOption &&
            (actionName !== "set" || !negativeNumberValuePattern.test(value));
          const unknownOption =
            [id, actionName, key, ...command.args.slice(4)].find((argument) =>
              argument?.startsWith("-"),
            ) ?? (valueIsUnknownOption ? value : undefined);
          if (unknownOption !== undefined)
            command.error(`error: unknown option '${unknownOption}'`);
          const expectedArgumentCount = actionName === "unset" ? 3 : 4;
          if (command.args.length > expectedArgumentCount)
            command.error(
              `error: too many arguments for 'config'. Expected ${expectedArgumentCount} arguments but got ${command.args.length}.`,
            );
          const settingsPath = `/${encodeURIComponent(id)}/settings`;
          if (actionName === undefined) {
            const result = pluginSettingsResultSchema.parse(
              await callPlugins(getUrl(), settingsPath, "GET"),
            );
            if (outputMutationJson(opts, result)) return;
            if (!result.ok) exitWithError(result);
            printSettings(result);
            return;
          }
          if (actionName !== "set" && actionName !== "unset") {
            console.error(
              `Unknown action "${actionName}" — use "set" or "unset".`,
            );
            process.exit(1);
          }
          if (
            key === undefined ||
            (actionName === "set" && value === undefined)
          ) {
            console.error(
              actionName === "set"
                ? "Usage: cc plugin config <id> set <key> <value>"
                : "Usage: cc plugin config <id> unset <key>",
            );
            process.exit(1);
          }
          let parsedValue: string | number | boolean | null = null;
          if (actionName === "set") {
            if (value === undefined) {
              console.error("Usage: cc plugin config <id> set <key> <value>");
              process.exit(1);
            }
            const current = pluginSettingsResultSchema.parse(
              await callPlugins(getUrl(), settingsPath, "GET"),
            );
            if (!current.ok || !current.schema) exitWithError(current);
            const descriptor = current.schema[key];
            if (!descriptor) {
              const known = Object.keys(current.schema).join(", ");
              console.error(
                `Unknown setting "${key}"${known ? ` — known settings: ${known}` : ""}`,
              );
              process.exit(1);
            }
            if (valueIsOption && descriptor.type !== "number") {
              command.error(`error: unknown option '${value}'`);
            }
            parsedValue = parseSettingValue(descriptor, key, value);
          }
          const result = pluginSettingsResultSchema.parse(
            await callPlugins(getUrl(), settingsPath, "PUT", {
              values: { [key]: parsedValue },
            }),
          );
          if (outputMutationJson(opts, result)) return;
          if (!result.ok) exitWithError(result);
          printSettings(result);
        },
      ),
    );

  plugin
    .command("token <id>")
    .description(
      'Print the plugin\'s HTTP token (for routes registered with auth: "token")',
    )
    .option("--rotate", "Generate a new token, invalidating the old one")
    .option("--json", "Output JSON")
    .action(
      action(
        async (id: string, opts: JsonOutputOptions & { rotate?: boolean }) => {
          const result = pluginTokenResultSchema.parse(
            await callPlugins(
              getUrl(),
              `/${encodeURIComponent(id)}/token`,
              "POST",
              opts.rotate ? { rotate: true } : {},
            ),
          );
          if (outputMutationJson(opts, result)) return;
          if (!result.ok || !result.token) exitWithError(result);
          console.log(result.token);
        },
      ),
    );

  plugin
    .command("run <id> [args...]")
    .description(
      "Run a plugin's CLI command (explicit form of `cc <command> ...`)",
    )
    .passThroughOptions()
    .allowUnknownOption()
    .helpOption(false)
    .action(
      action(async (id: string, args: string[]) => {
        process.exit(await runPluginCliCommand(getUrl(), id, args ?? []));
      }),
    );

  plugin
    .command("logs <id>")
    .description("Print a plugin's log (cc.log output)")
    .option("-n, --lines <count>", "Number of lines to show", "100")
    .option("-f, --follow", "Poll for new lines every second (Ctrl+C to stop)")
    .action(
      action(async (id: string, opts: { lines: string; follow?: boolean }) => {
        const requested = Number.parseInt(opts.lines, 10);
        const tail =
          Number.isFinite(requested) && requested > 0 ? requested : 100;
        const fetchTail = async (count: number): Promise<string[]> => {
          const result = pluginLogsResultSchema.parse(
            await callPlugins(
              getUrl(),
              `/${encodeURIComponent(id)}/logs?tail=${count}`,
              "GET",
            ),
          );
          if (!result.ok || !result.lines) exitWithError(result);
          return result.lines;
        };
        let lines = await fetchTail(tail);
        for (const line of lines) console.log(line);
        if (!opts.follow) return;
        for (;;) {
          await sleep(1000);
          const next = await fetchTail(1000);
          const lastPrinted = lines.at(-1);
          const startAfter =
            lastPrinted === undefined ? -1 : next.lastIndexOf(lastPrinted);
          for (const line of next.slice(startAfter + 1)) console.log(line);
          lines = next;
        }
      }),
    );

  plugin
    .command("remove <id>")
    .alias("uninstall")
    .description(
      "Remove an installed plugin and delete its settings, secrets, and schedules (git:/npm: managed files are deleted; local path sources stay on disk). To move a local plugin to another directory, install the new path instead",
    )
    .option("--json", "Output JSON")
    .addOption(new Option("--yes").hideHelp())
    .action(
      action(async (id: string, opts: JsonOutputOptions) => {
        const result = pluginMutationResponseSchema.parse(
          await callPlugins(getUrl(), `/${encodeURIComponent(id)}`, "DELETE"),
        );
        if (outputMutationJson(opts, result)) return;
        if (!result.ok) exitWithError(result);
        console.log(`Removed ${id}.`);
      }),
    );
}
