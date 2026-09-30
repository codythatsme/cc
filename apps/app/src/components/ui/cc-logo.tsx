import { cn } from "@cc/shared-ui/lib/utils";
import ccMarkUrl from "../../assets/cc-mark.png";
import ccMarkLightUrl from "../../assets/cc-mark-light.png";

export function CcLogo({
  className = "size-4",
  tone = "auto",
}: {
  className?: string;
  tone?: "auto" | "carbon" | "pearl";
}) {
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0", className)}>
      {tone !== "pearl" ? (
        <img
          src={ccMarkUrl}
          alt=""
          draggable={false}
          className={cn(
            "col-start-1 row-start-1 size-full object-contain",
            tone === "auto" && "dark:hidden",
          )}
        />
      ) : null}
      {tone !== "carbon" ? (
        <img
          src={ccMarkLightUrl}
          alt=""
          draggable={false}
          className={cn(
            "col-start-1 row-start-1 size-full object-contain",
            tone === "auto" && "hidden dark:block",
          )}
        />
      ) : null}
    </span>
  );
}
