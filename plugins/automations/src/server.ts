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
import {
  answerRetryConsent,
  retryConsentContract,
  retryConsentMethod,
} from "./retry-consent.js";
import { createScriptRunScope } from "./script-runner.js";
import { createAutomationService } from "./service.js";
import { sleep, sweepDueAutomations, SWEEP_INTERVAL_MS } from "./sweep.js";

export default async function plugin(cc: CcPluginApi) {
  const db = cc.storage.database();
  cc.storage.migrate(db, migrations);
  const pluginDataDir = pluginDataDirFromDb(db);
  await ingestLegacyImport({ cc, db, pluginDataDir });
  const scriptRuns = createScriptRunScope();
  cc.onDispose(() => scriptRuns.stop());

  const service = createAutomationService({
    cc,
    db,
    pluginDataDir,
    scriptRuns,
  });

  cc.rpc.register(automationRpcContract, createRpcHandlers(service));
  cc.rpc.register(
    retryConsentContract,
    {
      [retryConsentMethod]: (input) =>
        answerRetryConsent(
          db,
          async (threadId) =>
            (
              await cc.sdk.threads.events.list({
                threadId,
                types: ["client/turn/requested"],
                order: "desc",
                limit: "1",
              })
            )[0]?.data,
          input,
        ),
    },
    {
      experimental_discoverable: true,
      experimental_description:
        "Declines provider retries of recurring automation runs, which run again on their schedule.",
    },
  );
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
      let serverHostId: string | null = null;
      while (!signal.aborted) {
        try {
          serverHostId ??= (await cc.sdk.system.config()).primaryHostId;
          await sweepDueAutomations(cc, db, {
            pluginDataDir,
            serverHostId,
            scriptRuns,
          });
        } catch (error) {
          cc.log.error(`Automation sweep failed: ${errorMessage(error)}`);
        }
        await sleep(SWEEP_INTERVAL_MS, signal);
      }
    },
  });
}
