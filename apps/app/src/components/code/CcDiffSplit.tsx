import { defineSplit } from "@/lib/define-split";
import { DiffLoadingSkeleton } from "@cc/shared-ui/diff-loading-skeleton";
import type { CcDiffProps } from "./code-rendering";

export const CcDiffSplit = defineSplit<CcDiffProps>({
  id: "cc-diff",
  load: () => import("./CcDiff").then((module) => module.default),
  loading: () => <DiffLoadingSkeleton />,
  tier: "intent",
});
