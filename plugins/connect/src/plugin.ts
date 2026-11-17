import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import {
  createAccountClient,
  watchAccount,
} from "cc-plugin-cc-account/src/client.js";
import { resolveDefaultConnectBaseUrl } from "@cc/connect-client";
import { registerConnectCli } from "./cli.js";
import { HostedConnectApi } from "./hosted.js";
import { ShareHostResolver } from "./hosts.js";
import {
  CredentialCopy,
  createCredentialCopyStore,
} from "./credential-copy.js";
import { resolveLocalCloudLoopbackUrl } from "./local-loopback.js";
import {
  connectRpcContract,
  createRpcHandlers,
  type RemoteAccessSwitch,
} from "./rpc.js";
import {
  createServerAccessCloud,
  createServerAccessRecheck,
  registerServerAccess,
} from "./server-access.js";
import { NextAddress, nextSharePublicUrl } from "./next-address.js";
import {
  ShareChanges,
  connectServerSharesRpcContract,
  createServerSharesHandlers,
} from "./server-shares.js";
import { ShareRegistry } from "./shares.js";
import { ConnectTunnel } from "./tunnel.js";
import {
  CONNECT_REALTIME_CHANNEL,
  REMOTE_ACTIVITY_INSTRUCTIONS_MS,
} from "./types.js";

export interface ConnectPluginOptions {
  accountRetryMinMs?: number;
  serverSharesLongPollMs?: number;
}

export function createConnectPlugin(options: ConnectPluginOptions = {}) {
  return async function plugin(cc: CcPluginApi): Promise<void> {
    const settings = cc.settings.define({
      remoteAccess: {
        type: "boolean",
        label: "Remote access",
        description:
          "Keep this cc reachable at its cc.example.invalid address while it is signed in to your cc account. Turning it off keeps the account signed in.",
        default: true,
      },
      sendRemoteInstructions: {
        type: "boolean",
        label: "Tell agents about remote access",
        description:
          "When you use CC remotely, tell agents to share servers through Connect. Applies to new agent sessions.",
        default: true,
      },
    });
    let currentSettings = await settings.get();
    const account = createAccountClient(() => cc.sdk);
    const hosted = new HostedConnectApi(account);
    let tunnel!: ConnectTunnel;
    const hostResolver = new ShareHostResolver(() => cc.sdk);
    const getLoopbackBaseUrl = () =>
      resolveLocalCloudLoopbackUrl(
        tunnel.getIdentity()?.serverUrl,
        process.env.CC_DEV_APP_PORT,
      ) ?? cc.server.loopbackBaseUrl;

    const shareChanges = new ShareChanges();
    const nextAddress = new NextAddress(() => cc.sdk);
    const shares = new ShareRegistry({
      kv: cc.storage.kv,
      hosts: cc.hosts,
      hostResolver,
      getLoopbackBaseUrl,
      getIdentity: () => tunnel.getIdentity(),
      log: cc.log,
      onChange: () => {
        shareChanges.bump();
        cc.realtime.publish(CONNECT_REALTIME_CHANNEL, tunnel.status());
      },
      nextOrigin: () => nextAddress.refresh(),
    });

    cc.events.on("experimental_host.deleted", async ({ host }) => {
      await shares.pruneHost(host.id);
    });

    const recheckServerAccess = createServerAccessRecheck(cc);
    tunnel = new ConnectTunnel({
      shares,
      readCredential: () => account.connectCredential(),
      confirmRefusedCredential: (credential) =>
        account.confirmRefusedCredential(credential),
      defaultBaseUrl: resolveDefaultConnectBaseUrl(process.env),
      enabled: currentSettings.remoteAccess,
      getLoopbackBaseUrl,
      log: cc.log,
      onStatusChange: (status) => {
        cc.realtime.publish(CONNECT_REALTIME_CHANNEL, status);
        recheckServerAccess(status);
      },
    });
    settings.onChange((next) => {
      currentSettings = next;
      tunnel.setEnabled(next.remoteAccess);
    });

    const remoteAccess: RemoteAccessSwitch = {
      async set(enabled) {
        await settings.experimental_set({ remoteAccess: enabled });
        tunnel.setEnabled(enabled);
        return tunnel.refreshStatus();
      },
    };

    await registerServerAccess(cc, {
      cloud: createServerAccessCloud(hosted),
      status: () => tunnel.status(),
    });

    cc.rpc.register(
      connectRpcContract,
      createRpcHandlers({
        tunnel,
        hosted,
        hostResolver,
        remoteAccess,
      }),
    );
    cc.rpc.register(
      connectServerSharesRpcContract,
      createServerSharesHandlers({
        changes: shareChanges,
        serverPorts: () => shares.serverPorts(),
        ...(options.serverSharesLongPollMs === undefined
          ? {}
          : { longPollMs: options.serverSharesLongPollMs }),
      }),
    );
    registerConnectCli({
      cc,
      tunnel,
      account,
      hosted,
      hostResolver,
      remoteAccess,
    });

    cc.agents.contributeInstructions(() => {
      if (!currentSettings.sendRemoteInstructions) return null;
      const status = tunnel.status();
      if (!status.paired || !status.enabled || status.url === null) return null;
      const recent =
        status.remoteClients > 0 ||
        (status.lastRemoteActivityAt !== null &&
          Date.now() - status.lastRemoteActivityAt <
            REMOTE_ACTIVITY_INSTRUCTIONS_MS);
      if (!recent) return null;
      const nextOrigin = nextAddress.current();
      return (
        `The user is currently viewing this cc remotely at ${status.url}. ` +
        "Port shares work from a thread on any enrolled host: when you start an HTTP server they should see, run `cc connect expose <port>` from that thread. " +
        "The command returns the correct public URL for the thread's host; give it to them as a markdown link because a localhost URL will not work remotely." +
        (nextOrigin === null
          ? ""
          : ` This cc is also reachable through cc connect next at ${nextOrigin}, so the command prints a second URL on the next address (${nextSharePublicUrl(nextOrigin, "<port>")} for ports on the cc server's machine, <machine-label>--<port> on the same domain for other machines); give the user both, or the one matching the address they use.`)
      );
    });

    const copy = new CredentialCopy({
      account,
      store: createCredentialCopyStore(cc.storage.kv),
      log: cc.log,
    });

    cc.background.service("tunnel", {
      async start(signal) {
        await tunnel.start();
        await watchAccount(
          {
            account,
            log: cc.log,
            onAccount: (next) => tunnel.setAccount(next),
            sync: (status) => copy.sync(status),
            ...(options.accountRetryMinMs === undefined
              ? {}
              : { retryMinMs: options.accountRetryMinMs }),
          },
          signal,
        );
        tunnel.stop();
      },
    });
  };
}
