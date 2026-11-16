// Lists every value in data-v2/ that is not given yet (null or an empty list/text),
// record by record, with where to look for it. Prints a Markdown checklist.
// Usage (from the repo root): node scripts/missing-v2.mjs > missing.md
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const empty = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

// Where to look, by field name.
const WHERE = {
  bgImageURL: "the institution's own logo or photo, used with permission",
  imageURL: "a photo the doctor agreed to share (consent needed)",
  contacts: "the official website's contact page, the official Facebook page, or a phone call",
  branchName: "the official website or the office signboard",
  latitude: "Google Maps pin of the office (copy the coordinates)",
  longitude: "Google Maps pin of the office (copy the coordinates)",
  schedule: "the official website, the Facebook page, or a phone call",
  cancerTypes: "the program or service page (only if it names the cancers)",
  applicationURL: "the official website (online application page)",
  sources: "the official page the facts come from",
  amount: "the official circular or program page",
  fee: "the hospital's billing office or price list",
  lastVerified: "set the date when someone checks the record against its sources",
  meetingSchedule: "the group's Facebook page or a message to the group",
  tags: "write 1–3 topics from the post",
  bookingType: "the hospital's doctor page or a call to the clinic",
  description: "the hospital's doctor page",
  socmedURL: "the group's official Facebook page",
  service_schedule: "the hospital's service page or a phone call",
  requirements: "the hospital's service page, Malasakit desk or social worker",
  procedure: "the hospital's service page, Malasakit desk or social worker",
  eligibility: "the program page",
  founders: "the group's About page",
};

const out = [];
const counts = {};
let total = 0;

function check(dataset, title, obj, fields, prefix = "") {
  const items = [];
  for (const f of fields) {
    if (empty(obj[f])) {
      items.push(`- [ ] ${prefix}\`${f}\` — look in: ${WHERE[f] ?? "the official source"}`);
      counts[`${dataset} · ${f}`] = (counts[`${dataset} · ${f}`] ?? 0) + 1;
      total++;
    }
  }
  return items;
}

function section(dataset, records, fn) {
  const body = [];
  for (const r of records) {
    const items = fn(r);
    if (items.length) body.push(`\n**${r.label}** (${items.length})\n${items.join("\n")}`);
  }
  out.push(`\n## ${dataset}\n${body.length ? body.join("\n") : "\nNothing missing."}`);
}

const insti = (dataset, r, extra) => [
  ...check(dataset, r.name, r, ["bgImageURL", "lastVerified", "contacts"]),
  ...r.branches.flatMap((b) => check(dataset, r.name, b, ["branchName", "latitude", "longitude", "schedule", "contacts"], `Branch ${b.branchID} › `)),
  ...extra,
];

const F = read("data-v2/FinancialInstitution/FinancialInstiData.json").Financial_Insti;
section("Financial institutions", F.map((r) => ({ ...r, label: `#${r.id} ${r.name}` })), (r) => insti("Financial", r,
  r.programs.flatMap((p) => [
    ...check("Financial", r.name, p, ["eligibility", "cancerTypes", "applicationURL", "sources", "requirements", "procedure"], `${p.program_name} › `),
    ...p.benefits.flatMap((b) => check("Financial", r.name, b, ["amount"], `${p.program_name} › benefit "${b.benefit_name}" › `)),
  ])));

const H = read("data-v2/HealthInstitution/HealthInstiData.json").Health_Insti;
section("Health institutions", H.map((r) => ({ ...r, label: `#${r.id} ${r.name}` })), (r) => insti("Health", r,
  r.services.flatMap((s) => check("Health", r.name, s, ["cancerTypes", "fee", "sources", "service_schedule", "requirements", "procedure"], `${s.service_name} › `))));

const M = read("data-v2/MedicalSpecialist/MedicalSpecialistData.json").Medical_Specialist;
section("Medical specialists", M.map((r) => ({ ...r, label: `#${r.id} ${r.firstname} ${r.lastname}` })), (r) => [
  ...check("Specialist", r.lastname, r, ["description", "imageURL", "sources", "lastVerified"]),
  ...r.clinics.flatMap((c) => check("Specialist", r.lastname, c, ["latitude", "longitude", "bookingType", "contacts", "schedule"], `${c.clinicName} › `)),
]);

const S = read("data-v2/SupportGroups/SupportGroupsData.json").Support_Group;
section("Support groups", S.map((r) => ({ ...r, label: `#${r.id} ${r.name}` })), (r) =>
  check("Support group", r.name, r, ["cancerTypes", "socmedURL", "bgImageURL", "latitude", "longitude", "founders", "meetingSchedule", "sources", "lastVerified", "contacts"]));

const FD = read("data-v2/Feeds/FeedsData.json").Feed;
section("Feeds", FD.map((r) => ({ ...r, label: `#${r.id} ${r.title}` })), (r) =>
  check("Feed", r.title, r, ["bgImageURL", "tags", "content", "authors", "source"]));

const summary = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `| ${k} | ${n} |`).join("\n");
console.log(`# Missing data in v2 (not given yet)

${total} values are not given yet. In the data they are \`null\` or empty; apps show "Not given".
Tick an item when the value is found and added with its source. Re-run \`node scripts/missing-v2.mjs\` to refresh this list.

| Dataset · field | Missing |
|---|---|
${summary}
${out.join("\n")}`);
