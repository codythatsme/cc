import {
  CC_DESKTOP_MAX_ZOOM_PERCENT,
  CC_DESKTOP_MIN_ZOOM_PERCENT,
  type CcDesktopZoomCommand,
} from "@cc/desktop-contract";

const ZOOM_STEP_PERCENT = 10;

export function nextZoomFactor(
  zoomFactor: number,
  command: CcDesktopZoomCommand,
): number {
  if (command === "reset") {
    return 1;
  }
  const step = command === "in" ? ZOOM_STEP_PERCENT : -ZOOM_STEP_PERCENT;
  const percent =
    Math.round((zoomFactor * 100 + step) / ZOOM_STEP_PERCENT) *
    ZOOM_STEP_PERCENT;
  return (
    Math.min(
      CC_DESKTOP_MAX_ZOOM_PERCENT,
      Math.max(CC_DESKTOP_MIN_ZOOM_PERCENT, percent),
    ) / 100
  );
}
