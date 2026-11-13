// Converts the v1 data in data/ to the v2 shape in data-v2/.
// Values are copied as written. Nothing is guessed: a value the v1 data
// doesn't have becomes null or an empty list ("Not given").
//
// Usage (from the repo root):
//   node scripts/convert-v2.mjs [--provenance <staging>/provenance]
// --provenance is optional. When given, it adds two things that were
// reviewed at import time: lastVerified = the "retrieved" date of records
// that were added from a source, and support group sources.
// --no-review skips Fritz's review decisions (to see the plain conversion).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const provDir = args.includes("--provenance") ? args[args.indexOf("--provenance") + 1] : null;

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const prov = (folder) => {
  if (!provDir) return {};
  const p = join(provDir, `${folder}.json`);
  return existsSync(p) ? read(p) : {};
};
const lastVerified = (p, id) => (p[id]?.action === "added" && p[id]?.retrieved) || null;
const list = (v) => (v === null || v === undefined || v === "" ? [] : [v]);

// ---- Fritz's review decisions (2026-11-13) ----
// Applied after the plain conversion, so they survive a re-run. Each fix logs
// what it changed. Full reasons: vault note 01-projects/cancer-project-v3/v2-data-review.md
const REVIEW = {
  // Decision 7: short summaries in our own words (Feed 1 held the full article text, Feed 2 had "TBA").
  feedSummaries: {
    1: "The Philippine Cancer Society joined the UICC World Cancer Leaders' Summit in Melbourne, Australia, on 18–20 November 2025, together with other Filipino cancer groups. The delegation took part in talks on non-communicable diseases and in a workshop on ending cervical cancer through HPV vaccination and screening. The summit launched the World Cancer Declaration 2025–2035, which sets global goals for 2035, such as fewer cancer deaths and more cancers found early.",
    2: "On 17 November 2025, DOST-ASTI hosted \"AI Against Cervical Cancer,\" a hybrid meeting of research, government and civil society groups. They discussed building the first Philippine Cervical Image Bank for the Cerv.ai project, which makes AI tools to find early cervical cancer, and lower-cost HPV-DNA testing. The Philippine Cancer Society offered its mobile bus for screening in poor and far communities.",
  },
  // Decision 1 (simplified by Fritz later on 2026-11-13): from his phone call with a PhilHealth
  // officer, recorded in provenance. Every Z Benefits program gets only this one requirement and
  // this one step; the hospital's coordinator gives the full list. The official details stay
  // in each program's sources (PhilHealth circulars) and in the v1 data.
  zBenefitsRequirements: ["PhilHealth ID"],
  zBenefitsSteps: ["Regardless of the type of cancer, bring your PhilHealth ID to the hospital's Z Benefits coordinator for the list of requirements and further steps."],
  // Decision 5: cancer types as named in each Z Benefits program name.
  cancerTypesByProgram: {
    101002: ["Breast Cancer"],
    101003: ["Acute Lymphocytic / Lymphoblastic Leukemia"],
    101004: ["Prostate Cancer"],
    101005: ["Cervical Cancer"],
    101006: ["Colorectal Cancer"],
  },
  // Decision 3: PhilHealth's national number moves to the institution's main contacts.
  hotline: { instiId: 1, contact_details: "(02) 866-225-88" },
  // Decision 2: SPMC's 3 contacts belong to AMUMA and PhilHealth, so they are removed.
  clearBranchContacts: [{ instiId: 1, branchID: 1 }],
};

const renumber = (items, key) => items.map((x, i) => ({ ...x, [key]: i + 1 }));
const MONEY = /(?:^|\s)(?:Up to )?(?:P|Php)\s?\d/;

// Decision 4: split "name: amount" at the first ": "; a benefit that is only an amount
// becomes { benefit_name: "Total package", amount: <text> }. Both parts stay as written.
function splitBenefit(b) {
  const at = b.benefit_name.indexOf(": ");
  if (at > 0 && MONEY.test(b.benefit_name.slice(at + 2))) {
    return { ...b, benefit_name: b.benefit_name.slice(0, at), amount: b.benefit_name.slice(at + 2) };
  }
  if (/^(?:Up to )?(?:P|Php)\s?\d/.test(b.benefit_name)) {
    return { ...b, benefit_name: "Total package", amount: b.benefit_name };
  }
  return b;
}

function applyReview(folder, records) {
  const log = (msg) => console.log(`  review: ${msg}`);
  if (folder === "Feeds") {
    for (const r of records) {
      if (REVIEW.feedSummaries[r.id]) { r.content = REVIEW.feedSummaries[r.id]; log(`Feed ${r.id}: content -> short summary`); }
    }
  }
  if (folder === "FinancialInstitution") {
    for (const r of records) {
      if (r.id === REVIEW.hotline.instiId) {
        const b = r.branches[0];
        const i = b.contacts.findIndex((c) => c.contact_details === REVIEW.hotline.contact_details);
        if (i >= 0) {
          b.contacts.splice(i, 1);
          b.contacts = renumber(b.contacts, "contact_id");
          r.contacts = [{ contact_id: 1, type: "Hotline", contact_details: REVIEW.hotline.contact_details }];
          log(`${r.name}: ${REVIEW.hotline.contact_details} -> main contacts as Hotline`);
        }
      }
      let split = 0, total = 0;
      for (const p of r.programs) {
        p.benefits = p.benefits.map((b) => { const s = splitBenefit(b); if (s.amount !== null) (s.benefit_name === "Total package" ? total++ : split++); return s; });
        if (REVIEW.cancerTypesByProgram[p.programID]) {
          p.cancerTypes = REVIEW.cancerTypesByProgram[p.programID];
          log(`program ${p.programID}: cancerTypes ${JSON.stringify(p.cancerTypes)}`);
        }
        if (p.program_name.startsWith("Z Benefits")) {
          const before = `${p.requirements.length} requirements, ${p.procedure.length} steps`;
          p.requirements = REVIEW.zBenefitsRequirements.map((d, i) => ({ requirement_id: i + 1, requirement_description: d }));
          p.procedure = REVIEW.zBenefitsSteps.map((s, i) => ({ step: i + 1, instruction: s }));
          log(`program ${p.programID}: ${before} -> ${p.requirements.length} requirement, ${p.procedure.length} step`);
        }
      }
      if (split || total) log(`${r.name}: benefits split ${split}, "Total package" ${total}`);
    }
  }
  if (folder === "HealthInstitution") {
    for (const r of records) {
      for (const { instiId, branchID } of REVIEW.clearBranchContacts) {
        const b = r.id === instiId && r.branches.find((x) => x.branchID === branchID);
        if (b && b.contacts.length) { log(`${r.name} branch ${branchID}: removed ${b.contacts.length} contacts`); b.contacts = []; }
      }
    }
  }
  if (folder === "MedicalSpecialist") {
    // Decision 6: placeholder faces look like real doctors; no photo until there is a consented one.
    const ids = records.filter((r) => /i\.pravatar\.cc/.test(r.imageURL)).map((r) => { r.imageURL = ""; return r.id; });
    if (ids.length) log(`placeholder photos cleared: ${ids.join(", ")}`);
  }
  // Decision 8: branch names stay null until the next source check (no change).
  return records;
}

function write(folder, file, key, records) {
  if (!args.includes("--no-review")) applyReview(folder, records);
  const out = { $schema: `./${file}.schema.json`, [key]: records };
  writeFileSync(join("data-v2", folder, `${file}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote data-v2/${folder}/${file}.json (${records.length} records)`);
}

// ---- Feeds ----
{
  const v1 = read("data/Feeds/FeedsData.json").Feed;
  write("Feeds", "FeedsData", "Feed", v1.map((r) => ({
    id: r.id,
    title: r.title,
    bgImageURL: r.bgImageURL,
    category: r.category,
    tags: [],
    content: r.content,
    authors: list(r.author),
    publishDate: r.publishDate,
    source: r.source,
  })));
}

// ---- Financial and Health institutions: shared top part ----
function instiTop(r, p) {
  if (r.schedule.isWholeWeek && r.schedule.days.length === 0) {
    console.warn(`WARN ${r.name}: isWholeWeek is true but no days are listed; schedule will be empty`);
  }
  return {
    id: r.id,
    name: r.name,
    bgImageURL: r.bgImageURL,
    source: r.source,
    description: r.description,
    type: r.type,
    lastVerified: lastVerified(p, r.id),
    // v1 has one address per institution; its contacts belong to that address,
    // so they move into branch 1. Main (institution-wide) contacts are decided by hand.
    contacts: [],
    branches: [{
      branchID: 1,
      branchName: null,
      location: r.location,
      latitude: r.latitude,
      longitude: r.longitude,
      schedule: r.schedule.days,
      contacts: r.contacts,
    }],
  };
}

{
  const p = prov("FinancialInstitution");
  const v1 = read("data/FinancialInstitution/FinancialInstiData.json").Financial_Insti;
  write("FinancialInstitution", "FinancialInstiData", "Financial_Insti", v1.map((r) => ({
    ...instiTop(r, p),
    programs: r.programs.map((g) => ({
      programID: g.programID,
      program_name: g.program_name,
      eligibility: g.eligibility,
      program_description: g.program_description,
      cancerTypes: null,
      applicationURL: null,
      sources: list(g.source),
      benefits: g.benefits.map((b) => ({ benefit_id: b.benefit_id, benefit_name: b.benefit_name, amount: null })),
      requirements: g.requirements,
      procedure: g.procedure,
    })),
  })));
}

{
  const p = prov("HealthInstitution");
  const v1 = read("data/HealthInstitution/HealthInstiData.json").Health_Insti;
  write("HealthInstitution", "HealthInstiData", "Health_Insti", v1.map((r) => ({
    ...instiTop(r, p),
    services: r.services.map((s) => ({
      serviceID: s.serviceID,
      branchIDs: [1],
      service_name: s.service_name,
      service_description: s.service_description,
      cancerTypes: null,
      fee: null,
      sources: list(s.source),
      service_schedule: s.service_schedule ?? null,
      requirements: s.requirements,
      procedure: s.procedure,
    })),
  })));
}

// ---- Medical specialists ----
const bookingType = (c) =>
  c.canDoBoth === true ? "Walk-in and appointment"
  : c.canDoBoth === false && c.isWalkIns === true ? "Walk-in only"
  : c.canDoBoth === false && c.isWalkIns === false ? "Appointment only"
  : null;

{
  const p = prov("MedicalSpecialist");
  const v1 = read("data/MedicalSpecialist/MedicalSpecialistData.json").Medical_Specialist;
  write("MedicalSpecialist", "MedicalSpecialistData", "Medical_Specialist", v1.map((r) => ({
    id: r.id,
    firstname: r.firstname,
    lastname: r.lastname,
    specialty: r.specialty,
    description: r.description,
    imageURL: r.imageURL,
    sources: list(r.source),
    lastVerified: lastVerified(p, r.id),
    clinics: r.clinics.map((c) => ({
      clinicID: c.clinicid,
      clinicName: c.clinicName,
      location: c.location,
      latitude: null,
      longitude: null,
      bookingType: bookingType(c),
      contacts: c.contacts ?? [],
      schedule: c.schedule.map((s) => ({ day: s.day, timeIn: s.timeIN, timeOut: s.timeOUT })),
    })),
  })));
}

// ---- Support groups ----
{
  const p = prov("SupportGroups");
  const v1 = read("data/SupportGroups/SupportGroupsData.json").Support_Group;
  write("SupportGroups", "SupportGroupsData", "Support_Group", v1.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    cancerTypes: null,
    socmedURL: r.socmedURL,
    bgImageURL: r.bgImageURL,
    location: r.location,
    latitude: r.latitude,
    longitude: r.longitude,
    founders: list(r.founder),
    meetingSchedule: null,
    sources: [...new Set((p[r.id]?.sources ?? []).map((s) => s.url).filter(Boolean))],
    lastVerified: lastVerified(p, r.id),
    contacts: r.contacts,
  })));
}
