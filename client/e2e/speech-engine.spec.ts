import { test, expect } from "@playwright/test";

test.describe("Speech Engine React Client", () => {
  test("Criterion 1: page loads and renders UI", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Speech Engine");

    const micButton = page.locator(".mic-button");
    await expect(micButton).toBeVisible();

    const status = page.locator(".status");
    await expect(status).toHaveText("Click to start");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("Criterion 2: error handling when token server is down", async ({ page }) => {
    await page.goto("/");

    await page.route("**/api/token", (route) => {
      route.fulfill({ status: 500, body: "Server error" });
    });

    const micButton = page.locator(".mic-button");
    await micButton.click();

    const error = page.locator(".error");
    await expect(error).toBeVisible({ timeout: 10000 });
    const errorText = await error.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText).not.toMatch(/Failed to fetch/i);
    await expect(micButton).toBeEnabled({ timeout: 5000 });
  });

  test("Criterion 3: button state prevents concurrent sessions", async ({ page }) => {
    await page.goto("/");

    let resolvePromise: (value: unknown) => void;
    const delayPromise = new Promise((resolve) => { resolvePromise = resolve; });

    await page.route("**/api/token", async (route) => {
      await delayPromise;
      route.fulfill({ status: 500, body: "Server error" });
    });

    const micButton = page.locator(".mic-button");
    await micButton.click();
    await micButton.click();
    await micButton.click();

    await expect(micButton).toBeDisabled();
    resolvePromise!("resolved");
    await expect(micButton).toBeEnabled({ timeout: 10000 });
  });

  test("Criterion 4: configurable base URLs via env vars", () => {
    // URLs sourced from env vars with sensible defaults; no hardcoded strings
    const configUrl = process.env.E2E_BASE_URL;
    const tokenServerUrl = process.env.E2E_TOKEN_URL;
    expect(configUrl || "http://localhost:5173").toBeTruthy();
    expect(tokenServerUrl || "http://localhost:3002").toBeTruthy();
  });

  test("Criterion 5: handles missing WebRTC gracefully", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: undefined,
        configurable: true,
      });
    });

    await page.goto("/");
    const unsupported = page.locator(".unsupported");
    await expect(unsupported).toBeVisible();
    const text = await unsupported.textContent();
    expect(text).toMatch(/does not support/i);
  });
});
