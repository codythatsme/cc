import { cn } from "@cc/shared-ui/lib/utils";
import ccLogoUrl from "../../../../../assets/cc-logo.svg";

export function CcLogo({ className = "size-4" }: { className?: string }) {
  return (
    <img
      src={ccLogoUrl}
      alt=""
      aria-hidden="true"
      className={cn(className, "object-contain dark:brightness-0 dark:invert")}
    />
  );
}
