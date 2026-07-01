import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Exclude client Playwright e2e specs and other non-vitest files
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/client/e2e/**",
      "**/client/**",
    ],
    include: ["tests/**/*.test.ts"],
  },
});
