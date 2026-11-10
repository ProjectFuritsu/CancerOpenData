// Public read-only gateway for the cancer-open-data R2 bucket.
// Serves the same paths as the bucket, e.g. /Feeds/FeedsData.json
// - GET and HEAD only, JSON files only, no listing
// - CORS open to all sites (public data)
// - ETag + If-None-Match (304) so browsers don't re-download unchanged files

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "3600",
};

const DEFAULT_CACHE = "public, max-age=300";

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}

const KEY_PATTERN = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.json$/;

// Builds the root index from the bucket, so new datasets appear on their own.
// One entry per folder: its data file and its schema file.
async function endpointIndex(env, origin) {
  const keys = [];
  let cursor;
  do {
    const page = await env.DATA.list({ cursor, limit: 1000 });
    for (const obj of page.objects) if (KEY_PATTERN.test(obj.key)) keys.push(obj);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const byFolder = new Map();
  for (const obj of keys) {
    const [folder, file] = obj.key.split("/");
    const entry = byFolder.get(folder) ?? { name: folder };
    const kind = file.endsWith(".schema.json") ? "schema" : "data";
    entry[kind] = `${origin}/${obj.key}`;
    if (kind === "data") {
      entry.size = obj.size;
      entry.updated = obj.uploaded.toISOString();
    }
    byFolder.set(folder, entry);
  }

  return {
    name: "Cancer Open Data",
    about: "Public data on cancer care resources in one place. Each dataset has a JSON data file and a JSON Schema.",
    source: "https://github.com/ProjectFuritsu/CancerOpenData",
    usage: `fetch("${origin}/<Folder>/<File>.json").then(r => r.json())`,
    datasets: [...byFolder.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
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

    const key = decodeURIComponent(url.pathname.slice(1));

    if (key === "") {
      return json(200, await endpointIndex(env, url.origin), { "Cache-Control": "public, max-age=60" });
    }

    // Only <folder>/<file>.json, nothing else (no listing, no path tricks).
    if (!KEY_PATTERN.test(key) || key.includes("..")) {
      return json(404, { error: "Not found" });
    }

    const object = await env.DATA.get(key, {
      onlyIf: request.headers, // handles If-None-Match / If-Modified-Since
    });

    if (object === null) {
      return json(404, { error: "Not found", key });
    }

    const headers = new Headers(CORS);
    object.writeHttpMetadata(headers); // Content-Type, Cache-Control set at upload
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Cache-Control")) headers.set("Cache-Control", DEFAULT_CACHE);
    headers.set("ETag", object.httpEtag);
    headers.set("X-Content-Type-Options", "nosniff");
    const sha = object.customMetadata?.["git-sha"];
    if (sha) headers.set("X-Git-Sha", sha);

    // onlyIf matched an existing ETag: object has no body -> 304
    if (!("body" in object) || !object.body) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
  },
};
