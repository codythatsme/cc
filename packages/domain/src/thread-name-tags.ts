import type { ThreadEvent } from "./provider-event.js";

const CC_THREAD_NAME_PREFIX = "[cc] ";

export function toProviderExternalThreadName(title: string): string {
  return `${CC_THREAD_NAME_PREFIX}${title}`;
}

export function fromProviderExternalThreadName(name: string): string {
  if (!name.startsWith(CC_THREAD_NAME_PREFIX)) {
    return name;
  }
  return name.slice(CC_THREAD_NAME_PREFIX.length);
}

export function normalizeProviderThreadNameEvent(
  event: ThreadEvent,
): ThreadEvent {
  if (event.type !== "thread/name/updated") {
    return event;
  }
  return {
    ...event,
    threadName: fromProviderExternalThreadName(event.threadName),
  };
}
