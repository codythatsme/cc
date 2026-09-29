import type { ReactNode } from "react";
import { Icon, type IconName } from "@cc/shared-ui/icon";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@cc/shared-ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@cc/shared-ui/dropdown-menu";
import { cn } from "@cc/shared-ui/lib/utils";

type ActionMenuSurface = "context" | "dropdown";

interface ActionMenuItemProps {
  children: ReactNode;
  variant?: "default" | "destructive";
  icon: IconName;
  onSelect?: (event: Event) => void;
  surface: ActionMenuSurface;
}

interface ActionMenuSeparatorProps {
  surface: ActionMenuSurface;
}

export function ActionMenuItem({
  children,
  variant,
  icon,
  onSelect,
  surface,
}: ActionMenuItemProps) {
  const content = (
    <>
      <Icon name={icon} aria-hidden="true" />
      {children}
    </>
  );

  if (surface === "context") {
    return (
      <ContextMenuItem
        className={cn(
          variant === "destructive" &&
            "text-destructive focus:bg-destructive/15 focus:text-destructive data-[last-hovered]:bg-destructive/15 data-[last-hovered]:text-destructive",
        )}
        onSelect={onSelect}
      >
        {content}
      </ContextMenuItem>
    );
  }

  return (
    <DropdownMenuItem variant={variant} onSelect={onSelect}>
      {content}
    </DropdownMenuItem>
  );
}

export function ActionMenuSeparator({ surface }: ActionMenuSeparatorProps) {
  return surface === "context" ? (
    <ContextMenuSeparator />
  ) : (
    <DropdownMenuSeparator />
  );
}
