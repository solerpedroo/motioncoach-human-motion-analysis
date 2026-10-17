import assert from "node:assert/strict";

const web = process.argv[2] ?? "http://127.0.0.1:3000";
const api = process.argv[3] ?? "http://127.0.0.1:8000";
const routes = [
  "/",
  "/dashboard",
  "/workout/live?exercise=jumping_jack",
  "/workout/upload",
  "/exercises",
  "/sessions/demo",
  "/settings",
  "/about/methodology",
];
for (const route of routes) {
  const response = await fetch(`${web}${route}`);
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) ?? []).length,
    1,
    `${route}: page heading`,
  );
  for (const destination of routes
    .filter((item) => !item.includes("sessions"))
    .map((item) => item.split("?")[0])) {
    assert.ok(
      html.includes(`href="${destination}"`),
      `${route}: navigation ${destination}`,
    );
  }
  const styleTag = (html.match(/<link\b[^>]*>/g) ?? []).find((tag) =>
    tag.includes('rel="stylesheet"'),
  );
  const stylesheet = styleTag?.match(/href="([^"]+)"/);
  assert.ok(stylesheet, `${route}: stylesheet`);
  const css = await fetch(new URL(stylesheet[1], web));
  assert.equal(css.status, 200);
  assert.ok(
    (await css.text()).includes("@media"),
    `${route}: responsive stylesheet`,
  );
  console.log(`200 ${route}: heading, navigation and stylesheet present`);
}
const health = await fetch(`${api}/api/health`);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), {
  schema_version: "1.0.0",
  status: "ok",
  service: "motioncoach-api",
  version: "0.1.0",
});
const openapi = await fetch(`${api}/openapi.json`);
assert.equal(openapi.status, 200);
assert.deepEqual(Object.keys((await openapi.json()).paths), ["/api/health"]);
assert.equal(
  (await fetch(`${api}/api/videos`, { method: "POST" })).status,
  404,
);
console.log(
  "200 /api/health; OpenAPI exposes health only; POST /api/videos returns 404",
);
