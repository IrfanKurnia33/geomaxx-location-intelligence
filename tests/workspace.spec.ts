import { expect, test } from "@playwright/test";

test("panels collapse independently and preserve unfinished recommendations", async ({ page }) => {
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss welcome" }).click();
  await page.getByRole("button", { name: "Expand comparison", exact: true }).click();
  await page.getByRole("button", { name: "Collapse study settings" }).click();
  await expect(page.getByRole("radio", { name: "500 m" })).toBeHidden();
  await page.getByRole("button", { name: "Expand study settings" }).click();
  await expect(page.getByRole("radio", { name: "500 m" })).toBeChecked();
  await page.getByRole("button", { name: "Recommendation", exact: true }).click();
  await page.getByLabel(/^Rationale/).fill("Keep this unfinished field check.");
  await page.getByRole("button", { name: "Collapse candidate panel" }).click();
  await expect(page.getByLabel(/^Rationale/)).toBeHidden();
  await page.getByRole("button", { name: "Expand candidate panel" }).click();
  await expect(page.getByLabel(/^Rationale/)).toHaveValue("Keep this unfinished field check.");
  await page.getByRole("button", { name: "Collapse comparison", exact: true }).click();
  await expect(page.locator(".candidate-table")).toBeHidden();
  await page.getByRole("button", { name: "Expand comparison", exact: true }).click();
  await page.getByRole("button", { name: "Collapse candidate panel" }).click();
  await page.getByRole("button", { name: "Inspect Site B", exact: true }).click();
  await expect(page.getByRole("button", { name: "Collapse candidate panel" })).toBeVisible();
  await expect(page.locator(".candidate-heading h2")).toHaveText("Site B");
});

test("first-visit tour supports keyboard navigation, completion, and replay", async ({ page }, testInfo) => {
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/");
  const welcome = page.getByRole("complementary", { name: "Welcome to GeoMaxx" });
  await expect(welcome).toBeVisible();
  await page.getByRole("button", { name: "Start tour", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText("Set the study boundary");
  await expect(dialog.getByRole("button", { name: "Back", exact: true })).toBeDisabled();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  const draftBefore = await page.evaluate(() => localStorage.getItem("geomaxx-study-v1"));
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Explore the location");
  await page.screenshot({ path: testInfo.outputPath("product-tour.png") });
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Set the study boundary");
  for (let index = 0; index < 4; index++) await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Take the case to review");
  await dialog.getByRole("button", { name: "Explore workspace" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Product tour", exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("geomaxx-study-v1"))).toBe(draftBefore);
  await page.reload();
  await expect(page.getByText("Saved in this browser", { exact: true })).toBeVisible();
  await expect(welcome).toBeHidden();
  await page.getByRole("button", { name: "Product tour", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("welcome dismissal persists and the mobile tour stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss welcome" }).click();
  await page.reload();
  await expect(page.getByText("Saved in this browser", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start tour", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Product tour", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (let index = 0; index < 5; index++) {
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(850);
    if (index < 4) await dialog.getByRole("button", { name: "Next", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Skip tour" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("live satellite and 3D styles preserve candidate analysis and support brief capture", async ({ page }, testInfo) => {
  test.skip(!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN, "Requires the configured Mapbox public token.");
  const failedMapRequests: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname.endsWith("mapbox.com") && response.status() >= 400) failedMapRequests.push(`${response.status()} ${url.pathname}`);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss welcome" }).click();
  const satellite = page.getByRole("button", { name: "2D satellite", exact: true });
  const city = page.getByRole("button", { name: "3D view", exact: true });
  await expect(satellite).toBeEnabled({ timeout: 25000 });
  await expect(satellite).toHaveAttribute("aria-pressed", "true");
  if (failedMapRequests.some((request) => request.startsWith("429 "))) {
    await expect(page.locator(".map-tile-warning")).toContainText("request limit");
    testInfo.annotations.push({ type: "Mapbox limit", description: "Satellite tile requests returned HTTP 429; verified the visible warning. Full imagery delivery needs a later check." });
  }
  await page.screenshot({ path: testInfo.outputPath("satellite-workspace.png") });
  await city.click();
  await expect(page.locator(".map-caption p")).toHaveText("3D Jakarta basemap with synthetic analysis overlays", { timeout: 25000 });
  await expect(city).toBeEnabled();
  await expect(page.locator(".map-panel")).toHaveAttribute("data-map-mode", "3d");
  await page.getByRole("button", { name: "Expand comparison", exact: true }).click();
  await page.getByRole("button", { name: "Inspect Site B", exact: true }).click();
  await expect(page.locator(".candidate-heading h2")).toHaveText("Site B");
  await page.getByRole("radio", { name: "1 km", exact: true }).check();
  await satellite.click();
  await expect(page.locator(".map-caption p")).toHaveText("Jakarta satellite basemap with synthetic analysis overlays", { timeout: 25000 });
  await expect(satellite).toBeEnabled();
  await city.click();
  await expect(city).toBeEnabled({ timeout: 25000 });
  await expect(city).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("3d-workspace.png") });
  await page.getByRole("button", { name: "Review brief", exact: true }).click();
  await expect(page.locator(".brief-map img")).toBeVisible();
  await expect(page.locator(".brief-map img")).toHaveAttribute("alt", /Site B.*1 km/);
  expect(failedMapRequests.filter((request) => !request.startsWith("429 "))).toEqual([]);
});

test("comparison and map information have coordinated defaults and reversible reveals", async ({ page }, testInfo) => {
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss welcome" }).click();
  const comparison = page.locator(".comparison");
  const information = page.locator(".map-information");
  const legend = page.getByRole("button", { name: "Map legend & context", exact: true });
  await expect(comparison).toHaveAttribute("data-state", "closed");
  await expect(page.locator(".candidate-table")).toBeHidden();
  await expect(information).toHaveAttribute("data-state", "open");
  await expect(legend).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Expand comparison", exact: true }).click();
  await expect(information).toHaveAttribute("data-state", "closed");
  await expect(page.locator(".candidate-table")).toBeVisible();
  await legend.click();
  await expect(information).toHaveAttribute("data-state", "open");
  await expect(comparison).toHaveAttribute("data-state", "closed");
  await expect(page.locator(".candidate-table")).toBeHidden();

  const group = page.locator(".evidence-group").filter({ has: page.getByRole("button", { name: "Sources and limitations", exact: true }) });
  await group.getByRole("button", { name: "Sources and limitations", exact: true }).click();
  const record = group.locator(".evidence-record").first();
  await record.locator(":scope > button").click();
  await expect(record).toHaveAttribute("data-state", "open");
  const groupButton = group.locator(":scope > button");
  await groupButton.click();
  await expect(record.locator(":scope > button")).toBeHidden();
  await groupButton.click();
  await expect(record).toHaveAttribute("data-state", "open");
  await expect(record.locator(":scope > .collapsible-content")).toBeVisible();
  await page.locator(".candidate-panel").evaluate(async (panel) => {
    await Promise.all(panel.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });
  await page.screenshot({ path: testInfo.outputPath("nested-evidence.png") });

  await page.getByRole("button", { name: "Collapse study settings" }).click();
  await expect(page.getByRole("radio", { name: "500 m" })).toBeHidden();
  await page.getByRole("button", { name: "Expand study settings" }).click();
  await expect(page.getByRole("radio", { name: "500 m" })).toBeVisible();
  // Sample geometry across frames to catch instant-hide regressions in the closing motion.
  const samples = await page.locator(".study-toolbar").evaluate(async (panel) => {
    const content = panel.querySelector<HTMLElement>(".collapsible-content")!;
    const button = panel.querySelector<HTMLButtonElement>(".panel-toggle")!;
    await Promise.all(content.getAnimations({ subtree: true }).map((animation) => animation.finished));
    const before = content.getBoundingClientRect().height;
    button.click();
    const heights = [];
    for (let index = 0; index < 8; index++) {
      await new Promise(requestAnimationFrame);
      heights.push(content.getBoundingClientRect().height);
    }
    return { before, heights };
  });
  expect(samples.heights.some((height) => height > 0 && height < samples.before), JSON.stringify(samples)).toBe(true);
});

test("disclosure motion respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss welcome" }).click();
  await page.getByRole("button", { name: "Collapse study settings" }).click();
  await expect(page.getByRole("radio", { name: "500 m" })).toBeHidden();
  const duration = await page.locator(".study-toolbar .collapsible-reveal").evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(parseFloat(duration)).toBeLessThanOrEqual(0.00001);
  await page.getByRole("button", { name: "Expand study settings" }).click();
  await expect(page.getByRole("radio", { name: "500 m" })).toBeVisible();
});

test("map tile warning aligns with study settings and stays dismissed during tile failures", async ({ page }, testInfo) => {
  test.skip(!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN, "Requires the configured Mapbox public token.");
  await page.route("**/v4/mapbox.satellite/**", (route) => route.fulfill({ status: 429, contentType: "application/json", body: '{"message":"Too many requests"}' }));
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss welcome" }).click();
  const warning = page.locator(".map-tile-warning");
  await expect(warning).toBeVisible({ timeout: 25000 });
  const toolbarBox = await page.locator(".study-toolbar").boundingBox();
  const warningBox = await warning.boundingBox();
  expect(warningBox!.y).toBe(toolbarBox!.y);
  await page.screenshot({ path: testInfo.outputPath("dismissible-map-warning.png") });
  await page.getByRole("button", { name: "Dismiss map warning" }).click();
  await expect(warning).toBeHidden();
  await page.getByRole("radio", { name: "1 km", exact: true }).check();
  await expect(warning).toBeHidden();
});
