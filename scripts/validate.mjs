// Checks every data file in data/ against its schema, then checks images/.
// A dataset is a pair in one folder: <Name>.json + <Name>.schema.json
// Image fields must be "", a full https:// URL, or /images/<Folder>/<file> that exists.
// Exit code 1 if anything fails, so the pipeline stops before deploy.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  IMAGES_DIR, IMAGE_TYPES, IMAGE_FILE_RE, IMAGE_PATH_RE, WARN_BYTES, MAX_BYTES,
  listImageFiles, findImageValues,
} from "./images.mjs";

const DATA_DIR = "data";
// v2 data (served at /v2/) lives in data-v2/ with the same layout and rules.
const DATA_DIRS = [DATA_DIR, "data-v2"].filter(d => existsSync(d));
const datasetDirs = () => DATA_DIRS.flatMap(base =>
  readdirSync(base, { withFileTypes: true }).filter(f => f.isDirectory()).map(f => join(base, f.name)));
const label = p => (p.startsWith(`${DATA_DIR}-`) ? p : relative(DATA_DIR, p));
let failed = 0;
let warned = 0;
let checked = 0;
const warn = msg => { warned++; console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `WARN ${msg}`); };

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`FAIL ${path}: not valid JSON (${e.message})`);
    failed++;
    return undefined;
  }
}

for (const dir of datasetDirs()) {
  for (const file of readdirSync(dir).filter(f => f.endsWith(".schema.json"))) {
    const name = file.replace(/\.schema\.json$/, "");
    const schemaPath = join(dir, file);
    const dataPath = join(dir, `${name}.json`);
    checked++;

    if (!existsSync(dataPath)) {
      console.error(`FAIL ${schemaPath}: no matching data file ${name}.json`);
      failed++;
      continue;
    }

    const schema = readJson(schemaPath);
    const data = readJson(dataPath);
    if (schema === undefined || data === undefined) continue;

    // The data file must point at its own schema.
    if (data.$schema !== `./${file}`) {
      console.error(`FAIL ${dataPath}: $schema is "${data.$schema}", expected "./${file}"`);
      failed++;
      continue;
    }

    // New Ajv per schema, because each schema uses a bare $id like "FeedsData.schema.json".
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    if (validate(data)) {
      console.log(`PASS ${label(dataPath)}`);
    } else {
      failed++;
      console.error(`FAIL ${label(dataPath)}`);
      for (const err of validate.errors) {
        const extra = err.params?.additionalProperty ? ` (${err.params.additionalProperty})` : "";
        console.error(`     ${err.instancePath || "/"} ${err.message}${extra}`);
      }
    }
  }
}

// Data files without a schema are not allowed either.
for (const dir of datasetDirs()) {
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".json") && !f.endsWith(".schema.json") && !existsSync(join(dir, f.replace(/\.json$/, ".schema.json")))) {
      console.error(`FAIL ${join(dir, f)}: no matching schema file`);
      failed++;
    }
  }
}

// ---- v2: each service's branchIDs must exist in the same institution ----
// JSON Schema can't compare two parts of a file, so this is checked here.
const v2Health = join("data-v2", "HealthInstitution", "HealthInstiData.json");
if (existsSync(v2Health)) {
  let data = null;
  try { data = JSON.parse(readFileSync(v2Health, "utf8")); } catch { /* already reported above */ }
  for (const insti of data?.Health_Insti ?? []) {
    const ids = (insti.branches ?? []).map(b => b.branchID);
    const known = new Set(ids);
    if (known.size !== ids.length) {
      console.error(`FAIL ${v2Health}: ${insti.name} has the same branchID twice`); failed++;
    }
    for (const s of insti.services ?? []) {
      for (const id of s.branchIDs ?? []) {
        if (!known.has(id)) {
          console.error(`FAIL ${v2Health}: ${insti.name}, service ${s.serviceID} "${s.service_name}" uses branchID ${id}, which this institution doesn't have`);
          failed++;
        }
      }
    }
  }
}

// ---- v2: links between datasets must point to records that exist ----
// Hospital coverage -> financial programs (programID, unless null).
const v2Read = (p) => { try { return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; } catch { return null; } };
const v2Fin = v2Read(join("data-v2", "FinancialInstitution", "FinancialInstiData.json"));
const v2Hos = v2Read(v2Health);
if (v2Fin && v2Hos) {
  const programIDs = new Set(v2Fin.Financial_Insti.flatMap(r => (r.programs ?? []).map(p => p.programID)));
  for (const h of v2Hos.Health_Insti) {
    for (const c of h.coverage ?? []) {
      if (c.programID !== null && !programIDs.has(c.programID)) {
        console.error(`FAIL ${v2Health}: ${h.name}, coverage "${c.name}" uses programID ${c.programID}, which no financial program has`); failed++;
      }
    }
  }
}

// ---- Images ----
const kb = n => `${Math.round(n / 1024)} KB`;
const images = new Set();
for (const f of listImageFiles()) {
  const at = `${IMAGES_DIR}/${f.rel}`;
  if (f.loose) { console.error(`FAIL ${at}: put images inside a folder, e.g. ${IMAGES_DIR}/Feeds/${f.rel}`); failed++; }
  else if (f.dir) { console.error(`FAIL ${at}: no sub-folders inside ${IMAGES_DIR}/<Folder>/`); failed++; }
  else if (!IMAGE_FILE_RE.test(f.rel)) {
    console.error(`FAIL ${at}: use lowercase letters, digits, - _ . and one of: ${IMAGE_TYPES.join(", ")}`); failed++;
  } else if (f.size > MAX_BYTES) { console.error(`FAIL ${at}: ${kb(f.size)} is over the ${kb(MAX_BYTES)} limit. Resize or compress it`); failed++; }
  else {
    if (f.size > WARN_BYTES) warn(`${at} is ${kb(f.size)}. Under ${kb(WARN_BYTES)} loads faster (try WebP, about 1200 px wide)`);
    if (!f.rel.endsWith(".webp")) warn(`${at} is not WebP. The standard is WebP (see ${IMAGES_DIR}/README.md)`);
    images.add(f.rel);
  }
}

const used = new Set();
let imageRefs = 0;
for (const dir of datasetDirs()) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f.endsWith(".schema.json")) continue;
    const path = join(dir, f);
    let data;
    try { data = JSON.parse(readFileSync(path, "utf8")); } catch { continue; } // already reported above
    for (const { where, value } of findImageValues(data)) {
      imageRefs++;
      if (value === "") continue; // no image
      if (value.startsWith("/")) {
        if (!IMAGE_PATH_RE.test(value)) {
          console.error(`FAIL ${path} ${where}: "${value}" must look like /images/<Folder>/<file>.webp`); failed++;
        } else if (!images.has(value.slice("/images/".length))) {
          console.error(`FAIL ${path} ${where}: "${value}" has no file at ${IMAGES_DIR}${value.slice("/images".length)}`); failed++;
        } else used.add(value.slice("/images/".length));
      } else if (value.startsWith("https://")) {
        // External image: allowed, but it can break or be blocked by the other site.
      } else if (value.startsWith("http://")) {
        warn(`${path} ${where}: use https://, browsers may block http:// images on https sites`);
      } else {
        console.error(`FAIL ${path} ${where}: "${value}" must be "", https://..., or /images/<Folder>/<file>`); failed++;
      }
    }
  }
}
for (const rel of images) if (!used.has(rel)) warn(`${IMAGES_DIR}/${rel} isn't used by any data file`);
console.log(`Images: ${images.size} file(s) in ${IMAGES_DIR}/, ${imageRefs} image field(s) in the data, ${used.size} using local files.`);

console.log(`\n${checked} dataset(s) checked, ${failed} problem(s)${warned ? `, ${warned} warning(s)` : ""}.`);
process.exit(failed ? 1 : 0);
