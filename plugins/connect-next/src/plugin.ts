import path from "node:path";
import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import {
  createAccountClient,
  watchAccount,
} from "cc-plugin-cc-account/src/client.js";
import { registerConnectNextCli } from "./cli.js";
import {
  NEXT_SERVER_OVERRIDE_ENV,
  defaultTrustedCertificates,
  parseTunnelServer,
  resolveFrpc,
  type DownloadArchive,
} from "@cc/frp-client";
import { serverTunnelIngress, type OpenTunnelIngress } from "./ingress.js";
import {
  connectNextRpcContract,
  createRpcHandlers,
  type ConnectNextControls,
} from "./rpc.js";
import { createSharesClient, watchServerShares } from "./shares.js";
import { NextTunnel, type NextTunnelTiming } from "./tunnel.js";
import { CONNECT_NEXT_REALTIME_CHANNEL } from "./types.js";

export interface ConnectNextPluginOptions {
  env?: NodeJS.ProcessEnv;
  openIngress?: OpenTunnelIngress;
  download?: DownloadArchive;
  trustedCertificates?: () => Promise<string[]>;
  timing?: Partial<NextTunnelTiming>;
  accountRetryMinMs?: number;
  onTunnel?: (tunnel: NextTunnel) => void;
}

export function createConnectNextPlugin(
  options: ConnectNextPluginOptions = {},
) {
  return async function plugin(cc: CcPluginApi): Promise<void> {
    const env = options.env ?? process.env;
    const settings = cc.settings.define({
      enabled: {
        type: "boolean",
        label: "Reach this cc at its next address (beta)",
        description:
          "Also make this cc reachable at https://<label>.next.<your cc account's domain> through cc's new Fly gate while it is signed in to your cc account. Your cc connect address keeps working.",
        default: true,
      },
    });
    const initial = await settings.get();
    const serverOverride = parseTunnelServer(env[NEXT_SERVER_OVERRIDE_ENV]);
    const dataDir = () =>
      path.join(cc.server.experimental_dataDir, "plugins", cc.pluginId);
    const account = createAccountClient(() => cc.sdk);
    const sharesClient = createSharesClient(() => cc.sdk);
    const tunnel = new NextTunnel({
      frpDir: path.join(dataDir(), "frp"),
      serverOverride,
      enabled: initial.enabled,
      resolveBinary: () =>
        resolveFrpc({
          dataDir: dataDir(),
          env,
          ...(options.download === undefined
            ? {}
            : { download: options.download }),
        }),
      readCredential: () => account.connectCredential(),
      openIngress: options.openIngress ?? serverTunnelIngress(cc.server),
      trustedCertificates:
        options.trustedCertificates ?? (() => defaultTrustedCertificates(env)),
      log: cc.log,
      onStatusChange: (status) => {
        cc.realtime.publish(CONNECT_NEXT_REALTIME_CHANNEL, status);
      },
      setMachineTunnels: (config) =>
        cc.hosts.internal_DO_NOT_USE_setNextTunnels(config),
      machineStatuses: () => cc.hosts.internal_DO_NOT_USE_nextTunnelStatuses(),
      ...(options.timing === undefined ? {} : { timing: options.timing }),
    });
    options.onTunnel?.(tunnel);
    cc.hosts.internal_DO_NOT_USE_onNextTunnelStatusChange(() => {
      tunnel.machinesChanged();
    });

    settings.onChange((next) => {
      void tunnel.setEnabled(next.enabled);
    });

    const controls: ConnectNextControls = {
      status: () => tunnel.status(),
      async setEnabled(enabled) {
        await settings.experimental_set({ enabled });
        await tunnel.setEnabled(enabled);
        return tunnel.status();
      },
    };

    cc.rpc.register(connectNextRpcContract, createRpcHandlers(controls));
    registerConnectNextCli(cc, controls);

    cc.background.service("tunnel", {
      async start(signal) {
        await tunnel.start();
        const retry =
          options.accountRetryMinMs === undefined
            ? {}
            : { retryMinMs: options.accountRetryMinMs };
        try {
          await Promise.all([
            watchAccount(
              {
                account,
                log: cc.log,
                onAccount: (next) => {
                  void tunnel.setIdentity(
                    next === null
                      ? null
                      : {
                          serverId: next.serverId,
                          label: next.serverLabel,
                          baseUrl: next.baseUrl,
                        },
                  );
                },
                ...retry,
              },
              signal,
            ),
            watchServerShares(
              {
                shares: sharesClient,
                log: cc.log,
                onPorts: (ports) => {
                  void tunnel.setSharePorts(ports);
                },
                ...retry,
              },
              signal,
            ),
          ]);
        } finally {
          await tunnel.stop();
        }
      },
    });
  };
}
