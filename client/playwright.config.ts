import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";
const TOKEN_URL = process.env.E2E_TOKEN_URL || "http://localhost:3002";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: BASE_URL,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  metadata: {
    BASE_URL,
    TOKEN_URL,
  },
});
