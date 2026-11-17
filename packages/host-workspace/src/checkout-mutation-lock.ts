import { withCheckoutMutationAdmission } from "cc-environment-provider-host/locks";
import {
  withProcessLocalQueuedLocks,
  type ProcessLocalQueuedLockWork,
} from "cc-environment-provider-host/process-local-lock";
import {
  getAbsoluteGitDir,
  type GitProcessOptions,
} from "cc-environment-provider-host/workspace-git";

export async function withCheckoutMutationLock<T>(
  checkoutPath: string,
  work: ProcessLocalQueuedLockWork<T>,
  signal?: AbortSignal,
  options: GitProcessOptions = {},
): Promise<T> {
  return withCheckoutMutationAdmission(
    checkoutPath,
    async () => {
      const key = await getAbsoluteGitDir(checkoutPath, options);
      return withProcessLocalQueuedLocks({ locks: [{ key }], signal, work });
    },
    signal,
  );
}
