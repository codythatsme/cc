import { useRequirePierreWorkerPool } from "@/lib/pierre-worker-pool-gate";
import { useEffect } from "react";
import { CcDiffSplit } from "./CcDiffSplit";
import { CcSourceCodeSplit } from "./CcSourceCodeSplit";
import {
  useDiffRendererReplacement,
  useSourceCodeRendererReplacement,
} from "./codeRendererProvider";

export function useDiffRendererLoad(): void {
  const builtin = useDiffRendererReplacement().kind === "owner";
  useRequirePierreWorkerPool(builtin);
  useEffect(() => {
    if (builtin) void CcDiffSplit.preload();
  }, [builtin]);
}

export function useSourceCodeRendererLoad(): void {
  const builtin = useSourceCodeRendererReplacement().kind === "owner";
  useRequirePierreWorkerPool(builtin);
  useEffect(() => {
    if (builtin) void CcSourceCodeSplit.preload();
  }, [builtin]);
}
