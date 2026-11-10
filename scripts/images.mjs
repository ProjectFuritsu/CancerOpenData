// Shared rules for images/, used by validate.mjs and build-site.mjs.
//
//   images/<Folder>/<file>     served at   /images/<Folder>/<file>
//
// <Folder>: letters, digits, - or _ (e.g. MedicalSpecialist)
// <file>:   lowercase letters, digits, - _ . ; one of the allowed types
// SVG isn't allowed: it can carry scripts.
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

export const IMAGES_DIR = process.env.IMAGES_DIR || "images";
export const IMAGE_TYPES = ["webp", "avif", "png", "jpg", "jpeg", "gif"];
export const WARN_BYTES = 500 * 1024;       // warn above 500 KB
export const MAX_BYTES = 5 * 1024 * 1024;   // fail above 5 MB (Cloudflare's own limit is 25 MiB)

const TYPES = IMAGE_TYPES.join("|");
export const IMAGE_FILE_RE = new RegExp(`^[A-Za-z0-9_-]+/[a-z0-9][a-z0-9._-]*\\.(${TYPES})$`);
export const IMAGE_PATH_RE = new RegExp(`^/images/[A-Za-z0-9_-]+/[a-z0-9][a-z0-9._-]*\\.(${TYPES})$`);

// Data fields that hold images.
export const IMAGE_FIELDS = new Set(["bgImageURL", "imageURL"]);

// Every file under images/, as "<Folder>/<file>" with its size.
export function listImageFiles(dir = IMAGES_DIR) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const folder of readdirSync(dir, { withFileTypes: true })) {
    if (!folder.isDirectory()) {
      if (!folder.name.startsWith(".") && folder.name !== "README.md") out.push({ rel: folder.name, size: statSync(join(dir, folder.name)).size, loose: true });
      continue;
    }
    for (const f of readdirSync(join(dir, folder.name), { withFileTypes: true })) {
      if (f.name.startsWith(".")) continue;
      const rel = `${folder.name}/${f.name}`;
      out.push({ rel, size: f.isFile() ? statSync(join(dir, rel)).size : 0, dir: !f.isFile() });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

// Every image value in a parsed data file: [{ where, value }]
export function findImageValues(node, where = "$") {
  const found = [];
  if (Array.isArray(node)) node.forEach((x, i) => found.push(...findImageValues(x, `${where}[${i}]`)));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (IMAGE_FIELDS.has(k) && typeof v === "string") found.push({ where: `${where}.${k}`, value: v });
      else found.push(...findImageValues(v, `${where}.${k}`));
    }
  }
  return found;
}
