// Cancer Open Data API.
// Data files (/<Folder>/<File>.json) are Workers Static Assets: Cloudflare serves
// them directly with CORS and cache headers from dist/_headers. This code runs
// only for "/" (the dataset list) and for requests no static file matches.
//
// Every response from this code is JSON with CORS headers, including errors:
//   { "error": { "status": 404, "message": "Not found", "path": "/x" } }
// so browser apps can always read what went wrong.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "3600",
};

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...CORS,
      ...extra,
    },
  });
}

function error(status, message, details = {}, extra = {}) {
  return json(status, { error: { status, message, ...details } }, extra);
}

async function datasetList(url, env) {
  const res = await env.ASSETS.fetch(new URL("/index.json", url.origin));
  if (!res.ok) throw new Error(`index.json returned ${res.status}`);
  const index = await res.json();
  if (!Array.isArray(index.datasets)) throw new Error("index.json has no datasets list");
  // index.json stores paths; return full URLs for this host.
  for (const k of ["docs", "openapi"]) if (typeof index[k] === "string") index[k] = url.origin + index[k];
  for (const d of index.datasets) {
    if (d.data) d.data = url.origin + d.data;
    if (d.schema) d.schema = url.origin + d.schema;
  }
  index.usage = `fetch("${url.origin}/<Folder>/<File>.json").then(r => r.json())`;
  return index;
}

async function handle(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return error(405, "Method not allowed. Use GET.", { method: request.method }, { Allow: "GET, HEAD, OPTIONS" });
  }
  if (url.pathname === "/") {
    return json(200, await datasetList(url, env), { "Cache-Control": "public, max-age=60" });
  }
  return error(404, "Not found. See / for the list of datasets.", { path: url.pathname });
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (e) {
      // Log the real cause for Cloudflare's logs; don't expose internals to clients.
      console.error("Unhandled error:", e?.stack || e);
      return error(500, "Internal error. Please try again later.");
    }
  },
};
