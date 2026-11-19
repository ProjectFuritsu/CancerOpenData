// Converts the v1 data in data/ to the v2 shape in data-v2/.
// Values are copied as written. Nothing is guessed: a value the v1 data
// doesn't have becomes null or an empty list ("Not given" in apps).
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
  // Decision 12 (Fritz, 2026-11-15, hospitals review): SPMC gets its official site as source,
  // its main contacts (Contact Us page) and 8 department cancer clinics with their schedules,
  // as written on spmc.doh.gov.ph. A service's location goes at the end of its description,
  // since v2 services have no location field. New services get the next serviceIDs, branch 1.
  healthInstitutionUpdates: {
    "1": {
      // Decision 14 (Fritz, 2026-11-15): renamed from "SPMC Cancer Institute", because its
      // cancer clinics are in several SPMC departments, not only the Cancer Institute.
      "name": "Southern Philippines Medical Center",
      "source": "https://spmc.doh.gov.ph/",
      "contacts": [
        {
          "contact_id": 1,
          "type": "Landline",
          "contact_details": "(082) 227-2731"
        },
        {
          "contact_id": 2,
          "type": "Other",
          "contact_details": "TELEFAX: (082) 221-7029"
        },
        {
          "contact_id": 3,
          "type": "Email",
          "contact_details": "coh.spmc@gmail.com"
        }
      ],
      "addServices": [
        {
          "service_name": "Oncology Clinic (Internal Medicine)",
          "service_description": "dedicated to the diagnosis, treatment and care of adults with cancer. Location: Internal Medicine OPD at the Second Floor of JICA OPD Building.",
          "cancerTypes": null,
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/internal-medicine/"
          ],
          "service_schedule": [
            {
              "day": "Tuesday and Thursday",
              "timeIn": "1 pm",
              "timeOut": "5 pm"
            }
          ]
        },
        {
          "service_name": "Hematology Clinic (Internal Medicine)",
          "service_description": "provides assessment and treatment as well as co-ordination of clinical care for patients with blood diseases and blood-related cancers. Location: Internal Medicine OPD at the Second Floor of JICA OPD Building.",
          "cancerTypes": null,
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/internal-medicine/"
          ],
          "service_schedule": [
            {
              "day": "Tuesday and Thursday",
              "timeIn": "1 pm",
              "timeOut": "5 pm"
            }
          ]
        },
        {
          "service_name": "Surgical Oncology",
          "service_description": "Location: Cancer Institute – 2nd Floor.",
          "cancerTypes": null,
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/surgery/"
          ],
          "service_schedule": [
            {
              "day": "Monday to Friday",
              "timeIn": "8AM",
              "timeOut": "5PM"
            }
          ]
        },
        {
          "service_name": "Gynecologic Oncology",
          "service_description": "Caters to patients diagnosed with cancer in the reproductive organs",
          "cancerTypes": null,
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/obstetrics-and-gynecology/"
          ],
          "service_schedule": [
            {
              "day": "weekdays",
              "timeIn": "1:00 pm",
              "timeOut": "5:00 pm"
            }
          ]
        },
        {
          "service_name": "Trophoblastic Service Clinic",
          "service_description": "Specializes in dealing with a group of conditions involving tumor growth in the womb.",
          "cancerTypes": null,
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/obstetrics-and-gynecology/"
          ],
          "service_schedule": [
            {
              "day": "weekdays",
              "timeIn": "1:00 pm",
              "timeOut": "5:00 pm"
            }
          ]
        },
        {
          "service_name": "Colposcopy / Pap’s Smear",
          "service_description": "Screening procedure for detecting cervical cancer.",
          "cancerTypes": [
            "Cervical Cancer"
          ],
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/obstetrics-and-gynecology/"
          ],
          "service_schedule": [
            {
              "day": "Tuesday and Thursday",
              "timeIn": "1:00 pm",
              "timeOut": "7:00 pm"
            }
          ]
        },
        {
          "service_name": "Oncology Clinic (Pediatrics)",
          "service_description": "Specializes on diagnoses, treatment and management of cancer.",
          "cancerTypes": null,
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/pediatrics-2/"
          ],
          "service_schedule": [
            {
              "day": "Monday and Wednesday",
              "timeIn": "2:00",
              "timeOut": "4:00 PM"
            },
            {
              "day": "Tuesday, Thursday and Friday",
              "timeIn": "8:00 AM",
              "timeOut": "12:00 PM"
            }
          ]
        },
        {
          "service_name": "Breast Imaging",
          "service_description": "Involves the use of mammography, sonomammography and elastography. Imaging exam dedicated for screening breast cancer.",
          "cancerTypes": [
            "Breast Cancer"
          ],
          "fee": null,
          "sources": [
            "https://spmc.doh.gov.ph/radiological-and-imaging-sciences/"
          ],
          "service_schedule": [
            {
              "day": "weekdays (OPD)",
              "timeIn": "8:00 am",
              "timeOut": "5:00 pm"
            }
          ]
        }
      ]
    }
  },
  // Decision 15 (Fritz, 2026-11-15, money-help offices review): where to go for PhilHealth,
  // as written in PhilHealth's official Regional Offices Directory (PRO XI):
  // https://www.philhealth.gov.ph/about_us/directory . Online: the eGovPH Super App
  // (https://e.gov.ph/), which the YAKAP page already names.
  financialInstitutionOffices: {
    1: {
      branchChanges: {
        1: {
          branchName: "Local Health Insurance Office (LHIO) Davao City",
          location: "Valgosons Bldg., Bolton Ext., Poblacion District, Davao City, Davao del Sur",
          contacts: [
            { contact_id: 1, type: "Landline", contact_details: "(082) 295-2133 loc. 6328 to 30" },
            { contact_id: 2, type: "Mobile", contact_details: "09457256139" },
            { contact_id: 3, type: "Email", contact_details: "lhiodavao.onlinetransactions@gmail.com" },
          ],
        },
      },
      addBranches: [
        { branchName: "PhilHealth Express Calinan", location: "Old Barangay Hall beside Police Station, Aurora-Quezon St., Calinan, Davao City", contacts: [{ contact_id: 1, type: "Email", contact_details: "pro11.fod.ossco@gmail.com" }] },
        { branchName: "PhilHealth Express Toril", location: "Urban Health Center A, Agton St., Toril, Davao City, Davao del Sur", contacts: [{ contact_id: 1, type: "Mobile", contact_details: "0955 986 0938" }, { contact_id: 2, type: "Email", contact_details: "pro11.express.toril@gmail.com" }] },
        { branchName: "One-Stop Service Center Office (OSSCO) Gaisano Mall Davao", location: "Fifth Floor, OSSCO, Gaisano Mall of Davao, Bajada, J.P. Laurel Ave., Davao City, Davao del Sur", contacts: [{ contact_id: 1, type: "Email", contact_details: "pro11.fod.ossco@gmail.com" }] },
      ],
      addContacts: [{ type: "Website", contact_details: "https://e.gov.ph/" }],
      applicationURLs: { 161213: "https://e.gov.ph/" },
    },
  },
  // (082) 295-2133 is PhilHealth Regional Office XI's trunkline (PhilHealth directory),
  // so it is not AMUMA's number.
  supportGroupWrongContacts: { 1: ["(082) 295-2133"] },
  // Decision 13 (Fritz, 2026-11-15): SPMC fees from its official Rates and Fees PDF
  // (tables "As of August 31, 2022": Radiation Oncology p. 19, Room and Board p. 31,
  // Health Services and Specialty Clinic p. 57, Operating Room/Delivery Room p. 88).
  // Values as written, no peso sign (the PDF has none). The PDF link is added to sources.
  healthInstitutionFees: {
    1: {
      "Radiation Therapy (Linear Accelerator)": {
        fee: "LINAC Daily fee: 5,160.00 (Professional Fee 800.00 to 2,200.00); Conventional Radiotherapy (2D/3D) Session: 5,160.00 (Professional Fee 800.00 to 2,200.00); IMRT Treatment Session: 16,245.00 (Professional Fee 1,680.00 to 4,000.00); CT Simulation- IMRT: 57,730.00 (Professional Fee 11,546.00 to 27,430.00); Treatment Planning Dosimetry (Xray): 24,225.00 (Professional Fee 2,380.00 to 7,225.00); TREATMENT PLANNING SYSTEM (IMRT): 25,265.00 (Professional Fee 8,400.00 to 12,265.00). As of August 31, 2022.",
        source: "https://spmc.doh.gov.ph/wp-content/uploads/AllRatesAndFees-merged.pdf",
      },
      "Adult Cancer Clinic and Infusion Unit": {
        fee: "Adult Onco Unit room and board: 1,000.00. CHEMOTHERAPY (AVERAGE HCI FEES): 8,871.94 (Professional Fee 1,680.00 to 33,350.00). As of August 31, 2022.",
        source: "https://spmc.doh.gov.ph/wp-content/uploads/AllRatesAndFees-merged.pdf",
      },
      "Breast Imaging": {
        fee: "SCREENING MAMMOGRAM: 2,500.00. DIAGNOSTIC MAMMOGRAM: 3,500.00. As of August 31, 2022.",
        source: "https://spmc.doh.gov.ph/wp-content/uploads/AllRatesAndFees-merged.pdf",
      },
    },
  },
  // Decision 16 (Fritz, 2026-11-19, hospital coverage review, shape "A: linked"): what each
  // hospital accepts or is accredited for. programID links to a money-help program; null when
  // that program is not in the API (it stays on the hospital side only). Davao Doctors' coverage
  // is in scripts/v2-additions/HealthInstitution.json.
  healthInstitutionCoverage: {
    1: [
      {
        programID: 101002,
        name: "Z Benefit Packages",
        details: "Contracted for Acute Lymphocytic (Lymphoblastic) Leukemia (ALL), Breast Cancer, Cervical Cancer, Prostate Cancer, Colon Cancer and Rectum Cancer, as of September 30, 2026.",
        sources: ["https://www.philhealth.gov.ph/partners/providers/facilities/contracted/20260930_ContractedZBen.pdf"],
      },
      {
        programID: null,
        name: "Selected Outpatient Cancer Screening Tests",
        details: "Accredited for breast ultrasound, low-dose chest CT scan, liver ultrasound, mammography, alpha-fetoprotein and colonoscopy. Accreditation expires 12/31/2026.",
        sources: ["https://www.philhealth.gov.ph/partners/providers/facilities/accredited/CancerScreening.pdf"],
      },
      {
        programID: 161213,
        name: "YAKAP",
        details: "Accredited YAKAP clinic. Accreditation expires 12/31/2026.",
        sources: ["https://www.philhealth.gov.ph/partners/providers/facilities/accredited/YAKAP.pdf"],
      },
      {
        programID: 606002,
        name: "Cancer Assistance Fund",
        details: "One of 36 DOH Cancer Assistance Fund access sites (July 2026).",
        sources: ["https://tribune.net.ph/2026/07/06/doh-expands-cancer-assistance-fund-access-sites-to-36-nationwide"],
      },
      {
        programID: 606001,
        name: "MAIFIP",
        details: "Cancer patients at SPMC have used MAIFIP for laboratories, CT scans, procedures and medicines (2026).",
        sources: ["https://www.sunstar.com.ph/davao/maifip-program-eases-medical-cost-burden-for-struggling-families"],
      },
    ],
  },
  // Decision 11 (Fritz, 2026-11-15): one Z Benefits program instead of one per cancer,
  // keeping ALL the v1 details (his choice "A: labeled lists"). Every benefit, every
  // eligibility rule and each cancer's description stay as written, each labeled
  // "<cancer>: ...". The general membership rule below comes first, unlabeled; a cancer's
  // own copy of it is not repeated when it is word-for-word the same.
  zBenefitsMerge: {
    programID: 101002,
    program_name: "Z Benefits",
    // As written in the newer circulars (PC2024-0007, PC2023-0005).
    eligibility: ["PhilHealth members and their qualified dependents who are eligible to avail of PhilHealth benefits at the time of pre-authorization approval"],
    program_description: "PhilHealth's Z Benefits packages for selected cancers, at Z Benefits contracted health facilities. Each cancer has its own package and medical criteria; the hospital's Z Benefits coordinator checks them.",
  },
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
  // Decision 9: eligibility as a list, split as written (no rule removed or reworded;
  // only split where the source already separates parts). Programs not listed here
  // keep their one v1 sentence as a one-item list.
  eligibilityByProgram: {
    101002: [
      "PhilHealth members and their qualified dependents who are eligible to avail of PhilHealth benefits at the time of pre-authorization approval",
      "Breast cancer clinical stage requiring treatments covered under the Z Benefits (Stage 0 Ductal Carcinoma in Situ (DCIS), Stage I, Stage II, Stage III or Stage IV), with management involving any or all of: Surgery; Chemotherapy (neo/adjuvant); Targeted therapy; Hormonotherapy; Surveillance",
      "Chemotherapy (neo/adjuvant): patient has not initiated any chemotherapy treatment from any HF",
      "Diagnostic tests are covered when all of these are met: Positive (+) breast mass AND/OR palpable axillary lymph node; BI-RADS category 4 to 5 result of either mammogram or ultrasound; and Biopsy result of confirmed malignant breast cancer or ductal carcinoma in situ (DCIS)",
    ],
    101003: [
      "PhilHealth members and their qualified dependents, eligible upon application for pre-authorization",
      "Patients not yet registered in PhilHealth must complete member registration first",
      "Newly diagnosed case (a first-time diagnosis, not previously treated for the same condition under this Z Benefit package)",
      "Age 1 to less than 10 years old and 364 days",
      "White blood cell count ‹50,000/mcL",
      "No CNS leukemia at diagnosis",
      "There should be no testicular involvement of male patient at diagnosis",
      "WHO Classification: B or T lymphoblastic leukemia immunophenotype (mature B-cell ALL or Burkitt leukemia are excluded)",
      "The membership category upon approval of the pre-authorization applies for the three years of the package",
    ],
    101004: [
      "PhilHealth members and their qualified dependents, eligible upon application for pre-authorization",
      "Patients not yet registered in PhilHealth must complete member registration first",
      "Newly diagnosed case (a first-time diagnosis, not previously treated for the same condition under this Z Benefit package)",
      "Male patients age up to 70 years old",
      "Clinical stage (T1a-T2c), PSA level 10 to 20 ng/ml, Tumor Grade (Gleason's score of 2-7) - Low risk: T1-T2a and Gleason score 2-6, and PSA ‹10 ng/ml - Intermediate risk: T2b to T2c, Gleason score of 7, and PSA 10-20 ng/ml",
      "Localized prostate cancer",
      "No uncontrolled co-morbid conditions",
    ],
    101005: [
      "PhilHealth members and their qualified dependents, eligible upon application for pre-authorization",
      "Patients not yet registered in PhilHealth must complete member registration first",
      "Newly diagnosed case (a first-time diagnosis, not previously treated for the same condition under this Z Benefit package)",
      "No previous chemotherapy",
      "No previous radiotherapy",
      "No uncontrolled co-morbid conditions",
    ],
    101006: [
      "PhilHealth members and their qualified dependents who are eligible to avail of PhilHealth benefits at the time of pre-authorization approval",
      "Colon or rectal cancer stage I to III",
      "Normal or with mild systemic disease (ASA I or II)",
      "Fully active, able to carry on all pre-disease performance without restriction, OR restricted in physically strenuous activity but ambulatory and able to carry out work of a light or sedentary nature, e.g light house work, office work, OR ambulatory and capable of all self-care but unable to carry out any work activities. Up and about more than 50% of working hours.",
      "Services needed after progression to stage IV are not covered.",
    ],
  },
  // Fritz (2026-11-13): no loans, to avoid adding financial burden. SSS (Salary Loan),
  // GSIS (Multi-Purpose Loan) and Pag-IBIG (Housing Loan) had only a loan, so the whole
  // institution is left out of v2. Their ids are not reused. They stay in the v1 data.
  removeFinancialInstitutions: [2, 3, 4],
  // Official Facebook pages given by Fritz (2026-11-13). AMUMA's replaces a Facebook group link.
  socmedURLs: {
    1: "https://www.facebook.com/amumasupport",
    2: "https://www.facebook.com/kidsofhopeorg",
  },
  // Decision 10 (Fritz, 2026-11-13): YAKAP rewritten from https://www.philhealth.gov.ph/yakap/
  // (read 2026-11-13). The page is mostly images in Filipino: description, requirement,
  // steps and "Free" are translations; member groups and test names are as written.
  programOverrides: {
    161213: {
      program_name: "PhilHealth YAKAP: Yaman ng Kalusugan Program",
      eligibility: [
        "Government and Private Employees",
        "Kasambahay",
        "Indigents",
        "Persons with Disability",
        "Self-Earning Individuals or Professional Practitioners",
        "Lifetime Members",
        "Pantawid Pamilyang Pilipino Program (4Ps)",
        "Infants and Children under 21 years old",
        "Overseas Filipino Workers",
        "Solo Parent",
        "Senior Citizens",
      ],
      program_description: "Government program that helps Filipinos take care of their health and prevent illness. YAKAP Clinics watch over members' health, find illness early, and give the right medicines so the illness does not get worse and hospital stays are avoided.",
      cancerTypes: ["Breast Cancer", "Liver Cancer", "Colorectal Cancer", "Lung Cancer"],
      applicationURL: null,
      sources: ["https://www.philhealth.gov.ph/yakap/"],
      benefits: [
        { benefit_id: 1, benefit_name: "Primary Care Checkup", amount: "Free" },
        { benefit_id: 2, benefit_name: "Selected laboratory tests based on risk, age and health assessment: Complete Blood Count (CBC) with Platelet Count, Lipid Profile, Fasting Blood Sugar (FBS), Oral Glucose Tolerance Test (OGTT), Hemoglobin Test (HbA1c), Creatinine, Chest X-Ray, Sputum Microscopy, Electrocardiogram (ECG), Urinalysis, Pap Smear, Fecalysis, Fecal Occult Blood Test (FOBT), Upper Abdomen & Pelvic Ultrasound", amount: null },
        { benefit_id: 3, benefit_name: "Medicines under PhilHealth GAMOT", amount: null },
        { benefit_id: 4, benefit_name: "Breast cancer screening: Breast Ultrasound & Mammogram", amount: null },
        { benefit_id: 5, benefit_name: "Liver cancer screening: Alpha Fetoprotein Test & Liver Ultrasound", amount: null },
        { benefit_id: 6, benefit_name: "Colorectal cancer screening: Fecal Immunochemical Test, Fecal Occult Blood Test & Colonoscopy", amount: null },
        { benefit_id: 7, benefit_name: "Lung cancer screening: Low-dose Chest CT Scan", amount: null },
      ],
      requirements: [
        { requirement_id: 1, requirement_description: "PhilHealth Identification Number (PIN) with updated membership" },
      ],
      procedure: [
        { step: 1, instruction: "Register: make sure you have a PhilHealth Identification Number (PIN) and your membership is updated." },
        { step: 2, instruction: "Choose a YAKAP Clinic using the eGovPH Super App, the PhilHealth Member Portal, or the nearest PhilHealth office." },
        { step: 3, instruction: "Have your First Patient Encounter (FPE): medical history, health screening and health education." },
        { step: 4, instruction: "Sign the form agreeing that your chosen YAKAP Clinic will keep caring for you." },
        { step: 5, instruction: "Keep seeing your YAKAP doctor for prescriptions, referrals for laboratory and/or cancer screening tests when needed, and follow-up checkups." },
      ],
    },
  },
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
    for (const id of REVIEW.removeFinancialInstitutions) {
      const i = records.findIndex((r) => r.id === id);
      if (i >= 0) { log(`removed ${records[i].name} (only program: ${records[i].programs.map((p) => p.program_name).join(", ")})`); records.splice(i, 1); }
    }
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
        if (REVIEW.programOverrides[p.programID]) {
          Object.assign(p, structuredClone(REVIEW.programOverrides[p.programID]));
          log(`program ${p.programID}: replaced from its official page -> "${p.program_name}"`);
        }
        if (REVIEW.eligibilityByProgram[p.programID]) {
          p.eligibility = REVIEW.eligibilityByProgram[p.programID];
          log(`program ${p.programID}: eligibility -> ${p.eligibility.length} items`);
        }
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
      // Decision 11: the Z Benefits programs become one, where the first one was.
      const zs = r.programs.filter((p) => p.program_name.startsWith("Z Benefits:"));
      if (zs.length > 1) {
        const m = REVIEW.zBenefitsMerge;
        const cancerOf = (p) => p.program_name.replace(/^Z Benefits:\s*/, "");
        const packages = zs.flatMap((p) => p.benefits.map((b) => ({ benefit_name: `${cancerOf(p)}: ${b.benefit_name}`, amount: b.amount })));
        const eligibility = [
          ...m.eligibility,
          ...zs.flatMap((p) => p.eligibility.filter((e) => !m.eligibility.includes(e)).map((e) => `${cancerOf(p)}: ${e}`)),
        ];
        const description = [m.program_description, ...zs.map((p) => `${cancerOf(p)}: ${p.program_description}`)].join("\n\n");
        const merged = {
          programID: m.programID,
          program_name: m.program_name,
          eligibility,
          program_description: description,
          cancerTypes: [...new Set(zs.flatMap((p) => p.cancerTypes ?? []))],
          applicationURL: null,
          sources: [...new Set(zs.flatMap((p) => p.sources ?? []))],
          benefits: packages.map((b, i) => ({ benefit_id: i + 1, ...b })),
          requirements: zs[0].requirements,
          procedure: zs[0].procedure,
        };
        const at = r.programs.indexOf(zs[0]);
        r.programs = r.programs.filter((p) => !zs.includes(p));
        r.programs.splice(at, 0, merged);
        log(`${r.name}: ${zs.length} Z Benefits programs -> 1 "${m.program_name}" (${packages.length} benefits, ${eligibility.length} eligibility rules, ${merged.sources.length} sources)`);
      }
      // Decision 15: where to go, from the institution's official office directory.
      const u = REVIEW.financialInstitutionOffices[r.id];
      if (u) {
        for (const [bid, change] of Object.entries(u.branchChanges ?? {})) {
          const b = r.branches.find((x) => x.branchID === Number(bid));
          if (!b) throw new Error(`financialInstitutionOffices: no branch ${bid} in ${r.name}`);
          Object.assign(b, structuredClone(change));
        }
        for (const nb of u.addBranches ?? []) {
          r.branches.push({ branchID: r.branches.length + 1, branchName: nb.branchName, location: nb.location, latitude: null, longitude: null, schedule: [], contacts: structuredClone(nb.contacts) });
        }
        for (const c of u.addContacts ?? []) r.contacts.push({ contact_id: r.contacts.length + 1, ...c });
        for (const [pid, url] of Object.entries(u.applicationURLs ?? {})) {
          const p = r.programs.find((x) => x.programID === Number(pid));
          if (!p) throw new Error(`financialInstitutionOffices: no program ${pid} in ${r.name}`);
          p.applicationURL = url;
        }
        log(`${r.name}: offices from the official directory -> ${r.branches.length} branches, ${r.contacts.length} main contacts`);
      }
    }
  }
  if (folder === "HealthInstitution") {
    for (const r of records) {
      for (const { instiId, branchID } of REVIEW.clearBranchContacts) {
        const b = r.id === instiId && r.branches.find((x) => x.branchID === branchID);
        if (b && b.contacts.length) { log(`${r.name} branch ${branchID}: removed ${b.contacts.length} contacts`); b.contacts = []; }
      }
    }
    // Decision 12: official source, contacts and extra services, per institution id.
    for (const [id, u] of Object.entries(REVIEW.healthInstitutionUpdates)) {
      const r = records.find((x) => x.id === Number(id));
      if (!r) continue;
      if (u.name) { log(`${r.name} -> renamed "${u.name}"`); r.name = u.name; }
      if (u.source) r.source = u.source;
      if (u.contacts) r.contacts = structuredClone(u.contacts);
      const start = r.services.length;
      r.services.push(...u.addServices.map((s, i) => ({
        serviceID: start + i + 1,
        branchIDs: [1],
        service_name: s.service_name,
        service_description: s.service_description,
        cancerTypes: s.cancerTypes,
        fee: s.fee ?? null,
        sources: s.sources,
        service_schedule: s.service_schedule,
        requirements: [],
        procedure: [],
      })));
      log(`${r.name}: source, ${r.contacts.length} contacts, services ${start} -> ${r.services.length}`);
    }
    // Decision 13: fees by service name (a renamed service stops the build instead of being skipped).
    for (const [id, byName] of Object.entries(REVIEW.healthInstitutionFees)) {
      const r = records.find((x) => x.id === Number(id));
      if (!r) continue;
      for (const [name, f] of Object.entries(byName)) {
        const svc = r.services.find((x) => x.service_name === name);
        if (!svc) throw new Error(`healthInstitutionFees: no service "${name}" in ${r.name}`);
        svc.fee = f.fee;
        if (f.source && !svc.sources.includes(f.source)) svc.sources.push(f.source);
      }
      log(`${r.name}: fees for ${Object.keys(byName).length} services`);
    }
    // Decision 16: coverage (programs the hospital accepts or is accredited for).
    for (const [id, items] of Object.entries(REVIEW.healthInstitutionCoverage)) {
      const r = records.find((x) => x.id === Number(id));
      if (!r) continue;
      r.coverage = structuredClone(items);
      log(`${r.name}: coverage, ${items.length} items`);
    }
  }
  if (folder === "MedicalSpecialist") {
    // Decision 6: placeholder faces look like real doctors; no photo until there is a consented one.
    const ids = records.filter((r) => /i\.pravatar\.cc/.test(r.imageURL)).map((r) => { r.imageURL = ""; return r.id; });
    if (ids.length) log(`placeholder photos cleared: ${ids.join(", ")}`);
  }
  if (folder === "SupportGroups") {
    for (const r of records) {
      const url = REVIEW.socmedURLs[r.id];
      if (url && r.socmedURL !== url) { log(`${r.name}: socmedURL ${r.socmedURL ?? "null"} -> ${url}`); r.socmedURL = url; }
      // Decision 15: contacts that belong to another organization.
      const wrong = REVIEW.supportGroupWrongContacts[r.id] ?? [];
      const before = r.contacts.length;
      r.contacts = r.contacts.filter((c) => !wrong.includes(c.contact_details)).map((c, i) => ({ ...c, contact_id: i + 1 }));
      if (r.contacts.length !== before) log(`${r.name}: removed ${before - r.contacts.length} contact(s) of another organization`);
    }
  }
  // Decision 8: branch names stay null until the next source check (no change).
  return records;
}

// Records that exist only in v2 live in scripts/v2-additions/<Folder>.json (same records key).
function addV2Only(folder, key, records) {
  const p = join("scripts", "v2-additions", `${folder}.json`);
  if (!existsSync(p)) return;
  const taken = new Set(records.map((r) => r.id));
  for (const r of read(p)[key] ?? []) {
    if (taken.has(r.id)) throw new Error(`${p}: id ${r.id} is already used in ${folder}`);
    records.push(r);
    console.log(`  v2 only: added ${r.name ?? r.title ?? r.id} (id ${r.id})`);
  }
  records.sort((a, b) => a.id - b.id);
}

function write(folder, file, key, records) {
  if (!args.includes("--no-review")) { applyReview(folder, records); addV2Only(folder, key, records); }
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
      eligibility: list(g.eligibility),
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
    coverage: [],
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
