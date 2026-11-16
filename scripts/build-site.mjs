// Builds worker/dist from data/, data-v2/, images/ and docs/ for Workers Static Assets.
//   - copies every data/<Folder>/<File>.json (v1, same paths as before)
//   - copies every data-v2/<Folder>/<File>.json to /v2/<Folder>/<File>.json (when data-v2/ exists)
//   - copies every images/<Folder>/<file> of an allowed type to /images/...
//   - writes openapi.json (v1) and v2/openapi.json from the schemas, and the Swagger UI page
//     at /docs/ with docs/versions.json for its version picker
//   - writes index.json and v2/index.json: the dataset lists the Worker serves at "/" and "/v2/"
//   - writes _headers: CORS + cache headers for every static file, CSP for /docs/
// Run from the repo root after npm install: node scripts/build-site.mjs (run validate first)
import { readdirSync, readFileSync, mkdirSync, copyFileSync, writeFileSync, rmSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { IMAGES_DIR, IMAGE_FILE_RE, MAX_BYTES, listImageFiles } from "./images.mjs";
import { buildOpenApi } from "./build-openapi.mjs";

const quietGit = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };

const DATA = "data";
const DATA_V2 = "data-v2";
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

// Copies srcDir/<Folder>/<File>.json to outDir and lists the datasets with their URL paths
// (prefix + "/<Folder>/<File>.json").
function collect(srcDir, outDir, prefix) {
  const datasets = new Map();
  let files = 0;
  for (const folder of readdirSync(srcDir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const file of readdirSync(join(srcDir, folder.name))) {
      const key = `${folder.name}/${file}`;
      if (!KEY.test(key)) continue;
      const src = join(srcDir, folder.name, file);
      const dest = join(outDir, folder.name, file);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      files++;

      const entry = datasets.get(folder.name) ?? { name: folder.name };
      if (file.endsWith(".schema.json")) {
        entry.schema = `${prefix}/${key}`;
      } else {
        entry.data = `${prefix}/${key}`;
        entry.size = statSync(src).size;
        entry.updated = lastCommitDate(src);
      }
      datasets.set(folder.name, entry);
    }
  }
  const list = [...datasets.values()].sort((a, b) => a.name.localeCompare(b.name));
  const schemas = {};
  for (const d of list) if (d.schema) schemas[d.name] = JSON.parse(readFileSync(join(srcDir, d.schema.slice(prefix.length + 1)), "utf8"));
  return { files, list, schemas };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const version = process.env.GITHUB_SHA ?? gitHead() ?? "local";
const IMAGES_NOTE = "Image fields that start with / are paths in this API: put the base URL in front.";
const SOURCE = "https://github.com/ProjectFuritsu/CancerOpenData";

// ---- v1: data/ at the root paths ----
const v1 = collect(DATA, OUT, "");
writeFileSync(join(OUT, "index.json"), JSON.stringify({
  name: "Cancer Open Data",
  about: "Public data on cancer care resources in one place. Each dataset has a JSON data file and a JSON Schema.",
  source: SOURCE,
  version,
  docs: "/docs/",
  openapi: "/openapi.json",
  images: IMAGES_NOTE,
  datasets: v1.list,
}, null, 2) + "\n");
writeFileSync(join(OUT, "openapi.json"), JSON.stringify(buildOpenApi(v1.list, v1.schemas, version), null, 2) + "\n");

// ---- v2: data-v2/ under /v2/ (preview until it is released) ----
const docVersions = [{ id: "v1", label: "v1 (current)", spec: "/openapi.json" }];
let v2 = null;
if (existsSync(DATA_V2)) {
  const V2_OUT = join(OUT, "v2");
  v2 = collect(DATA_V2, V2_OUT, "/v2");
  writeFileSync(join(V2_OUT, "index.json"), JSON.stringify({
    name: "Cancer Open Data",
    apiVersion: "v2",
    status: "preview",
    about: "Version 2 of the data: branches, sources, cancer types, amounts and booking type. A null or empty value means \"Not given\".",
    source: SOURCE,
    version,
    docs: "/docs/?version=v2",
    openapi: "/v2/openapi.json",
    images: IMAGES_NOTE,
    datasets: v2.list,
  }, null, 2) + "\n");
  writeFileSync(join(V2_OUT, "openapi.json"), JSON.stringify(buildOpenApi(v2.list, v2.schemas, version, { apiVersion: "v2" }), null, 2) + "\n");
  docVersions.push({ id: "v2", label: "v2 (preview)", spec: "/v2/openapi.json" });
}

let images = 0;
for (const { rel, size } of listImageFiles()) {
  if (!IMAGE_FILE_RE.test(rel) || size > MAX_BYTES) continue; // validate.mjs reports these
  const dest = join(OUT, "images", rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(IMAGES_DIR, rel), dest);
  images++;
}

// ---- Swagger UI at /docs/ (self-hosted from swagger-ui-dist, no CDN) ----
const DOCS_OUT = join(OUT, "docs");
mkdirSync(DOCS_OUT, { recursive: true });
for (const f of ["index.html", "init.js", "docs.css"]) copyFileSync(join("docs", f), join(DOCS_OUT, f));
// The versions the page's picker offers; init.js reads it.
writeFileSync(join(DOCS_OUT, "versions.json"), JSON.stringify(docVersions, null, 2) + "\n");
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

const v2Text = v2 ? `, v2: ${v2.files} data files, ${v2.list.length} datasets` : "";
console.log(`Built ${OUT}: v1: ${v1.files} data files, ${v1.list.length} datasets${v2Text}, ${images} images, openapi.json, docs/, index.json, _headers`);
