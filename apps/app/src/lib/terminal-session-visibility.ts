import { isActiveTerminalSessionStatus } from "@cc/domain";
import type { TerminalSession } from "@cc/server-contract";

export function isVisibleTerminalSession(session: TerminalSession): boolean {
  return (
    isActiveTerminalSessionStatus(session.status) ||
    session.status === "disconnected"
  );
}
