export const DEFAULT_CONNECT_BASE_URL = "https://cc.example.invalid";

const STAGING_BASE_URL = "https://cc-staging.example.invalid";

const DEV_BASE_URL_ERROR =
  "CC_DEV_CONNECT_BASE_URL must be an http://cc.localhost:<port> origin or https://cc-staging.example.invalid";

export function resolveDefaultConnectBaseUrl(env: NodeJS.ProcessEnv): string {
  const configured = env.CC_DEV_CONNECT_BASE_URL?.trim();
  if (env.NODE_ENV !== "development" || !configured) {
    return DEFAULT_CONNECT_BASE_URL;
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(DEV_BASE_URL_ERROR);
  }
  const bareOrigin =
    url.username.length === 0 &&
    url.password.length === 0 &&
    (url.pathname === "" || url.pathname === "/") &&
    url.search.length === 0 &&
    url.hash.length === 0;
  if (bareOrigin && url.origin === STAGING_BASE_URL) {
    return STAGING_BASE_URL;
  }
  if (
    !bareOrigin ||
    url.protocol !== "http:" ||
    url.hostname !== "cc.localhost" ||
    url.port.length === 0
  ) {
    throw new Error(DEV_BASE_URL_ERROR);
  }
  return url.origin;
}
