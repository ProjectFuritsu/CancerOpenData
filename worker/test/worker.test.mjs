// Builds dist/ from ../data, starts the Worker locally with Wrangler's own runner
// (real static-asset routing, _headers and run_worker_first), then checks it over HTTP.
// Ends by running scripts/smoke-test.sh against the local Worker.
// Usage: npm test (in worker/)
import { unstable_startWorker } from "wrangler";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";

import workerModule from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
}

async function expectError(res, status) {
  assert.equal(res.status, status);
  assert.equal(res.headers.get("access-control-allow-origin"), "*", "error has CORS");
  assert.match(res.headers.get("content-type") ?? "", /^application\/json/);
  const body = await res.json();
  assert.equal(body.error?.status, status, "error.status");
  assert.equal(typeof body.error?.message, "string", "error.message");
  return body;
}

// ---- Unit tests: call the Worker code directly with a fake asset store ----
const call = (path, assetsFetch, init) =>
  workerModule.fetch(new Request(`https://api.test${path}`, init), { ASSETS: { fetch: assetsFetch } });
const quiet = async fn => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

await test("unit: index.json missing -> JSON 500 with CORS", () => quiet(async () => {
  const body = await expectError(await call("/", async () => new Response("nope", { status: 404 })), 500);
  assert.doesNotMatch(body.error.message, /index\.json/, "no internals in the message");
}));
await test("unit: asset store throws -> JSON 500 with CORS", () => quiet(async () => {
  await expectError(await call("/", async () => { throw new Error("boom"); }), 500);
}));
await test("unit: broken index.json -> JSON 500 with CORS", () => quiet(async () => {
  await expectError(await call("/", async () => new Response("{not json")), 500);
  await expectError(await call("/", async () => Response.json({ name: "x" })), 500);
}));
await test("unit: 404 has the standard error shape", async () => {
  const body = await expectError(await call("/nope", async () => new Response(null, { status: 404 })), 404);
  assert.equal(body.error.path, "/nope");
});
await test("unit: 405 has the standard error shape and Allow", async () => {
  const res = await call("/", async () => new Response(null), { method: "DELETE" });
  assert.equal(res.headers.get("allow"), "GET, HEAD, OPTIONS");
  const body = await expectError(res, 405);
  assert.equal(body.error.method, "DELETE");
});

// ---- Integration tests: the real Worker with static assets ----
// Build with a temporary images folder: a copy of the real images/ (so the smoke test at
// the end finds them) plus a test PNG, and an SVG that must not be served.
const imgDir = mkdtempSync(join(tmpdir(), "cod-images-"));
if (existsSync(join(root, "images"))) cpSync(join(root, "images"), imgDir, { recursive: true });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
mkdirSync(join(imgDir, "Feeds"), { recursive: true });
writeFileSync(join(imgDir, "Feeds", "zz-test-fixture.png"), PNG);
writeFileSync(join(imgDir, "Feeds", "zz-test-fixture.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
execFileSync("node", ["scripts/build-site.mjs"], { cwd: root, stdio: "inherit", env: { ...process.env, IMAGES_DIR: imgDir } });
rmSync(imgDir, { recursive: true, force: true });
const index = JSON.parse(readFileSync(join(here, "..", "dist", "index.json"), "utf8"));
const files = index.datasets.flatMap(d => [d.data, d.schema]).map(p => p.slice(1));

const worker = await unstable_startWorker({
  config: join(here, "..", "wrangler.jsonc"),
  dev: { server: { hostname: "127.0.0.1", port: 0 }, inspector: false, watch: false, logLevel: "warn" },
});
await worker.ready;
const base = (await worker.url).origin;

try {
  for (const key of files) {
    await test(`GET ${key} (static asset)`, async () => {
      const r = await fetch(`${base}/${key}`, { headers: { Origin: "https://example.com" } });
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("access-control-allow-origin"), "*");
      assert.match(r.headers.get("content-type") ?? "", /^application\/json/);
      assert.equal(r.headers.get("cache-control"), "public, max-age=300");
      assert.ok(r.headers.get("etag"), "has ETag");
      assert.deepEqual(Buffer.from(await r.arrayBuffer()), readFileSync(join(root, "data", key)));
    });
  }

  await test("GET /images/Feeds/zz-test-fixture.png (static image)", async () => {
    const r = await fetch(`${base}/images/Feeds/zz-test-fixture.png`, { headers: { Origin: "https://example.com" } });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal(r.headers.get("access-control-allow-origin"), "*");
    assert.equal(r.headers.get("cache-control"), "public, max-age=300");
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), PNG);
  });

  for (const [path, why] of [
    ["images/Feeds/zz-test-fixture.svg", "SVG (not copied)"],
    ["images/Feeds/", "image folder listing"],
    ["images/", "images root"],
  ]) {
    await test(`404 for ${why} (${path})`, async () => {
      await expectError(await fetch(`${base}/${path}`), 404);
    });
  }

  await test("304 when ETag matches", async () => {
    const first = await fetch(`${base}/${files[0]}`);
    await first.arrayBuffer();
    const r = await fetch(`${base}/${files[0]}`, { headers: { "If-None-Match": first.headers.get("etag") } });
    assert.equal(r.status, 304);
  });

  await test("query string still serves the file", async () => {
    const r = await fetch(`${base}/${files[0]}?smoke=abc`);
    assert.equal(r.status, 200);
    await r.arrayBuffer();
  });

  await test("CORS preflight on / (Worker) works", async () => {
    const r = await fetch(`${base}/`, {
      method: "OPTIONS", headers: { Origin: "https://example.com", "Access-Control-Request-Method": "GET" },
    });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("access-control-allow-origin"), "*");
  });

  await test("known limit: preflight on a static file is 405", async () => {
    // Cloudflare's asset layer handles OPTIONS itself. Plain GETs don't preflight.
    const r = await fetch(`${base}/${files[0]}`, {
      method: "OPTIONS", headers: { Origin: "https://example.com", "Access-Control-Request-Method": "GET" },
    });
    assert.equal(r.status, 405);
    await r.arrayBuffer();
  });

  await test("root lists every dataset with full URLs", async () => {
    const r = await fetch(`${base}/`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("access-control-allow-origin"), "*");
    const body = await r.json();
    assert.equal(body.name, "Cancer Open Data");
    assert.equal(body.datasets.length, 5);
    for (const d of body.datasets) {
      assert.ok(d.data.startsWith(`${base}/`) && d.schema.startsWith(`${base}/`), `full URLs for ${d.name}`);
      const back = await fetch(d.data);
      assert.equal(back.status, 200, `${d.data} loads`);
      await back.arrayBuffer();
    }
  });

  for (const [path, why] of [
    ["Feeds/missing.json", "missing file"],
    ["Feeds/", "folder listing"],
    ["Feeds", "folder without slash"],
    ["Feeds/FeedsData.txt", "non-JSON"],
    ["_headers", "headers file"],
  ]) {
    await test(`404 for ${why} (${path}), JSON with CORS`, async () => {
      await expectError(await fetch(`${base}/${path}`), 404);
    });
  }

  for (const method of ["PUT", "POST", "DELETE"]) {
    await test(`${method} is rejected`, async () => {
      const r = await fetch(`${base}/${files[0]}`, { method, body: method === "DELETE" ? undefined : "x" });
      assert.ok([403, 405].includes(r.status), `status ${r.status}`);
      await r.arrayBuffer();
    });
  }

  await test("POST to / -> JSON 405 with CORS", async () => {
    await expectError(await fetch(`${base}/`, { method: "POST", body: "x" }), 405);
  });

  await test("smoke-test.sh passes against the local Worker", async () => {
    const run = spawnSync("bash", ["scripts/smoke-test.sh"], {
      cwd: root, encoding: "utf8", env: { ...process.env, PUBLIC_URL: base, SMOKE_TRIES: "1" },
    });
    assert.equal(run.status, 0, run.stdout.split("\n").filter(l => /FAIL|wait|Smoke/.test(l)).join("\n"));
  });
} finally {
  await worker.dispose();
}

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}.`);
