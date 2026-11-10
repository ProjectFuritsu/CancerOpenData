// Checks every data file in data/ against its schema.
// A dataset is a pair in one folder: <Name>.json + <Name>.schema.json
// Exit code 1 if any file fails, so the pipeline stops before upload.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const DATA_DIR = "data";
let failed = 0;
let checked = 0;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`FAIL ${path}: not valid JSON (${e.message})`);
    failed++;
    return undefined;
  }
}

for (const folder of readdirSync(DATA_DIR, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const dir = join(DATA_DIR, folder.name);

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
      console.log(`PASS ${relative(DATA_DIR, dataPath)}`);
    } else {
      failed++;
      console.error(`FAIL ${relative(DATA_DIR, dataPath)}`);
      for (const err of validate.errors) {
        const extra = err.params?.additionalProperty ? ` (${err.params.additionalProperty})` : "";
        console.error(`     ${err.instancePath || "/"} ${err.message}${extra}`);
      }
    }
  }
}

// Data files without a schema are not allowed either.
for (const folder of readdirSync(DATA_DIR, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const dir = join(DATA_DIR, folder.name);
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".json") && !f.endsWith(".schema.json") && !existsSync(join(dir, f.replace(/\.json$/, ".schema.json")))) {
      console.error(`FAIL ${join(dir, f)}: no matching schema file`);
      failed++;
    }
  }
}

console.log(`\n${checked} dataset(s) checked, ${failed} problem(s).`);
process.exit(failed ? 1 : 0);
