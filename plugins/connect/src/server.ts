import {
  createServerAccessRecheck,
  registerServerAccess,
} from "./server-access.js";
import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { registerConnectCli } from "./cli.js";
import { createKvCredentialStore } from "./credential.js";
import {
  connectRpcContract,
  createRpcHandlers,
  type MobilePairingGate,
} from "./rpc.js";
import { ShareRegistry } from "./shares.js";
import { ConnectTunnel } from "./tunnel.js";
import { ShareHostResolver } from "./hosts.js";
import { resolveLocalCloudLoopbackUrl } from "./local-loopback.js";
import { resolveDefaultConnectBaseUrl } from "./redeem.js";
import {
  CONNECT_REALTIME_CHANNEL,
  REMOTE_ACTIVITY_INSTRUCTIONS_MS,
} from "./types.js";

export default async function plugin(cc: CcPluginApi) {
  const settings = cc.settings.define({
    sendRemoteInstructions: {
      type: "boolean",
      label: "Tell agents about remote access",
      description:
        "When you use CC remotely, tell agents to share servers through Connect. Applies to new agent sessions.",
      default: true,
    },
  });
  let currentSettings = await settings.get();
  settings.onChange((next) => {
    currentSettings = next;
  });
  const store = createKvCredentialStore(cc.storage.kv);
  let tunnel!: ConnectTunnel;
  const hostResolver = new ShareHostResolver(() => cc.sdk);
  const getLoopbackBaseUrl = () =>
    resolveLocalCloudLoopbackUrl(
      tunnel.getCredential()?.serverUrl,
      process.env.CC_DEV_APP_PORT,
    ) ?? cc.server.loopbackBaseUrl;

  const shares = new ShareRegistry({
    kv: cc.storage.kv,
    hosts: cc.hosts,
    hostResolver,
    getLoopbackBaseUrl,
    getCredential: () => tunnel.getCredential(),
    log: cc.log,
    onChange: () => {
      cc.realtime.publish(CONNECT_REALTIME_CHANNEL, tunnel.status());
    },
  });

  cc.events.on("experimental_host.deleted", async ({ host }) => {
    await shares.pruneHost(host.id);
  });

  const recheckServerAccess = createServerAccessRecheck(cc);
  tunnel = new ConnectTunnel({
    store,
    shares,
    defaultBaseUrl: resolveDefaultConnectBaseUrl(process.env),
    getLoopbackBaseUrl,
    log: cc.log,
    onStatusChange: (status) => {
      cc.realtime.publish(CONNECT_REALTIME_CHANNEL, status);
      recheckServerAccess(status);
    },
  });

  await registerServerAccess(cc, tunnel);

  const mobilePairing: MobilePairingGate = {
    enabled: async () => (await cc.sdk.system.config()).experiments.mobileApp,
  };

  cc.rpc.register(
    connectRpcContract,
    createRpcHandlers(tunnel, hostResolver, mobilePairing),
  );
  registerConnectCli({ cc, tunnel, hostResolver, mobilePairing });

  cc.agents.contributeInstructions(() => {
    if (!currentSettings.sendRemoteInstructions) return null;
    const status = tunnel.status();
    if (!status.paired || status.url === null) return null;
    const recent =
      status.remoteClients > 0 ||
      (status.lastRemoteActivityAt !== null &&
        Date.now() - status.lastRemoteActivityAt <
          REMOTE_ACTIVITY_INSTRUCTIONS_MS);
    if (!recent) return null;
    return (
      `The user is currently viewing this cc remotely at ${status.url}. ` +
      "Port shares work from a thread on any enrolled host: when you start an HTTP server they should see, run `cc connect expose <port>` from that thread. " +
      "The command returns the correct public URL for the thread's host; give it to them as a markdown link because a localhost URL will not work remotely."
    );
  });

  cc.background.service("tunnel", {
    async start(signal) {
      await tunnel.start();
      await new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        signal.addEventListener("abort", () => resolve(), { once: true });
      });
      tunnel.stop();
    },
  });
}
