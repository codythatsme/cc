import type { TimelineConversationTurnRequest } from "@cc/server-contract";

export function turnRequestLabel(
  turnRequest: TimelineConversationTurnRequest,
): string | null {
  if (turnRequest.kind !== "steer") {
    return null;
  }
  if (turnRequest.status === "pending") return "Steer pending";
  if (turnRequest.status === "rejected") return "Steer failed";
  return "Steer";
}
