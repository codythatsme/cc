import { useAtom } from "jotai";
import {
  REWRITE_LOCALHOST_LINKS_DEFAULT,
  REWRITE_LOCALHOST_LINKS_STORAGE_KEY,
} from "@cc/client-core";
import { createBooleanPreferenceAtom } from "./browser-storage";

export { rewriteLocalhostLinkHref } from "@cc/client-core";

const rewriteLocalhostLinksPreferenceAtom = createBooleanPreferenceAtom(
  REWRITE_LOCALHOST_LINKS_STORAGE_KEY,
  REWRITE_LOCALHOST_LINKS_DEFAULT,
);

export function useRewriteLocalhostLinksPreference() {
  return useAtom(rewriteLocalhostLinksPreferenceAtom);
}
