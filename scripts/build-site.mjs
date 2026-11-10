// Builds worker/dist from data/, images/ and docs/ for Workers Static Assets.
//   - copies every data/<Folder>/<File>.json (same paths as before)
//   - copies every images/<Folder>/<file> of an allowed type to /images/...
//   - writes openapi.json from the schemas, and the Swagger UI page at /docs/
//   - writes index.json: the dataset list the Worker serves at "/"
//   - writes _headers: CORS + cache headers for every static file, CSP for /docs/
// Run from the repo root after npm install: node scripts/build-site.mjs (run validate first)
import { readdirSync, readFileSync, mkdirSync, copyFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { IMAGES_DIR, IMAGE_FILE_RE, MAX_BYTES, listImageFiles } from "./images.mjs";
import { buildOpenApi } from "./build-openapi.mjs";

const quietGit = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };

const DATA = "data";
const OUT = join("worker", "dist");
const KEY = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.json$/;

function lastCommitDate(path) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cI", "--", path], quietGit).trim() || null;
  } catch {
    return null;
  }
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], quietGit).trim() || null;
  } catch {
    return null;
  }
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const datasets = new Map();
let count = 0;
for (const folder of readdirSync(DATA, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  for (const file of readdirSync(join(DATA, folder.name))) {
    const key = `${folder.name}/${file}`;
    if (!KEY.test(key)) continue;
    const src = join(DATA, folder.name, file);
    const dest = join(OUT, folder.name, file);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    count++;

    const entry = datasets.get(folder.name) ?? { name: folder.name };
    if (file.endsWith(".schema.json")) {
      entry.schema = `/${key}`;
    } else {
      entry.data = `/${key}`;
      entry.size = statSync(src).size;
      entry.updated = lastCommitDate(src);
    }
    datasets.set(folder.name, entry);
  }
}

let images = 0;
for (const { rel, size } of listImageFiles()) {
  if (!IMAGE_FILE_RE.test(rel) || size > MAX_BYTES) continue; // validate.mjs reports these
  const dest = join(OUT, "images", rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(IMAGES_DIR, rel), dest);
  images++;
}

const version = process.env.GITHUB_SHA ?? gitHead() ?? "local";
const datasetList = [...datasets.values()].sort((a, b) => a.name.localeCompare(b.name));

const index = {
  name: "Cancer Open Data",
  about: "Public data on cancer care resources in one place. Each dataset has a JSON data file and a JSON Schema.",
  source: "https://github.com/ProjectFuritsu/CancerOpenData",
  version,
  docs: "/docs/",
  openapi: "/openapi.json",
  images: "Image fields that start with / are paths in this API: put the base URL in front.",
  datasets: datasetList,
};
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");

// ---- OpenAPI spec, from the real schemas ----
const schemas = {};
for (const d of datasetList) if (d.schema) schemas[d.name] = JSON.parse(readFileSync(join(DATA, d.schema.slice(1)), "utf8"));
writeFileSync(join(OUT, "openapi.json"), JSON.stringify(buildOpenApi(datasetList, schemas, version), null, 2) + "\n");

// ---- Swagger UI at /docs/ (self-hosted from swagger-ui-dist, no CDN) ----
const DOCS_OUT = join(OUT, "docs");
mkdirSync(DOCS_OUT, { recursive: true });
for (const f of ["index.html", "init.js", "docs.css"]) copyFileSync(join("docs", f), join(DOCS_OUT, f));
const swaggerDir = dirname(createRequire(import.meta.url).resolve("swagger-ui-dist/package.json"));
for (const f of ["swagger-ui-bundle.js", "swagger-ui.css", "favicon-32x32.png", "LICENSE"]) {
  copyFileSync(join(swaggerDir, f), join(DOCS_OUT, f === "LICENSE" ? "swagger-ui-LICENSE.txt" : f));
}

writeFileSync(join(OUT, "_headers"), [
  "/*",
  "  Access-Control-Allow-Origin: *",
  "  Cache-Control: public, max-age=300",
  "  X-Content-Type-Options: nosniff",
  "",
  "/docs/*",
  "  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "  Referrer-Policy: no-referrer",
  "",
].join("\n"));

console.log(`Built ${OUT}: ${count} data files, ${datasets.size} datasets, ${images} images, openapi.json, docs/, index.json, _headers`);
