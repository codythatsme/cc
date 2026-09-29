import { registerUsageSource } from "./usage-source.js";
import {
  createUpstreamTransport,
  transportErrorCode,
} from "./upstream-transport.js";
import path from "node:path";
import { z } from "zod";
import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { registerPoolCli } from "./cli.js";
import {
  accountPoolConfigSchema,
  accountPoolConfigSetInputSchema,
  poolAvailabilitySchema,
  type AccountPoolConfigController,
  type PoolProvider,
  type PoolStatus,
} from "./contracts.js";
import {
  AVAILABILITY_PATH,
  PARENT_TOKEN_ENV,
  PARENT_URL_ENV,
  ParentAvailability,
  readParentPool,
  type ParentPool,
} from "./parent-pool.js";
import type {
  ImportedClaudeCredentials,
  ImportedCodexCredentials,
} from "./credentials.js";
import { createHub } from "./hub.js";
import { PoolOperations } from "./operations.js";
import { accountPoolRpcContract, createRpcHandlers } from "./rpc.js";
import { ClaudeOAuthLogin } from "./oauth-login.js";
import { CodexDeviceLogin } from "./codex-device-login.js";
import {
  ACCOUNT_POOL_ACCOUNTS_CHANGED,
  ACCOUNT_POOL_CONFIG_CHANGED,
} from "./realtime.js";
import {
  AccountStore,
  HubTokenStore,
  PoolAffinityStore,
  QUOTA_MIGRATIONS,
  QuotaStore,
  RoutingStore,
} from "./store.js";

export interface AccountPoolPluginOptions {
  fetch?: typeof fetch;
  now?: () => number;
  env?: NodeJS.ProcessEnv;
  availabilityTtlMs?: number;
  refreshUrl?: string;
  codexRefreshUrl?: string;
  codexUsageUrl?: string;
  usageUrl?: string;
  drainTimeoutMs?: number;
  maxAffinityBindings?: number;
  disposeTimeoutMs?: number;
  importCredentials?: () => Promise<ImportedClaudeCredentials>;
  importCodexCredentials?: () => Promise<ImportedCodexCredentials>;
  oauthAuthorizeUrl?: string;
  oauthTokenUrl?: string;
  oauthProfileUrl?: string;
  codexAuthBaseUrl?: string;
}

const DISPOSE_INSPECTION_TIMEOUT_MS = 2_000;
const DISPOSE_INSPECTION_TIMEOUT = Symbol("dispose-inspection-timeout");
const HUB_BASE_PATH = "/api/v1/plugins/account-pool/http";

const PROVIDER_ROUTING_ENV: Record<PoolProvider, readonly string[]> = {
  claude: ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"],
  codex: ["CODEX_OPENAI_BASE_URL", "CODEX_POOL_AUTH_TOKEN"],
};

interface PoolEnvEntry {
  name: string;
  value: string | { serverPath: string };
  reason: string;
}

export function helloResponse(): Response {
  return new Response(null, { status: 200 });
}

export function createAccountPoolPlugin(
  options: AccountPoolPluginOptions = {},
) {
  return async function accountPoolPlugin(cc: CcPluginApi): Promise<void> {
    const storedConfig = z.record(z.string(), z.unknown()).parse(
      (await cc.storage.kv.get("config")) ?? {},
    );
    const hasRemovedSettings =
      "cacheMissDebug" in storedConfig || "cacheMissMinTokens" in storedConfig;
    delete storedConfig.cacheMissDebug;
    delete storedConfig.cacheMissMinTokens;
    let currentSettings = accountPoolConfigSchema.parse(storedConfig);
    if (hasRemovedSettings) {
      await cc.storage.kv.set("config", currentSettings);
    }
    const config: AccountPoolConfigController = {
      get: () => currentSettings,
      set: async (input) => {
        const update = accountPoolConfigSetInputSchema.parse(input);
        const next = accountPoolConfigSchema.parse({
          ...currentSettings,
          ...update,
        });
        await cc.storage.kv.set("config", next);
        currentSettings = next;
        cc.realtime.publish(ACCOUNT_POOL_CONFIG_CHANGED, {});
        return next;
      },
    };
    const secretDir = path.join(
      cc.server.experimental_dataDir,
      "plugins",
      cc.pluginId,
      "secrets",
      "accounts",
    );
    const accounts = new AccountStore(cc.storage.kv, secretDir);
    await accounts.initialize();
    const now = options.now ?? Date.now;
    const hubTokens = new HubTokenStore(secretDir, now);
    await hubTokens.initialize();
    const enrolledHosts = await cc.sdk.hosts.list();
    await hubTokens.prune(enrolledHosts.map((host) => host.id));
    const routing = new RoutingStore(cc.storage.kv, now);
    const parentPool = readParentPool(options.env ?? process.env);
    const proxyingParent = (): ParentPool | null =>
      parentPool !== null && currentSettings.parentMode === "proxy"
        ? parentPool
        : null;
    const db = cc.storage.database();
    cc.storage.migrate(db, QUOTA_MIGRATIONS);
    const quotas = new QuotaStore(db);
    const transport =
      options.fetch === undefined ? createUpstreamTransport() : null;
    const upstreamFetch = options.fetch ?? transport?.fetch;
    const hub = createHub({
      accounts,
      quotas,
      affinity: new PoolAffinityStore(db),
      hubTokens,
      getSettings: () => currentSettings,
      fetch: upstreamFetch,
      now,
      refreshUrl: options.refreshUrl,
      codexRefreshUrl: options.codexRefreshUrl,
      codexUsageUrl: options.codexUsageUrl,
      usageUrl: options.usageUrl,
      profileUrl: options.oauthProfileUrl,
      importClaudeCredentials: options.importCredentials,
      importCodexCredentials: options.importCodexCredentials,
      drainTimeoutMs: options.drainTimeoutMs,
      maxAffinityBindings: options.maxAffinityBindings,
      getParentRoute: proxyingParent,
      onUpstreamError: (provider, error) =>
        cc.log.warn(
          `Account Pooler ${provider} transport failed: ${transportErrorCode(error)}.`,
        ),
      onAccountsChanged: () =>
        cc.realtime.publish(ACCOUNT_POOL_ACCOUNTS_CHANGED, {}),
    });
    if (transport !== null) {
      cc.onDispose(async () => {
        await hub.stop();
        await transport.destroy();
      });
    }
    const availability =
      parentPool === null
        ? null
        : new ParentAvailability({
            parent: parentPool,
            fetch: upstreamFetch ?? fetch,
            now,
            ...(options.availabilityTtlMs === undefined
              ? {}
              : { ttlMs: options.availabilityTtlMs }),
            onError: (error) =>
              cc.log.warn(
                `Account Pooler could not read parent availability: ${error instanceof Error ? error.message : String(error)}.`,
              ),
          });
    const parentStatus = async (): Promise<PoolStatus["parent"]> =>
      parentPool === null || availability === null
        ? null
        : {
            baseUrl: parentPool.baseUrl,
            mode: currentSettings.parentMode,
            availability: await availability.get(),
          };
    const operations = new PoolOperations(
      accounts,
      quotas,
      hub,
      hubTokens,
      routing,
      () => cc.sdk.hosts.list(),
      async (hostId) =>
        (await cc.sdk.system.providerStates({ hostId })).providers,
      now,
      () => cc.realtime.publish(ACCOUNT_POOL_ACCOUNTS_CHANGED, {}),
      (accountId) => hub.refreshUsage(accountId, true),
      parentStatus,
    );
    const login = new ClaudeOAuthLogin({
      fetch: upstreamFetch,
      now,
      authorizeUrl: options.oauthAuthorizeUrl,
      tokenUrl: options.oauthTokenUrl,
      profileUrl: options.oauthProfileUrl,
      addAccount: (authenticated) => operations.addOAuth(authenticated),
    });
    const codexLogin = new CodexDeviceLogin({
      fetch: upstreamFetch,
      now,
      authBaseUrl: options.codexAuthBaseUrl,
      addAccount: (authenticated) => operations.addCodexOAuth(authenticated),
    });
    if ((await accounts.list()).every((account) => !account.enabled)) {
      cc.status.needsConfiguration(
        "Add and enable a Claude or Codex account with `cc pool account add`.",
      );
    }
    registerUsageSource(cc, hub);
    cc.rpc.register(
      accountPoolRpcContract,
      createRpcHandlers(operations, login, codexLogin, config),
    );
    registerPoolCli(cc, operations, login, codexLogin, config);
    const canServe = async (provider: PoolProvider): Promise<boolean> => {
      if (!(await operations.isRoutingEnabled(provider))) return false;
      if (proxyingParent() !== null && availability !== null) {
        return (await availability.get())[provider];
      }
      return operations.hasUsableEnabledAccount(provider);
    };
    const markerEntries = (token: string): PoolEnvEntry[] => [
      {
        name: PARENT_URL_ENV,
        value: { serverPath: HUB_BASE_PATH },
        reason: "Account Pooler hub for nested cc servers on this machine",
      },
      {
        name: PARENT_TOKEN_ENV,
        value: token,
        reason: "Account Pooler hub token for this machine",
      },
    ];
    const neutralized = (provider: PoolProvider): PoolEnvEntry[] =>
      PROVIDER_ROUTING_ENV[provider].map((name) => ({
        name,
        value: "",
        reason:
          "Account Pooler is isolated from the parent cc server's pool on this instance",
      }));
    const contributeFor =
      (provider: PoolProvider, serving: (token: string) => PoolEnvEntry[]) =>
      async (context: { threadId: string; hostId: string }) => {
        const bypassed = await routing.isBypassed(context.threadId);
        if (!bypassed && (await canServe(provider))) {
          const token = await hubTokens.forHost(context.hostId);
          if (provider === "claude") {
            await routing.recordRouted(context.threadId, context.hostId);
          }
          return [...serving(token), ...markerEntries(token)];
        }
        return parentPool === null ? [] : neutralized(provider);
      };
    const proxiedHealth = async (provider: PoolProvider) =>
      (await canServe(provider))
        ? {
            label: "Proxied",
            statusMessage:
              proxyingParent() === null
                ? "Credentials are provided by the Account Pooler hub."
                : "Credentials are proxied to the parent cc server's Account Pooler.",
          }
        : null;
    cc.providers.experimental_contributeEnv(
      "claude-code",
      contributeFor("claude", (token) => [
        {
          name: "ANTHROPIC_BASE_URL",
          value: { serverPath: HUB_BASE_PATH },
          reason: "Routed through the Account Pooler hub",
        },
        {
          name: "ANTHROPIC_AUTH_TOKEN",
          value: token,
          reason: "Account Pooler hub token for this machine",
        },
        {
          name: "ENABLE_TOOL_SEARCH",
          value: "true",
          reason:
            "Claude Code turns tool search off behind a custom base URL; the hub forwards tool_reference blocks",
        },
      ]),
    );
    cc.providers.experimental_contributeEnvHealth("claude-code", () =>
      proxiedHealth("claude"),
    );
    cc.providers.experimental_contributeEnv(
      "codex",
      contributeFor("codex", (token) => [
        {
          name: "CODEX_OPENAI_BASE_URL",
          value: { serverPath: `${HUB_BASE_PATH}/v1` },
          reason: "Routed through the Account Pooler hub",
        },
        {
          name: "CODEX_POOL_AUTH_TOKEN",
          value: token,
          reason: "Account Pooler hub token for this machine",
        },
      ]),
    );
    cc.providers.experimental_contributeEnvHealth("codex", () =>
      proxiedHealth("codex"),
    );
    cc.onDispose(async () => {
      codexLogin.dispose();
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        const inspection = inspectDisableState(cc, operations);
        const timeout = new Promise<typeof DISPOSE_INSPECTION_TIMEOUT>(
          (resolve) => {
            timer = setTimeout(
              () => resolve(DISPOSE_INSPECTION_TIMEOUT),
              options.disposeTimeoutMs ?? DISPOSE_INSPECTION_TIMEOUT_MS,
            );
            timer.unref();
          },
        );
        const result = await Promise.race([inspection, timeout]);
        if (result === DISPOSE_INSPECTION_TIMEOUT) {
          cc.log.debug("Account Pooler disable inspection timed out.");
          return;
        }
        if (result !== null) cc.log.warn(result);
      } catch (error) {
        cc.log.debug(
          `Account Pooler disable inspection skipped: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    });
    for (const route of ["/v1/messages", "/v1/messages/count_tokens"]) {
      cc.http.route(
        "POST",
        route,
        (context) => hub.handle(context.req.raw, "claude", route),
        { auth: "none" },
      );
    }
    for (const route of [
      "/v1/responses",
      "/v1/images/generations",
      "/v1/images/edits",
      "/v1/alpha/search",
    ]) {
      cc.http.route(
        "POST",
        route,
        (context) => hub.handle(context.req.raw, "codex", route),
        { auth: "none" },
      );
    }
    cc.http.route(
      "GET",
      "/v1/models",
      (context) => hub.handle(context.req.raw, "codex", "/v1/models"),
      { auth: "none" },
    );
    cc.http.route(
      "GET",
      AVAILABILITY_PATH,
      async (context) => {
        if ((await hub.authenticate(context.req.raw)) === null) {
          return new Response(null, { status: 401 });
        }
        return Response.json(
          poolAvailabilitySchema.parse({
            claude: await canServe("claude"),
            codex: await canServe("codex"),
          }),
        );
      },
      { auth: "none" },
    );
    cc.http.route("HEAD", "/api/hello", () => helloResponse(), {
      auth: "none",
    });
    cc.background.service("hub", {
      start: (signal) => hub.start(signal),
    });
  };
}

async function inspectDisableState(
  cc: CcPluginApi,
  operations: PoolOperations,
): Promise<string | null> {
  const installed = await cc.sdk.plugins.list();
  const disabled =
    installed.plugins.find((plugin) => plugin.id === cc.pluginId)?.enabled ===
    false;
  if (!disabled) return null;
  const warnings = await operations.routedThreadsWithoutLocalLogin();
  if (warnings.length === 0) return null;
  return `Account Pooler disabled with ${warnings.length} recently routed thread${warnings.length === 1 ? "" : "s"} on machines without a local Claude login. Run cc pool status before disabling to inspect them.`;
}

export default createAccountPoolPlugin();
