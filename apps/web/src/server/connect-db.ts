import type { ConnectDb } from "@cc/connect-db";
import { openConnectDb } from "@cc/connect-db-pg";
import type { Env } from "./env.js";

export function connectDbFromEnv(env: Env): ConnectDb {
  return openConnectDb(env).db;
}
