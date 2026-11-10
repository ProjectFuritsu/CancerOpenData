// Runs the Worker in Miniflare (local Workers runtime) with a simulated R2 bucket
// filled from ../data, then checks its responses. Usage: npm test (in worker/)
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "data");
// Miniflare 5 has a new options shape; the official converter accepts the v4 style.
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  scriptPath: join(here, "..", "src", "index.js"),
  compatibilityDate: "2026-10-01",
  r2Buckets: ["DATA"],
}));

const files = readdirSync(dataDir, { recursive: true })
  .filter(f => f.endsWith(".json"))
  .map(f => relative(dataDir, join(dataDir, f)).replaceAll("\\", "/"));

const bucket = await mf.getR2Bucket("DATA");
for (const key of files) {
  await bucket.put(key, readFileSync(join(dataDir, key)), {
    httpMetadata: { contentType: "application/json", cacheControl: "public, max-age=300" },
    customMetadata: { "git-sha": "test123" },
  });
}

const base = "http://localhost";
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
}

for (const key of files) {
  await test(`GET ${key}`, async () => {
    const r = await mf.dispatchFetch(`${base}/${key}`, { headers: { Origin: "https://example.com" } });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("access-control-allow-origin"), "*");
    assert.match(r.headers.get("content-type"), /^application\/json/);
    assert.equal(r.headers.get("cache-control"), "public, max-age=300");
    assert.equal(r.headers.get("x-git-sha"), "test123");
    assert.ok(r.headers.get("etag"));
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), readFileSync(join(dataDir, key)));
  });
}

await test("304 when ETag matches", async () => {
  const first = await mf.dispatchFetch(`${base}/${files[0]}`);
  await first.arrayBuffer();
  const r = await mf.dispatchFetch(`${base}/${files[0]}`, { headers: { "If-None-Match": first.headers.get("etag") } });
  assert.equal(r.status, 304);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
});

await test("CORS preflight", async () => {
  const r = await mf.dispatchFetch(`${base}/${files[0]}`, {
    method: "OPTIONS", headers: { Origin: "https://example.com", "Access-Control-Request-Method": "GET" },
  });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
});

await test("HEAD has headers, no body", async () => {
  const r = await mf.dispatchFetch(`${base}/${files[0]}`, { method: "HEAD" });
  assert.equal(r.status, 200);
  assert.equal((await r.arrayBuffer()).byteLength, 0);
});

await test("root lists every dataset with data + schema URLs", async () => {
  const r = await mf.dispatchFetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  const body = await r.json();
  assert.equal(body.name, "Cancer Open Data");
  const folders = [...new Set(files.map(f => f.split("/")[0]))].sort();
  assert.deepEqual(body.datasets.map(d => d.name), folders);
  for (const d of body.datasets) {
    assert.ok(files.includes(d.data.replace(`${base}/`, "")), `data URL for ${d.name}`);
    assert.ok(files.includes(d.schema.replace(`${base}/`, "")), `schema URL for ${d.name}`);
    assert.ok(d.size > 0 && d.updated, `size/updated for ${d.name}`);
  }
});

await test("root ignores non-dataset keys", async () => {
  await bucket.put("notes.txt", "x");
  await bucket.put("Feeds/readme.md", "x");
  const body = await (await mf.dispatchFetch(`${base}/`)).json();
  const urls = body.datasets.flatMap(d => [d.data, d.schema]);
  assert.ok(!urls.some(u => /notes\.txt|readme\.md/.test(u)));
});

for (const [path, why] of [
  ["Feeds/missing.json", "missing file"],
  ["Feeds/", "folder listing"],
  ["Feeds/FeedsData.txt", "non-JSON"],
  ["a/b/c.json", "nested path"],
  ["..%2Fsecret.json", "path trick"],
]) {
  await test(`404 for ${why} (${path})`, async () => {
    const r = await mf.dispatchFetch(`${base}/${path}`);
    assert.equal(r.status, 404);
    await r.arrayBuffer();
  });
}

for (const method of ["PUT", "DELETE", "POST"]) {
  await test(`405 for ${method}`, async () => {
    const r = await mf.dispatchFetch(`${base}/${files[0]}`, { method, body: method === "DELETE" ? undefined : "x" });
    assert.equal(r.status, 405);
    await r.arrayBuffer();
  });
}

await mf.dispose();
console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}.`);
