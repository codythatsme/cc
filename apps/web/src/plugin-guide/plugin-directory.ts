const PLUGIN_MANIFESTS = import.meta.glob<{
  cc?: { name?: string; branding?: { icon?: string } };
}>("../../../../plugins/*/package.json", { import: "default", eager: true });

const PLUGIN_ICON_URLS = import.meta.glob<string>(
  "../../../../plugins/*/{icons/*.svg,*.svg}",
  { query: "?url", import: "default", eager: true },
);

export const BRAND_ICON_URL_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.entries(PLUGIN_MANIFESTS).flatMap(([manifestPath, { cc }]) => {
    const icon = cc?.branding?.icon;
    if (!cc?.name || !icon?.startsWith("./")) return [];
    const url =
      PLUGIN_ICON_URLS[manifestPath.replace(/package\.json$/, icon.slice(2))];
    return url === undefined ? [] : [[cc.name, url] as const];
  }),
);

const PLUGIN_DIR_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.entries(PLUGIN_MANIFESTS).flatMap(([manifestPath, { cc }]) => {
    const dir = /\/plugins\/([^/]+)\/package\.json$/.exec(manifestPath)?.[1];
    return cc?.name && dir ? [[cc.name, dir] as const] : [];
  }),
);

export function pluginPageHref(displayName: string): string | null {
  const dir = PLUGIN_DIR_BY_NAME.get(displayName);
  return dir === undefined
    ? null
    : `/marketplace/builtin/${encodeURIComponent(dir)}`;
}
