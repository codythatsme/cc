import { defineSplit } from "@/lib/define-split";
import { SourceLoadingSkeleton } from "./code-loading-skeletons";
import type { CcSourceCodeProps } from "./code-rendering";

export const CcSourceCodeSplit = defineSplit<CcSourceCodeProps>({
  id: "cc-source-code",
  load: () => import("./CcSourceCode").then((module) => module.default),
  loading: () => <SourceLoadingSkeleton />,
  tier: "intent",
});
