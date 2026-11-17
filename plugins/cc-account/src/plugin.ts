import { hostname } from "node:os";
import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { AccountService } from "./account.js";
import {
  isAllowedBaseUrl,
  resolveDefaultBaseUrl,
  type BaseUrlAllowed,
} from "./base-url.js";
import { registerAccountCli } from "./cli.js";
import { ACCOUNT_REALTIME_CHANNEL } from "./contract.js";
import {
  DEFAULT_LINK_POLL_TIMING,
  LinkLogins,
  type LinkPollTiming,
} from "./login.js";
import { registerAccountRpc } from "./rpc.js";
import { createKvAccountStore } from "./store.js";

const CLIENT_NAME_MAX_LENGTH = 100;

function clientName(): string {
  const name = hostname().trim().slice(0, CLIENT_NAME_MAX_LENGTH);
  return name.length > 0 ? name : "cc";
}

export interface CcAccountPluginOptions {
  timing: LinkPollTiming;
  allowedBaseUrl: BaseUrlAllowed;
}

export function createCcAccountPlugin(
  options: CcAccountPluginOptions = {
    timing: DEFAULT_LINK_POLL_TIMING,
    allowedBaseUrl: (origin) => isAllowedBaseUrl(origin, process.env),
  },
) {
  return async function plugin(cc: CcPluginApi): Promise<void> {
    const baseUrls = {
      defaultBaseUrl: resolveDefaultBaseUrl(process.env),
      allowed: options.allowedBaseUrl,
    };
    let logins!: LinkLogins;
    const publish = () => {
      cc.realtime.publish(ACCOUNT_REALTIME_CHANNEL, {
        status: account.status(),
        login: logins.view(null),
      });
    };
    const account = new AccountService({
      store: createKvAccountStore(cc.storage.kv),
      log: cc.log,
      onChange: publish,
    });
    await account.load();
    logins = new LinkLogins({
      account,
      clientName: clientName(),
      log: cc.log,
      timing: options.timing,
      onChange: publish,
    });

    registerAccountRpc({ cc, account, logins, baseUrls });
    registerAccountCli({ cc, account, logins, baseUrls });

    cc.background.service("profile-refresh", {
      start: (signal) => account.runProfileRefresh(signal),
    });

    cc.onDispose(() => {
      logins.dispose();
      account.dispose();
    });
  };
}
