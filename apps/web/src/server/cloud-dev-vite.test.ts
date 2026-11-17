import { describe, expect, it } from "vitest";
import { resolveCloudDevViteSettings } from "./cloud-dev-vite.js";

const localEnv = {
  CC_CLOUD_DEV_STATE_PATH: "/tmp/cloud-dev",
  CC_CLOUD_DEV_APP_URL: "http://cc.localhost:42745",
  CC_CLOUD_DEV_SERVER_URL_TEMPLATE: "http://{label}.cc.localhost:42745",
  BETTER_AUTH_SECRET: "shared-local-secret",
};

describe("resolveCloudDevViteSettings", () => {
  it("ignores local Cloud environment variables during builds", () => {
    expect(resolveCloudDevViteSettings("build", localEnv)).toBeNull();
  });

  it("configures local auth during the launcher-owned dev server", () => {
    expect(resolveCloudDevViteSettings("serve", localEnv)).toEqual({
      persistStatePath: "/tmp/cloud-dev",
      vars: {
        APP_URL: "http://cc.localhost:42745",
        BASE_DOMAIN: "cc.localhost",
        BETTER_AUTH_SECRET: "shared-local-secret",
        CONNECT_SERVER_URL_TEMPLATE: "http://{label}.cc.localhost:42745",
        DEV_EMAIL_PASSWORD_AUTH: "true",
        GITHUB_CLIENT_ID: "local-cloud-dev-unused",
        GITHUB_CLIENT_SECRET: "local-cloud-dev-unused",
        NEXT_BASE_DOMAIN: "next.cc.localhost",
      },
    });
  });

  it("serves the cc connect next gate keys it is given", () => {
    const keys =
      '{"keys":[{"kid":"local","kty":"OKP","crv":"Ed25519","x":"AA"}]}';
    expect(
      resolveCloudDevViteSettings("serve", {
        ...localEnv,
        CC_CLOUD_DEV_GATE_PUBLIC_KEYS: keys,
      })?.vars.GATE_PUBLIC_KEYS,
    ).toBe(keys);
  });
});
