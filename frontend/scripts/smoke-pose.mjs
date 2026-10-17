import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// Opt-in local smoke: real SDK/model, synthetic Chromium camera, no human video.
const base = process.env.POSE_SMOKE_URL ?? "http://127.0.0.1:3003";
const browser = await chromium.launch({
  ...(process.env.POSE_BROWSER_EXECUTABLE
    ? { executablePath: process.env.POSE_BROWSER_EXECUTABLE }
    : {}),
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(10000);
  const requests = [],
    errors = [];
  page.on("request", (request) =>
    requests.push({ url: request.url(), method: request.method() }),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/workout/live`);
  assert(
    !requests.some(({ url }) => url.includes("/pose/")),
    "Model must load only on Start",
  );
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause", exact: true })
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Pause",
      )?.disabled,
    null,
    { timeout: 45000 },
  );
  await page.waitForFunction(() => {
    const label = Array.from(document.querySelectorAll("dt")).find(
      (node) => node.textContent === "Inference FPS",
    );
    return label && label.nextElementSibling.textContent !== "Not measured";
  });
  const tracks = await page.evaluateHandle(() =>
    document.querySelector("video").srcObject.getTracks(),
  );
  assert(
    await tracks.evaluate((items) =>
      items.every(
        (track) => track.kind === "video" && track.readyState === "live",
      ),
    ),
  );
  const video = page.getByLabel("Local camera preview"),
    overlay = page.getByLabel("Pose skeleton overlay");
  assert.deepEqual(await video.boundingBox(), await overlay.boundingBox());
  assert.equal(
    await video.evaluate(
      (element) => getComputedStyle(element.parentElement).transform,
    ),
    "matrix(-1, 0, 0, 1, 0, 0)",
  );
  await page.getByRole("checkbox", { name: "Mirror preview" }).uncheck();
  assert.equal(
    await video.evaluate(
      (element) => getComputedStyle(element.parentElement).transform,
    ),
    "none",
  );
  const output = process.env.POSE_SMOKE_ARTIFACTS;
  if (output) {
    await mkdir(output, { recursive: true });
    await page.screenshot({
      path: `${output}/live-desktop.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.deepEqual(await video.boundingBox(), await overlay.boundingBox());
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile layout must fit viewport",
  );
  if (output)
    await page.screenshot({
      path: `${output}/live-mobile.png`,
      fullPage: true,
    });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByText("PAUSED", { exact: true }).waitFor();
  assert(
    await tracks.evaluate((items) =>
      items.every((track) => track.readyState === "live"),
    ),
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  assert(
    await tracks.evaluate((items) =>
      items.every((track) => track.readyState === "ended"),
    ),
  );
  assert(await video.evaluate((element) => element.srcObject === null));
  assert.equal(
    await page.getByRole("status").textContent(),
    "Camera off. Start creates a new session and resets the count.",
  );
  assert(
    requests.every(({ method }) => method === "GET"),
    "Live capture must not transmit frames",
  );
  assert(
    requests.every(({ url }) => new URL(url).origin === new URL(base).origin),
    "Assets must stay on the app origin",
  );
  assert(
    requests.some(({ url }) => url.endsWith("pose_landmarker_lite.task")),
    "Model asset must load",
  );
  assert(
    requests.some(({ url }) => url.endsWith("vision_wasm_internal.wasm")),
    "WASM asset must load",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real worker/model; synthetic camera; measured inference; mirror and mobile bounds; pause/resume/stop; tracks ended; local GET-only traffic. Human alignment not evaluated.",
  );
} finally {
  await browser.close();
}
