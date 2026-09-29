import { createBrowserCcSdk } from "@cc/sdk/browser";

const BASE_URL =
  typeof window === "undefined" ? "http://localhost" : window.location.origin;

export const sdk = createBrowserCcSdk({
  baseUrl: BASE_URL,
  fetch: (input, init) => globalThis.fetch(input, init),
});

export { CcHttpError } from "@cc/sdk/browser";
