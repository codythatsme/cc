import { COARSE_POINTER_COMPACT_ICON_SIZE_CLASS } from "@cc/shared-ui/coarse-pointer-sizing";
import { Icon } from "@cc/shared-ui/icon";
import { resolveRightPanelFileIconName } from "./rightPanelFileVisuals";

interface RightPanelFileTabIconProps {
  path: string;
}

export function RightPanelFileTabIcon({ path }: RightPanelFileTabIconProps) {
  return (
    <Icon
      name={resolveRightPanelFileIconName(path)}
      className={COARSE_POINTER_COMPACT_ICON_SIZE_CLASS}
      aria-hidden
    />
  );
}
