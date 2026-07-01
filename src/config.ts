import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: resolve(__dirname, "../.env") });

export interface AppConfig {
  openrouter: {
    apiKey: string;
    baseUrl: string;
  };
  defaultModel: string;
  ws: {
    port: number;
    host: string;
  };
  originWhitelist: string[];
  heartbeatIntervalMs: number;
  maxSessionMessages: number;
}

export function loadConfig(): AppConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  const originWhitelistStr = process.env.ORIGIN_WHITELIST || "http://localhost:3000,http://localhost:5173";

  return {
    openrouter: {
      apiKey,
      baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    },
    defaultModel: process.env.DEFAULT_MODEL || "openai/gpt-4.1-nano",
    ws: {
      port: parseInt(process.env.WS_PORT || "3001", 10),
      host: process.env.WS_HOST || "localhost",
    },
    originWhitelist: originWhitelistStr.split(",").map((s) => s.trim()).filter(Boolean),
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || "30000", 10),
    maxSessionMessages: parseInt(process.env.MAX_SESSION_MESSAGES || "100", 10),
  };
}