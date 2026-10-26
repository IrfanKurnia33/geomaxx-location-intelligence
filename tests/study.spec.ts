import { expect, test, type Page } from "@playwright/test";

async function openStudy(page: Page) {
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByText("Saved in this browser", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand comparison", exact: true }).click();
}

async function save(page: Page, site: string, disposition: string) {
  const expand = page.getByRole("button", { name: "Expand comparison", exact: true });
  if (await expand.isVisible()) await expand.click();
  await page
    .getByRole("button", { name: `Inspect Site ${site}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recommendation", exact: true })
    .click();
  await page.getByLabel(/^Recommendation/).selectOption(disposition);
  await page
    .getByLabel(/^Rationale/)
    .fill(`${site}: compare accessible coverage and verify branch condition.`);
  await page
    .getByLabel("Open checks and data requests")
    .fill("Verify access and request current operations evidence.");
  await page
    .getByRole("button", { name: "Save recommendation", exact: true })
    .click();
}

test("complete shortlist, persistence, printable brief, and source limitations", async ({
  page,
}, testInfo) => {
  await openStudy(page);
  await save(page, "A", "visit");
  await save(page, "B", "visit");
  await save(page, "C", "hold");
  await page.reload();
  await expect(page.getByText("3 of 3 assessed")).toBeVisible();
  await page.getByRole("button", { name: "Review brief", exact: true }).click();
  await expect(page.getByTestId("brief-status")).toHaveText("Ready for review");
  await expect(
    page.getByText(/one payday-period evening is not representative/i),
  ).toBeVisible();
  await expect(
    page.getByText(/missing performance evidence is not zero sales/i),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("heading", { name: "Field-visit decision brief" }),
  ).toBeVisible();
  await expect(page.locator(".app-header")).toBeHidden();
  await page.pdf({
    path: testInfo.outputPath("decision-brief.pdf"),
    format: "A4",
    printBackground: true,
  });
});

test("basis changes require explicit review and returning restores the match", async ({
  page,
}) => {
  await openStudy(page);
  await save(page, "A", "visit");
  await page.getByRole("radio", { name: "1 km", exact: true }).check();
  await expect(page.getByTestId("selected-status")).toHaveText("Review needed");
  await expect(page.getByLabel(/^Rationale/)).toHaveValue(/A: compare/);
  await page.getByRole("radio", { name: "500 m", exact: true }).check();
  await expect(page.getByTestId("selected-status")).toHaveText("Visit");
  await page.getByRole("radio", { name: "1 km", exact: true }).check();
  await page
    .getByRole("button", { name: "Save recommendation", exact: true })
    .click();
  await expect(page.getByTestId("selected-status")).toHaveText("Visit");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "1 km", exact: true }),
  ).toBeChecked();
});

for (const disposition of ["hold", "reject"])
  test(`all-${disposition} is a complete, valid brief`, async ({ page }) => {
    await openStudy(page);
    for (const site of ["A", "B", "C"]) await save(page, site, disposition);
    await page
      .getByRole("button", { name: "Review brief", exact: true })
      .click();
    await expect(page.getByTestId("brief-status")).toHaveText(
      "Ready for review",
    );
  });

test("three visits retain decisions but the printable brief stays draft", async ({
  page,
}) => {
  await openStudy(page);
  for (const site of ["A", "B", "C"]) await save(page, site, "visit");
  await page.getByRole("button", { name: "Review brief", exact: true }).click();
  await expect(page.getByTestId("brief-status")).toHaveText("Draft");
  await expect(
    page.getByText(/task allows up to two field visits/),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("brief-status")).toBeVisible();
});

test("missing evidence, keyboard entry, and unfinished edits survive refresh", async ({
  page,
}) => {
  await openStudy(page);
  await page
    .getByRole("button", { name: "Inspect Site C", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".candidate-heading h2")).toBeFocused();
  await page.getByText("Sources and limitations", { exact: true }).click();
  await page.getByText("Traffic observation", { exact: true }).click();
  await expect(page.getByText(/180 passers-by/)).toBeVisible();
  await page.getByText("E04 sales and trend", { exact: true }).click();
  await expect(
    page.getByText("Recent average daily sales and trend are unavailable.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recommendation", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByLabel(/^Rationale/)
    .fill("Unfinished field verification rationale");
  await page.reload();
  await expect(page.getByLabel(/^Rationale/)).toHaveValue(
    "Unfinished field verification rationale",
  );
  await expect(page.getByTestId("selected-status")).toHaveText("Unassessed");
  await page
    .getByRole("button", { name: "Save recommendation", exact: true })
    .click();
  await expect(page.locator("#decision-help")).toContainText(
    "Choose a recommendation",
  );
});

test("storage failure keeps edits and allows an in-tab brief", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage is blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(page.locator(".storage-warning")).toContainText(
    "Browser storage is unavailable",
  );
  await save(page, "A", "hold");
  await expect(page.getByLabel(/^Rationale/)).toHaveValue(/A: compare/);
  await page.getByRole("button", { name: "Review brief", exact: true }).click();
  await expect(
    page
      .getByRole("article", { name: "Field-visit decision brief" })
      .getByText(
        "A: compare accessible coverage and verify branch condition.",
        { exact: true },
      ),
  ).toBeVisible();
});

test("invalid stored data is preserved until explicitly replaced", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("geomaxx-study-v1", '{"version":99}');
  });
  await page.goto("/");
  await expect(page.locator(".storage-warning")).toContainText(
    "could not be loaded",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("geomaxx-study-v1")),
  ).toBe('{"version":99}');
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Replace unreadable draft", exact: true })
    .click();
  await expect(page.locator(".storage-warning")).toHaveCount(0);
});

test("mobile comparison has no page overflow and preserves candidate actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await openStudy(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const site of ["A", "B", "C"])
    await expect(
      page.getByRole("button", { name: `Inspect Site ${site}`, exact: true }),
    ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect Site B", exact: true })
    .click();
  await expect(page.locator(".candidate-heading h2")).toHaveText("Site B");
});

test("live Mapbox map and native Canvas brief capture", async ({ page }, testInfo) => {
  test.skip(
    !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    "A user-supplied Mapbox token is required for the live basemap and capture check.",
  );
  await page.goto("/?site=B&distance=1000");
  await expect(page.locator(".map-mode")).toHaveText("Jakarta basemap", {
    timeout: 25000,
  });
  const dimensions = await page
    .locator(".mapboxgl-canvas")
    .evaluate((canvas) => ({
      width: (canvas as HTMLCanvasElement).width,
      height: (canvas as HTMLCanvasElement).height,
    }));
  await page.getByRole("button", { name: "Review brief", exact: true }).click();
  const snapshot = page.locator(".brief-map img");
  await expect(snapshot).toBeVisible();
  expect(
    await snapshot.evaluate(
      (image) => (image as HTMLImageElement).naturalWidth,
    ),
  ).toBe(1600);
  expect(
    await snapshot.evaluate(
      (image) => (image as HTMLImageElement).naturalHeight,
    ),
  ).toBe(
    Math.round(
      dimensions.height *
        Math.min(1600 / dimensions.width, 950 / dimensions.height),
    ) + 150,
  );
  await expect(
    page.getByRole("link", { name: "OpenStreetMap", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".brief-mapbox-logo")).toBeVisible();
  await expect(snapshot).toHaveAttribute("alt", /Site B.*1 km/);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".brief-mapbox-logo")).toBeVisible();
  await page.pdf({ path: testInfo.outputPath("live-map-brief.pdf"), format: "A4", printBackground: true });
});

test("a direct brief reload restores decisions without initializing a hidden map", async ({
  page,
}) => {
  await openStudy(page);
  await save(page, "A", "hold");
  await page.getByRole("button", { name: "Review brief", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Field-visit decision brief" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article")
      .getByText(
        "A: compare accessible coverage and verify branch condition.",
        { exact: true },
      ),
  ).toBeVisible();
  await expect(page.locator(".mapboxgl-canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page.getByRole("button", { name: "Expand comparison", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect Site A", exact: true }),
  ).toBeVisible();
});
