// Cancer Open Data API.
// Data files (/<Folder>/<File>.json) are Workers Static Assets: Cloudflare serves
// them directly with CORS and cache headers from dist/_headers. This code runs
// only for "/" (the dataset list) and for requests no static file matches.

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { error: "Method not allowed. Use GET." }, { Allow: "GET, HEAD, OPTIONS" });
    }

    if (url.pathname === "/") {
      const res = await env.ASSETS.fetch(new URL("/index.json", url.origin));
      if (!res.ok) return json(500, { error: "Dataset list is missing" });
      const index = await res.json();
      // index.json stores paths; return full URLs for this host.
      for (const d of index.datasets) {
        if (d.data) d.data = url.origin + d.data;
        if (d.schema) d.schema = url.origin + d.schema;
      }
      index.usage = `fetch("${url.origin}/<Folder>/<File>.json").then(r => r.json())`;
      return json(200, index, { "Cache-Control": "public, max-age=60" });
    }

    return json(404, { error: "Not found", path: url.pathname });
  },
};
