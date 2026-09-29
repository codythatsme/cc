import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { migrations } from "./data.js";
import { ingestLegacyImport } from "./legacy-import.js";
import { pluginDataDirFromDb } from "./path.js";
import { automationRpcContract, createRpcHandlers } from "./rpc.js";
import {
  closeAutomationRunForSettledThread,
  disableAutomationsForDeletedThreadEvent,
  errorMessage,
  reconcileRunningAutomationRuns,
} from "./run.js";
import { registerAutomationCli } from "./cli.js";
import { createAutomationService } from "./service.js";
import { sleep, sweepDueAutomations, SWEEP_INTERVAL_MS } from "./sweep.js";

function resolveServerUrl(): string {
  return process.env.CC_SERVER_URL?.trim() || "http://127.0.0.1:38886";
}

export default async function plugin(cc: CcPluginApi) {
  const db = cc.storage.database();
  cc.storage.migrate(db, migrations);
  const pluginDataDir = pluginDataDirFromDb(db);
  await ingestLegacyImport({ cc, db, pluginDataDir });

  const service = createAutomationService({
    cc,
    db,
    pluginDataDir,
    serverUrl: resolveServerUrl(),
  });

  cc.rpc.register(automationRpcContract, createRpcHandlers(service));
  registerAutomationCli({ cc, service });

  cc.events.on("thread.idle", ({ thread }) => {
    closeAutomationRunForSettledThread(cc, db, {
      threadId: thread.id,
      status: "idle",
    });
  });
  cc.events.on("thread.failed", ({ thread, error }) => {
    closeAutomationRunForSettledThread(cc, db, {
      threadId: thread.id,
      status: "failed",
      error,
    });
  });

  cc.events.on("thread.deleted", ({ thread }) => {
    disableAutomationsForDeletedThreadEvent(cc, db, thread.id);
  });

  cc.background.service("automation-sweep", {
    async start(signal) {
      try {
        await reconcileRunningAutomationRuns(cc, db);
      } catch (error) {
        cc.log.error(
          `Automation startup reconciliation failed: ${errorMessage(error)}`,
        );
      }
      while (!signal.aborted) {
        try {
          await sweepDueAutomations(cc, db, {
            pluginDataDir,
            serverUrl: resolveServerUrl(),
            serverHostId: (await cc.sdk.system.config()).primaryHostId,
          });
        } catch (error) {
          cc.log.error(`Automation sweep failed: ${errorMessage(error)}`);
        }
        await sleep(SWEEP_INTERVAL_MS, signal);
      }
    },
  });
}
