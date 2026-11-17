import {
  PluginCliError,
  cliCommand,
  defineCli,
  type CcPluginApi,
  type PluginCliResult,
} from "@codythatsme/plugin-sdk";
import type { ConnectNextControls } from "./rpc.js";
import type { ConnectNextStatus } from "./types.js";

const NEXT_ADDRESS = "https://<label>.next.<account domain>";

const DESCRIPTION = [
  `Beta: also reach this cc at ${NEXT_ADDRESS} through cc's Fly gate.`,
  "The domain follows the cc account this cc is signed in to: https://<label>.next.cc.example.invalid for cc.example.invalid.",
  "cc connect (https://<label>.cc.example.invalid) keeps working; both addresses answer at once.",
  "",
  "It is on as soon as this plugin is enabled and this cc is signed in to your cc account",
  "(cc account login).",
  "",
  "`cc connect-next off` closes the connect next tunnel and leaves cc connect alone;",
  "`cc connect-next on` opens it again.",
  "Ports shared from the cc server's machine with `cc connect expose <port>` also answer at",
  "https://<label>--<port>.next.<account domain> (owner only); `cc connect-next status` lists them.",
  "Ports shared from other enrolled machines with `cc connect expose <port> --host <machine>` answer at",
  "https://<machine-label>--<port>.next.<account domain>; each machine's daemon runs its own tunnel.",
].join("\n");

const JSON_OPTION = {
  type: "boolean",
  description: "Emit machine-readable JSON",
} as const;

const MACHINE_STATE_TEXT: Record<
  ConnectNextStatus["machines"][number]["state"],
  string
> = {
  idle: "idle",
  connecting: "connecting",
  connected: "connected",
  refused: "credential refused",
  offline: "offline",
  error: "error",
};

const STATE_TEXT: Record<ConnectNextStatus["state"], string> = {
  off: "off",
  "signed-out": "waiting for a cc account sign-in",
  connecting: "connecting",
  connected: "connected",
  refused: "credential refused",
  offline: "offline",
  error: "error",
};

export function formatStatus(status: ConnectNextStatus): string {
  if (!status.enabled) {
    return status.url === null
      ? "connect next is off. Run `cc connect-next on` to also reach this cc at its next address."
      : `connect next is off. Run \`cc connect-next on\` to also reach this cc at ${status.url}.`;
  }
  if (status.label === null) {
    return "connect next is on, but this cc isn't signed in to a cc account. Run `cc account login`; the tunnel starts once it is.";
  }
  const lines = [`${status.label}  ${status.url}  ${STATE_TEXT[status.state]}`];
  if (status.lastError !== null && status.state !== "connected") {
    lines.push(`  last error: ${status.lastError}`);
  }
  if (status.nextRetryAt !== null && status.state !== "connected") {
    lines.push(`  next try: ${new Date(status.nextRetryAt).toISOString()}`);
  }
  lines.push(`  gate: ${status.server}`);
  for (const share of status.shares) {
    lines.push(
      `  share ${share.port}  ${share.url}  ${share.state}${share.error === null ? "" : ` (${share.error})`}`,
    );
  }
  for (const machine of status.machines) {
    lines.push(
      `machine ${machine.hostName} (${machine.hostId})  ${machine.label ?? "no label yet"}  ${MACHINE_STATE_TEXT[machine.state]}`,
    );
    if (machine.lastError !== null && machine.state !== "connected") {
      lines.push(`  last error: ${machine.lastError}`);
    }
    for (const share of machine.shares) {
      lines.push(
        `  share ${share.port}  ${share.url}  ${share.state}${share.error === null ? "" : ` (${share.error})`}`,
      );
    }
  }
  return lines.join("\n");
}

function asJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function attempt(
  work: () => Promise<PluginCliResult>,
): Promise<PluginCliResult> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PluginCliError) throw error;
    throw new PluginCliError(
      error instanceof Error ? error.message : String(error),
      { code: "connect_next_failed" },
    );
  }
}

export function registerConnectNextCli(
  cc: Pick<CcPluginApi, "cli">,
  controls: ConnectNextControls,
): void {
  cc.cli.register(
    defineCli({
      name: "connect-next",
      summary: `Beta: also reach this cc at ${NEXT_ADDRESS}`,
      description: DESCRIPTION,
      commands: {
        status: cliCommand({
          summary: "Show the connect next tunnel status and address",
          options: { json: JSON_OPTION },
          run: (input) =>
            attempt(async () => {
              const status = controls.status();
              return {
                exitCode: 0,
                stdout: input.options.json
                  ? asJson(status)
                  : `${formatStatus(status)}\n`,
              };
            }),
        }),
        on: cliCommand({
          summary: `Reach this cc at ${NEXT_ADDRESS} as well`,
          options: { json: JSON_OPTION },
          run: (input) =>
            attempt(async () => {
              const status = await controls.setEnabled(true);
              if (input.options.json) {
                return { exitCode: 0, stdout: asJson(status) };
              }
              return {
                exitCode: 0,
                stdout:
                  status.url === null
                    ? "connect next is on. Run `cc account login` to sign in; the tunnel starts once you do.\n"
                    : `connect next is on — this cc will answer at ${status.url}\n`,
              };
            }),
        }),
        off: cliCommand({
          summary: "Close the connect next tunnel; cc connect is unaffected",
          options: { json: JSON_OPTION },
          run: (input) =>
            attempt(async () => {
              const status = await controls.setEnabled(false);
              return {
                exitCode: 0,
                stdout: input.options.json
                  ? asJson(status)
                  : "connect next is off. cc connect and local access are unaffected.\n",
              };
            }),
        }),
      },
    }),
  );
}
