// Builds worker/dist from data/ for Workers Static Assets.
//   - copies every data/<Folder>/<File>.json (same paths as before)
//   - writes index.json: the dataset list the Worker serves at "/"
//   - writes _headers: CORS + cache headers for every static file
// Run from the repo root: node scripts/build-site.mjs
import { readdirSync, mkdirSync, copyFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const DATA = "data";
const OUT = join("worker", "dist");
const KEY = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.json$/;

function lastCommitDate(path) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cI", "--", path], { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() || null;
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

const index = {
  name: "Cancer Open Data",
  about: "Public data on cancer care resources in one place. Each dataset has a JSON data file and a JSON Schema.",
  source: "https://github.com/ProjectFuritsu/CancerOpenData",
  version: process.env.GITHUB_SHA ?? gitHead() ?? "local",
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

console.log(`Built ${OUT}: ${count} data files, ${datasets.size} datasets, index.json, _headers`);
