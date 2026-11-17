import {
  PluginCliError,
  cliCommand,
  defineCli,
  type CcPluginApi,
  type PluginCliResult,
} from "@codythatsme/plugin-sdk";
import { AccountError, type AccountService } from "./account.js";
import type { AccountStatus, LoginView, SignOutResult } from "./contract.js";
import { HostedRequestError, RedeemError } from "./hosted.js";
import type { LinkLogins } from "./login.js";
import { resolveBaseUrl, type BaseUrlPolicy } from "./rpc.js";

const DESCRIPTION = [
  "Sign this cc in to your cc.example.invalid account. cc account holds the server",
  "credential that remote access (cc connect) and hosted services use.",
  "",
  "  cc account login          Print a cc.example.invalid link and code to approve",
  "  cc account login --wait   Wait here until that sign-in finishes",
  "  cc account login --code <code>",
  "                            Pair with a one-time code from the dashboard",
].join("\n");

const JSON_OPTION = {
  type: "boolean",
  description: "Emit machine-readable JSON",
} as const;

const REDEEM_ERROR_TEXT: Record<RedeemError["code"], string> = {
  invalid_code:
    "that code is invalid or has expired — get a new one from the cc.example.invalid dashboard",
  expired_code:
    "that code has expired — get a new one from the cc.example.invalid dashboard",
  already_used:
    "that code was already used — get a new one from the cc.example.invalid dashboard",
  network: "couldn't reach cc.example.invalid — check the connection and try again",
};

const HOSTED_ERROR_TEXT: Partial<Record<HostedRequestError["code"], string>> = {
  rate_limited:
    "too many sign-in attempts from this network — wait a minute, then try again",
  unavailable:
    "cc.example.invalid couldn't handle that request right now — try again in a minute",
};

function asJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatAccount(status: AccountStatus): string {
  if (status.state === "profile-pending") {
    return [
      "Paired with cc.example.invalid, but cc hasn't loaded the account yet; it keeps retrying.",
      "Remote access and hosted services start once it does. Check this machine's",
      "connection, or run `cc account logout` to sign out and start over.",
    ].join("\n");
  }
  if (status.account === null) {
    return "Not signed in. Run `cc account login` to sign in.";
  }
  const account = status.account;
  const login =
    account.githubLogin === null ? "" : ` (@${account.githubLogin})`;
  return [
    `Signed in as ${account.name}${login}`,
    `  Handle:  ${account.handle ?? "none yet"}`,
    `  Server:  ${account.serverLabel}  ${account.serverUrl}`,
  ].join("\n");
}

function formatPendingLogin(view: LoginView): string {
  const minutes = Math.max(
    0,
    Math.round((view.expiresAt - Date.now()) / 60_000),
  );
  return [
    "To sign in this cc, open:",
    `  ${view.verificationUrl}`,
    `and confirm the code ${view.userCode}. It expires in about ${minutes} min.`,
    "",
    "cc finishes signing in on its own once you approve. To wait here for the",
    "result, run:",
    "  cc account login --wait",
  ].join("\n");
}

function formatSignOut(result: SignOutResult): string {
  switch (result.revocation) {
    case "not-signed-in":
      return "Not signed in.";
    case "revoked":
      return "Signed out. Remote access and hosted services stop until you sign in again.";
    case "failed":
      return [
        "Signed out on this cc, but cc.example.invalid didn't confirm it revoked this server",
        `(${result.message}). Remove the server at ${result.dashboardUrl}.`,
      ].join("\n");
  }
}

function loginFailure(view: LoginView): PluginCliError {
  const reason = view.message ?? `sign-in ${view.state}`;
  return new PluginCliError(
    `${reason} Run \`cc account login\` to start again.`,
    { code: `login_${view.state.replace("-", "_")}` },
  );
}

function accountFailure(error: unknown): PluginCliError {
  if (error instanceof PluginCliError) return error;
  if (error instanceof RedeemError) {
    return new PluginCliError(REDEEM_ERROR_TEXT[error.code], {
      code: error.code,
    });
  }
  if (error instanceof AccountError) {
    return new PluginCliError(error.message, { code: error.code });
  }
  if (error instanceof HostedRequestError) {
    return new PluginCliError(HOSTED_ERROR_TEXT[error.code] ?? error.message, {
      code: error.code,
    });
  }
  return new PluginCliError(
    error instanceof Error ? error.message : String(error),
    { code: "account_failed" },
  );
}

async function attempt(
  work: () => Promise<PluginCliResult>,
): Promise<PluginCliResult> {
  try {
    return await work();
  } catch (error) {
    throw accountFailure(error);
  }
}

export function registerAccountCli(args: {
  cc: Pick<CcPluginApi, "cli">;
  account: AccountService;
  logins: LinkLogins;
  baseUrls: BaseUrlPolicy;
}): void {
  const { cc, account, logins, baseUrls } = args;
  cc.cli.register(
    defineCli({
      name: "account",
      summary: "Sign this cc in to your cc.example.invalid account",
      description: DESCRIPTION,
      root: cliCommand({
        summary: "Show how to sign in",
        run: (input) => ({ exitCode: 0, stdout: input.help }),
      }),
      commands: {
        status: cliCommand({
          summary: "Show which cc.example.invalid account this cc is signed in to",
          options: { json: JSON_OPTION },
          run: (input) => {
            const status = account.status();
            const login = logins.view(null);
            if (input.options.json) {
              return { exitCode: 0, stdout: asJson({ ...status, login }) };
            }
            const lines = [formatAccount(status)];
            if (login !== null && login.state === "pending") {
              lines.push(
                "",
                `Sign-in waiting for approval: open ${login.verificationUrl} and confirm ${login.userCode}.`,
              );
            }
            return { exitCode: 0, stdout: `${lines.join("\n")}\n` };
          },
        }),
        login: cliCommand({
          summary: "Sign in with a cc.example.invalid link, or pair with a code",
          description:
            "Without --code, prints a cc.example.invalid link and a code to approve in any browser, then returns; cc keeps checking and signs in once you approve. --wait waits for that sign-in to finish. Signing in replaces the account this cc is signed in to.",
          options: {
            code: {
              type: "string",
              placeholder: "code",
              description: "One-time pairing code from the cc.example.invalid dashboard",
            },
            wait: {
              type: "boolean",
              description:
                "Wait until the sign-in started by `cc account login` is approved, denied, or expires",
            },
            "base-url": {
              type: "string",
              placeholder: "url",
              description:
                "cc.example.invalid origin: https://cc.example.invalid or https://cc-staging.example.invalid (development builds also accept http://cc.localhost:<port>)",
            },
            json: JSON_OPTION,
          },
          constraints: [
            { kind: "at-most-one", options: ["code", "wait"] },
            { kind: "at-most-one", options: ["wait", "base-url"] },
          ],
          run: (input, ctx) =>
            attempt(async () => {
              const baseUrl = resolveBaseUrl(
                input.options["base-url"] ?? null,
                baseUrls,
              );
              if (input.options.code !== undefined) {
                const status = await logins.redeemCode(
                  input.options.code.trim(),
                  baseUrl,
                );
                return {
                  exitCode: 0,
                  stdout: input.options.json
                    ? asJson(status)
                    : `${formatAccount(status)}\n`,
                };
              }
              if (input.options.wait) {
                const view = await logins.wait(ctx.signal);
                if (view === null) {
                  throw new PluginCliError(
                    "no sign-in is in progress — run `cc account login` first",
                    { code: "no_login" },
                  );
                }
                if (view.state === "pending") {
                  throw new PluginCliError(
                    "stopped waiting; the sign-in is still open",
                    { code: "login_pending" },
                  );
                }
                if (view.state !== "signed-in") throw loginFailure(view);
                const status = account.status();
                return {
                  exitCode: 0,
                  stdout: input.options.json
                    ? asJson({ ...status, login: view })
                    : `${formatAccount(status)}\n`,
                };
              }
              const view = await logins.start(baseUrl);
              return {
                exitCode: 0,
                stdout: input.options.json
                  ? asJson({ login: view, status: account.status() })
                  : `${formatPendingLogin(view)}\n`,
              };
            }),
        }),
        logout: cliCommand({
          summary: "Sign out and forget this cc's cc.example.invalid pairing",
          description:
            "Revokes the server credential on cc.example.invalid and forgets it here, and cancels a sign-in that is waiting for approval. Remote access and hosted services stop until you sign in again. If cc.example.invalid can't be reached, cc still signs out here and says so; remove the server from the cc.example.invalid dashboard.",
          options: { json: JSON_OPTION },
          run: (input) =>
            attempt(async () => {
              const result = await logins.signOut();
              return {
                exitCode: 0,
                stdout: input.options.json
                  ? asJson(result)
                  : `${formatSignOut(result)}\n`,
              };
            }),
        }),
      },
    }),
  );
}
