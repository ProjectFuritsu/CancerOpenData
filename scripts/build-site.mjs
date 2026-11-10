// Builds worker/dist from data/ and images/ for Workers Static Assets.
//   - copies every data/<Folder>/<File>.json (same paths as before)
//   - copies every images/<Folder>/<file> of an allowed type to /images/...
//   - writes index.json: the dataset list the Worker serves at "/"
//   - writes _headers: CORS + cache headers for every static file
// Run from the repo root: node scripts/build-site.mjs (run validate first)
import { readdirSync, mkdirSync, copyFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { IMAGES_DIR, IMAGE_FILE_RE, MAX_BYTES, listImageFiles } from "./images.mjs";

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

const index = {
  name: "Cancer Open Data",
  about: "Public data on cancer care resources in one place. Each dataset has a JSON data file and a JSON Schema.",
  source: "https://github.com/ProjectFuritsu/CancerOpenData",
  version: process.env.GITHUB_SHA ?? gitHead() ?? "local",
  images: "Image fields that start with / are paths in this API: put the base URL in front.",
  datasets: [...datasets.values()].sort((a, b) => a.name.localeCompare(b.name)),
};
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");

writeFileSync(join(OUT, "_headers"), [
  "/*",
  "  Access-Control-Allow-Origin: *",
  "  Cache-Control: public, max-age=300",
  "  X-Content-Type-Options: nosniff",
  "",
].join("\n"));

console.log(`Built ${OUT}: ${count} data files, ${datasets.size} datasets, ${images} images, index.json, _headers`);
