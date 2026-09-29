import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { z } from "zod";
import { readStandardDockerfile, readStandardImage } from "./standard-image.js";

export const dockerfileSchema = z.string().min(1).max(65_536);
const key = "dockerfile-override";

export function imageDefinition(cc: Pick<CcPluginApi, "storage">) {
  return {
    async get() {
      const stored = await cc.storage.kv.get<unknown>(key);
      return stored === undefined
        ? { dockerfile: await readStandardDockerfile(), customized: false }
        : { dockerfile: dockerfileSchema.parse(stored), customized: true };
    },
    async set(dockerfile: string) {
      const value = dockerfileSchema.parse(dockerfile);
      await readStandardImage(value);
      await cc.storage.kv.set(key, value);
      return { dockerfile: value, customized: true };
    },
    async reset() {
      await cc.storage.kv.delete(key);
      return { dockerfile: await readStandardDockerfile(), customized: false };
    },
  };
}

export type ImageDefinition = ReturnType<typeof imageDefinition>;
