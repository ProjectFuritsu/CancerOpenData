// Emails a short "data updated" notice after a successful deploy.
//
//   node scripts/notify-update.mjs snapshot   (before deploy) saves the live data
//   node scripts/notify-update.mjs send       (after the smoke test) compares the
//                                             snapshot with data/ and emails the changes
//
// Env:
//   PUBLIC_URL      live API, e.g. https://cancer-open-data.<sub>.workers.dev
//   SNAPSHOT_DIR    where the snapshot goes (default: <tmp>/cod-before)
//   SMTP_USERNAME   Gmail address that sends the alert          (secret)
//   SMTP_PASSWORD   Gmail app password                          (secret)
//   NOTIFY_EMAILS   recipients, comma-separated, sent as Bcc    (secret)
//   DRY_RUN=1       print the email instead of sending it
//
// No email is sent when the data didn't change. Recipients are never printed.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const DATA = "data";
const SNAP = process.env.SNAPSHOT_DIR || join(tmpdir(), "cod-before");
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
const KEY = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.json$/;
const inCI = !!process.env.GITHUB_ACTIONS;
const warn = msg => console.log(inCI ? `::warning title=Update email::${msg}` : `WARN ${msg}`);

// ---------- snapshot ----------
async function snapshot() {
  rmSync(SNAP, { recursive: true, force: true });
  mkdirSync(SNAP, { recursive: true });
  if (!PUBLIC_URL) return warn("PUBLIC_URL not set; no snapshot, so the email can't show what changed.");
  try {
    const index = await (await fetch(`${PUBLIC_URL}/`)).json();
    let n = 0;
    for (const d of index.datasets ?? []) {
      for (const url of [d.data, d.schema].filter(Boolean)) {
        const key = new URL(url).pathname.slice(1);
        if (!KEY.test(key)) continue;
        const res = await fetch(url);
        if (!res.ok) continue;
        mkdirSync(dirname(join(SNAP, key)), { recursive: true });
        writeFileSync(join(SNAP, key), Buffer.from(await res.arrayBuffer()));
        n++;
      }
    }
    writeFileSync(join(SNAP, ".ok"), String(index.version ?? ""));
    console.log(`Snapshot: ${n} live files saved (live version ${index.version ?? "unknown"}).`);
  } catch (e) {
    warn(`Could not read the live API before deploy (${e.message}). The email will list all datasets as new.`);
  }
}

// ---------- compare ----------
function listKeys(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (!f.isDirectory()) continue;
    for (const file of readdirSync(join(dir, f.name))) {
      const key = `${f.name}/${file}`;
      if (KEY.test(key)) out.push(key);
    }
  }
  return out.sort();
}

const readJson = (dir, key) => JSON.parse(readFileSync(join(dir, key), "utf8"));
const recordsOf = json => {
  const k = Object.keys(json).find(x => x !== "$schema");
  return Array.isArray(json[k]) ? json[k] : [];
};
const labelOf = r =>
  r.name || r.title || [r.firstname, r.lastname].filter(Boolean).join(" ") || r.clinicName || `id ${r.id}`;

function diffRecords(before, after) {
  const byId = list => new Map(list.map((r, i) => [r.id ?? `#${i}`, r]));
  const b = byId(before), a = byId(after);
  const added = [], removed = [], changed = [];
  for (const [id, r] of a) {
    if (!b.has(id)) added.push(r);
    else if (JSON.stringify(b.get(id)) !== JSON.stringify(r)) changed.push(r);
  }
  for (const [id, r] of b) if (!a.has(id)) removed.push(r);
  return { added, removed, changed };
}

function compare() {
  const haveSnapshot = existsSync(join(SNAP, ".ok"));
  const now = new Set(listKeys(DATA));
  const then = new Set(haveSnapshot ? listKeys(SNAP) : []);
  const datasets = [];

  const dataKeys = [...new Set([...now, ...then])].filter(k => !k.endsWith(".schema.json"));
  for (const key of dataKeys) {
    const name = key.split("/")[0];
    const schemaKey = key.replace(/\.json$/, ".schema.json");
    const sameBytes = (k) => now.has(k) && then.has(k) &&
      readFileSync(join(DATA, k)).equals(readFileSync(join(SNAP, k)));
    const dataSame = sameBytes(key);
    const schemaSame = !now.has(schemaKey) && !then.has(schemaKey) ? true : sameBytes(schemaKey);
    if (dataSame && schemaSame) continue;

    const entry = { name, key, schemaChanged: !schemaSame };
    if (!now.has(key)) {
      entry.status = "removed";
      entry.before = recordsOf(readJson(SNAP, key)).length;
    } else if (!then.has(key)) {
      entry.status = "new";
      entry.after = recordsOf(readJson(DATA, key)).length;
    } else {
      entry.status = "updated";
      const before = recordsOf(readJson(SNAP, key)), after = recordsOf(readJson(DATA, key));
      Object.assign(entry, { before: before.length, after: after.length }, diffRecords(before, after));
    }
    datasets.push(entry);
  }
  return { haveSnapshot, datasets };
}

// ---------- email ----------
function git(...args) {
  try { return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; }
}

function buildEmail({ haveSnapshot, datasets }) {
  const repo = process.env.GITHUB_REPOSITORY || "ProjectFuritsu/CancerOpenData";
  const server = process.env.GITHUB_SERVER_URL || "https://github.com";
  const sha = process.env.GITHUB_SHA || git("rev-parse", "HEAD");
  const subject = `Cancer Open Data updated: ${datasets.map(d => d.name).join(", ")}`;
  const names = list => list.slice(0, 10).map(labelOf).join("; ") + (list.length > 10 ? `; and ${list.length - 10} more` : "");

  const lines = ["The public cancer data API was updated and passed its checks.", ""];
  for (const d of datasets) {
    if (d.status === "new") lines.push(`• ${d.name}: new dataset, ${d.after} records`);
    else if (d.status === "removed") lines.push(`• ${d.name}: removed (had ${d.before} records)`);
    else {
      lines.push(`• ${d.name}: ${d.before} → ${d.after} records`);
      if (d.added.length) lines.push(`    added (${d.added.length}): ${names(d.added)}`);
      if (d.changed.length) lines.push(`    changed (${d.changed.length}): ${names(d.changed)}`);
      if (d.removed.length) lines.push(`    removed (${d.removed.length}): ${names(d.removed)}`);
    }
    if (d.schemaChanged) lines.push(`    the schema (field rules) also changed`);
  }
  if (!haveSnapshot) lines.push("", "(The previous version couldn't be read, so every dataset is listed.)");

  const message = git("log", "-1", "--format=%s%n%n%b").trim();
  const author = git("log", "-1", "--format=%an");
  lines.push(
    "",
    `Change: ${message.split("\n")[0] || "(no message)"}${author ? ` (by ${author})` : ""}`,
    sha ? `Diff: ${server}/${repo}/commit/${sha}` : "",
    PUBLIC_URL ? `API: ${PUBLIC_URL}/` : "",
    process.env.GITHUB_RUN_ID ? `Pipeline run: ${server}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : "",
    "",
    "You get this email because you're on the update list for Cancer Open Data.",
  );
  return { subject, text: lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n\n(?=\nYou get)/, "\n") };
}

async function send() {
  const result = compare();
  if (result.datasets.length === 0) {
    console.log("No data changes since the last deploy. No email sent.");
    return;
  }
  const email = buildEmail(result);
  const { SMTP_USERNAME: user, SMTP_PASSWORD: pass, NOTIFY_EMAILS } = process.env;
  const to = (NOTIFY_EMAILS || "").split(/[,;\s]+/).filter(Boolean);

  if (process.env.DRY_RUN === "1" || !user || !pass || to.length === 0) {
    if (process.env.DRY_RUN !== "1") warn("SMTP_USERNAME, SMTP_PASSWORD or NOTIFY_EMAILS not set. Printing the email instead of sending it.");
    console.log(`--- email (not sent) to ${to.length} recipient(s) ---\nSubject: ${email.subject}\n\n${email.text}`);
    return;
  }

  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass },
  });
  const info = await transport.sendMail({
    from: `"Cancer Open Data" <${user}>`,
    to: user,     // the alert account itself
    bcc: to,      // recipients don't see each other
    subject: email.subject,
    text: email.text,
  });
  console.log(`Update email sent to ${to.length} recipient(s): ${email.subject} (${info.messageId})`);
}

const mode = process.argv[2];
if (mode === "snapshot") await snapshot();
else if (mode === "send") await send();
else { console.error("usage: node scripts/notify-update.mjs snapshot|send"); process.exit(2); }
