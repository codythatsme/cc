import { useNavigate } from "react-router-dom";
import { Button } from "@cc/shared-ui/button";
import { Icon } from "@cc/shared-ui/icon";
import { cn } from "@cc/shared-ui/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@cc/shared-ui/tooltip";
import { SIDEBAR_RAIL_BUTTON_CLASS } from "@cc/shared-ui/sidebar-row-classes";
import { useAppCommandShortcut } from "@/components/commands/AppCommandProvider";

export function NavRailSettingsButton({
  isSettingsActive,
  settingsRoutePath,
}: {
  isSettingsActive: boolean;
  settingsRoutePath: string;
}) {
  const navigate = useNavigate();
  const settingsShortcut = useAppCommandShortcut("settings.open");
  const label = settingsShortcut
    ? `Settings (${settingsShortcut.label})`
    : "Settings";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-current={isSettingsActive ? "page" : undefined}
          aria-keyshortcuts={settingsShortcut?.ariaKeyshortcuts}
          className={cn(
            SIDEBAR_RAIL_BUTTON_CLASS,
            "my-1 max-md:pointer-coarse:my-0",
          )}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey) {
              window.open(settingsRoutePath, "_blank", "noopener,noreferrer");
              return;
            }
            if (!isSettingsActive) void navigate(settingsRoutePath);
          }}
        >
          <Icon name="Settings" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
