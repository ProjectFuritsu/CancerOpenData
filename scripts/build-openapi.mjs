// Builds the OpenAPI 3.1 specs served at /openapi.json (v1) and /v2/openapi.json (v2).
// OpenAPI 3.1 uses JSON Schema 2020-12, the same version as the *.schema.json files,
// so each dataset's real schema goes into components.schemas as it is.
// Called by build-site.mjs; don't edit the output by hand.

// Short descriptions for the docs, per API version. A new dataset without an entry
// here still gets documented, with a generic description.
const DESCRIPTIONS = {
  v1: {
    Feeds: "News, blogs and articles about cancer care.",
    FinancialInstitution: "Financial institutions and their programs (e.g. PhilHealth, SSS, GSIS, Pag-IBIG): eligibility, benefits, requirements and steps to apply.",
    HealthInstitution: "Health institutions and their services (e.g. SPMC Cancer Institute): schedules, requirements and procedures.",
    MedicalSpecialist: "Medical specialists (oncology and related fields) and their clinics. Clinic booking: if `canDoBoth` is true the clinic takes walk-ins and appointments; if it is false, `isWalkIns: true` means walk-in only and `false` means appointment only. A `null` in either field means not known (show \"Not available\").",
    SupportGroups: "Cancer support groups (e.g. AMUMA) and how to contact them.",
  },
  v2: {
    Feeds: "News, blogs and articles about cancer care, with tags and a list of authors.",
    FinancialInstitution: "Financial help that does not have to be paid back (PhilHealth, PCSO, DOH): who qualifies (`eligibility` list), benefits with their `amount`, requirements, steps, cancer types, and the Davao City `branches` with hours and contacts.",
    HealthInstitution: "Health institutions (e.g. SPMC Cancer Institute), their `branches` and services: fees, schedules, requirements and steps.",
    MedicalSpecialist: "Medical specialists and their clinics. Each clinic's `bookingType` says how to book (for example \"Walk-in and appointment\"); `null` means not known (show \"Not given\").",
    SupportGroups: "Cancer support groups: the cancer types they serve, founders, meeting schedule, contacts and sources.",
  },
};

const INTRO = {
  v1: { title: "Cancer Open Data API", note: [] },
  v2: {
    title: "Cancer Open Data API v2 (preview)",
    note: [
      "**Preview of version 2.** The data shape can still change before release. Version 1 stays at the same links.",
      "- **New in v2:** office `branches` with their own hours and contacts, lists of `sources`, `cancerTypes`, `lastVerified`, benefit `amount`, clinic `bookingType`, and `eligibility` as a list. No loan programs; PCSO and DOH added.",
      "- **A `null`, empty text or empty list means \"Not given\".**",
      "",
    ],
  },
};

const errorResponse = description => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

// Keep the schema as written, minus keys that only make sense in a standalone file.
// Local $refs (like "#/$defs/lastVerified", used by the v2 schemas) point into the
// standalone file; inside the spec they must point into components.schemas.<name>.
function embed(schema, name) {
  const { $schema, $id, ...rest } = schema;
  const fix = (v) =>
    Array.isArray(v) ? v.map(fix)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).map(([k, x]) =>
          [k, k === "$ref" && typeof x === "string" && x.startsWith("#") ? `#/components/schemas/${name}${x.slice(1)}` : fix(x)]))
      : v;
  return fix(rest);
}

/**
 * @param {Array<{name, data, schema, size, updated}>} datasets  entries from index.json (paths, not URLs)
 * @param {Record<string, object>} schemas  dataset name -> parsed schema file
 * @param {string} version  commit SHA
 * @param {{apiVersion?: "v1" | "v2"}} [opts]  which API version the spec is for (default v1)
 */
export function buildOpenApi(datasets, schemas, version, { apiVersion = "v1" } = {}) {
  const descriptions = DESCRIPTIONS[apiVersion];
  const intro = INTRO[apiVersion];
  const listPath = apiVersion === "v1" ? "/" : `/${apiVersion}/`;
  const paths = {};
  const components = {
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["status", "message"],
            properties: {
              status: { type: "integer", examples: [404] },
              message: { type: "string", examples: ["Not found. See / for the list of datasets."] },
              path: { type: "string", description: "Sent with 404." },
              method: { type: "string", description: "Sent with 405." },
            },
          },
        },
      },
      DatasetIndex: {
        type: "object",
        required: ["name", "version", "datasets"],
        properties: {
          name: { type: "string" },
          about: { type: "string" },
          source: { type: "string", format: "uri" },
          version: { type: "string", description: "The Git commit that is live." },
          images: { type: "string" },
          docs: { type: "string", format: "uri" },
          openapi: { type: "string", format: "uri" },
          usage: { type: "string" },
          datasets: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "data", "schema"],
              properties: {
                name: { type: "string", examples: ["Feeds"] },
                data: { type: "string", format: "uri", description: "Full URL of the data file." },
                schema: { type: "string", format: "uri", description: "Full URL of its JSON Schema." },
                size: { type: "integer", description: "Size of the data file in bytes." },
                updated: { type: ["string", "null"], format: "date-time", description: "Last commit that changed the data file." },
              },
            },
          },
        },
      },
    },
  };

  paths[listPath] = {
    get: {
      tags: ["Index"],
      summary: apiVersion === "v1" ? "List all datasets" : `List all ${apiVersion} datasets`,
      description: "Every dataset with its data URL, schema URL, size and last change, plus the live commit.",
      operationId: "listDatasets",
      responses: {
        200: { description: "The dataset list.", content: { "application/json": { schema: { $ref: "#/components/schemas/DatasetIndex" } } } },
        500: errorResponse("Server error. Try again later."),
      },
    },
  };

  for (const d of datasets) {
    const schema = schemas[d.name];
    if (!d.data || !schema) continue;
    components.schemas[d.name] = embed(schema, d.name);
    const desc = descriptions[d.name] ?? schema.description ?? `The ${d.name} dataset.`;
    paths[d.data] = {
      get: {
        tags: ["Datasets"],
        summary: d.name,
        description: `${desc}\n\nSchema: \`${d.schema}\``,
        operationId: `get${d.name}`,
        responses: {
          200: {
            description: `The ${d.name} data.`,
            headers: { ETag: { schema: { type: "string" } }, "Cache-Control": { schema: { type: "string", examples: ["public, max-age=300"] } } },
            content: { "application/json": { schema: { $ref: `#/components/schemas/${d.name}` } } },
          },
          304: { description: "Not changed since your copy (send `If-None-Match` with the ETag)." },
          404: errorResponse("Not found."),
        },
      },
    };
    if (d.schema) {
      paths[d.schema] = {
        get: {
          tags: ["Schemas"],
          summary: `${d.name} JSON Schema`,
          description: "The JSON Schema (draft 2020-12) that the data file must pass.",
          operationId: `get${d.name}Schema`,
          responses: { 200: { description: "The schema.", content: { "application/json": { schema: { type: "object" } } } }, 404: errorResponse("Not found.") },
        },
      };
    }
  }

  paths["/images/{folder}/{file}"] = {
    get: {
      tags: ["Images"],
      summary: "An image used by the data",
      description: "Image fields (`bgImageURL`, `imageURL`) that start with `/images/` point here. Put the API's base URL in front.",
      operationId: "getImage",
      parameters: [
        { name: "folder", in: "path", required: true, schema: { type: "string", pattern: "^[A-Za-z0-9_-]+$" }, example: "SupportGroups" },
        { name: "file", in: "path", required: true, schema: { type: "string", pattern: "^[a-z0-9][a-z0-9._-]*\\.(webp|avif|png|jpg|jpeg|gif)$" }, example: "amuma.webp" },
      ],
      responses: {
        200: { description: "The image.", content: { "image/*": { schema: { type: "string", contentMediaType: "image/*" } } } },
        404: errorResponse("No such image."),
      },
    },
  };

  return {
    openapi: "3.1.0",
    // No jsonSchemaDialect: OpenAPI 3.1's default dialect already includes JSON Schema
    // 2020-12, and Swagger UI shows a warning box for any other value.
    info: {
      title: intro.title,
      version: version ? version.slice(0, 7) : "local",
      summary: "Public, read-only data on cancer care resources in one place.",
      description: [
        ...intro.note,
        "Data on cancer care resources: health and financial institutions, medical specialists, support groups and news.",
        "",
        "- **Read-only, no keys.** Any website can read it (`Access-Control-Allow-Origin: *`).",
        "- **Use a plain GET with no custom request headers.** The data files are static, and `OPTIONS` (CORS preflight) returns `405`.",
        "- **Errors** are JSON: `{ \"error\": { \"status\": 404, \"message\": \"…\" } }`.",
        "- Files are cached for 5 minutes. The source and change history are on GitHub.",
      ].join("\n"),
      license: { name: "See repository", url: "https://github.com/ProjectFuritsu/CancerOpenData" },
    },
    externalDocs: { description: "README on GitHub", url: "https://github.com/ProjectFuritsu/CancerOpenData#readme" },
    servers: [{ url: "/", description: "This API" }],
    tags: [
      { name: "Index", description: "Start here: the list of datasets." },
      { name: "Datasets", description: "The data files." },
      { name: "Schemas", description: "The rules each data file must pass." },
      { name: "Images", description: "Images used by the data." },
    ],
    paths,
    components,
  };
}
