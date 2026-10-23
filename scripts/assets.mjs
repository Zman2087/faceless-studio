#!/usr/bin/env node
// The asset library: every clip, still, b-roll, music bed and sound a character can reuse,
// with where it came from, its licence, the credit line to show, and which posts used it.
// Lives in channels/<slug>/assets/ (library.json + files/). Use "_shared" as the slug for assets every character can use.
//
//   node scripts/assets.mjs add   <slug> <file|https-url> --kind broll --tags kitchen,morning --licence own [--source URL] [--credit "Photo: …"] [--note …] [--job-id …]
//   node scripts/assets.mjs find  <slug> [--kind broll] [--tags kitchen] [--q text] [--min-dur 3] [--unused-days 30] [--json]
//   node scripts/assets.mjs use   <slug> <id> --post p-012                # record that a post used it
//   node scripts/assets.mjs check <slug>                                  # missing files, unclear licences, missing credits; exit 1 on problems
//   node scripts/assets.mjs seed  <slug>                                  # import the face anchor, character sheet and location stills from settings.json
//   node scripts/assets.mjs list  <slug>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KINDS = ["clip", "broll", "still", "photo", "music", "sfx", "voice", "font", "logo-free-graphic"];
// licence → may we use it, and must we show a credit?
const LICENCES = {
  own: { ok: true, credit: false, note: "generated for this account (Higgsfield/ElevenLabs) or made by the owner" },
  cc0: { ok: true, credit: false, note: "public domain" },
  pexels: { ok: true, credit: false, note: "Pexels licence: free, no credit needed (credit appreciated)" },
  pixabay: { ok: true, credit: false, note: "Pixabay content licence" },
  unsplash: { ok: true, credit: false, note: "Unsplash licence (stills only)" },
  "cc-by": { ok: true, credit: true, note: "Creative Commons Attribution: the credit line is required" },
  licensed: { ok: true, credit: false, note: "paid licence: put the order/licence ref in --note" },
  unknown: { ok: false, credit: false, note: "never publish until the licence is known" },
};

const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--kind", "--tags", "--licence", "--license", "--source", "--credit", "--note", "--job-id", "--q", "--min-dur", "--post", "--unused-days"];
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const [cmd, slug, target] = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
const die = (m) => { console.error(m); process.exit(2); };
if (!cmd || !slug) die(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 12).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));

const dir = path.join(ROOT, "channels", slug, "assets");
const libFile = path.join(dir, "library.json");
if (slug !== "_shared" && !fs.existsSync(path.join(ROOT, "channels", slug))) die(`no channels/${slug}/ (run /new-channel first)`);
const lib = fs.existsSync(libFile) ? JSON.parse(fs.readFileSync(libFile, "utf8")) : { assets: [] };
const save = () => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(libFile, JSON.stringify(lib, null, 2) + "\n"); };
const nextId = () => `a-${String(lib.assets.reduce((m, a) => Math.max(m, Number(a.id.slice(2)) || 0), 0) + 1).padStart(3, "0")}`;
const abs = (a) => (a.file ? path.join(dir, a.file) : null);

function probe(f) {
  try {
    const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", f], { encoding: "utf8" }));
    const v = j.streams.find((s) => s.codec_type === "video");
    const dur = Number(j.format.duration);
    return { width: v?.width, height: v?.height, duration: Number.isFinite(dur) && dur > 0.05 && !/image|png|mjpeg/.test(v?.codec_name || "") ? +dur.toFixed(2) : undefined };
  } catch { return {}; }
}

if (cmd === "add") {
  if (!target) die("add needs a file or https URL");
  const kind = flag("--kind"); if (!KINDS.includes(kind)) die(`--kind must be one of ${KINDS.join(", ")}`);
  const licence = flag("--licence") || flag("--license") || "unknown";
  if (!LICENCES[licence]) die(`--licence must be one of ${Object.keys(LICENCES).join(", ")}`);
  if (LICENCES[licence].credit && !flag("--credit")) die(`licence ${licence} needs --credit "the exact credit line"`);
  const a = { id: nextId(), kind, tags: (flag("--tags") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean), licence,
    source: flag("--source"), credit: flag("--credit"), note: flag("--note"), job_id: flag("--job-id"), added: new Date().toISOString().slice(0, 10), used_in: [] };
  if (/^https?:/.test(target)) a.url = target;
  else {
    if (!fs.existsSync(target)) die(`MISSING FILE: ${target}`);
    const sha = crypto.createHash("sha1").update(fs.readFileSync(target)).digest("hex");
    const dupe = lib.assets.find((x) => x.sha1 === sha);
    if (dupe) { console.log(`EXISTS ${dupe.id} (same file)`); process.exit(0); }
    const name = `${a.id}-${path.basename(target).toLowerCase().replace(/[^a-z0-9._-]+/g, "-")}`;
    fs.mkdirSync(path.join(dir, "files"), { recursive: true });
    fs.copyFileSync(target, path.join(dir, "files", name));
    Object.assign(a, { file: `files/${name}`, sha1: sha }, probe(path.join(dir, "files", name)));
  }
  for (const k of Object.keys(a)) if (a[k] === undefined) delete a[k];
  lib.assets.push(a); save();
  console.log(`ADDED ${a.id} ${kind} [${a.tags.join(", ")}] ${licence}${a.duration ? ` ${a.duration}s` : ""}`);
} else if (cmd === "find" || cmd === "list") {
  const kind = flag("--kind"), tags = (flag("--tags") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const q = (flag("--q") || "").toLowerCase(), minDur = Number(flag("--min-dur") || 0), unusedDays = Number(flag("--unused-days") || 0);
  const cutoff = unusedDays ? new Date(Date.now() - unusedDays * 864e5).toISOString().slice(0, 10) : null;
  const hits = lib.assets.filter((a) => LICENCES[a.licence]?.ok || cmd === "list")
    .filter((a) => !kind || a.kind === kind)
    .filter((a) => tags.every((t) => a.tags.includes(t)))
    .filter((a) => !q || [a.note, a.source, ...a.tags].join(" ").toLowerCase().includes(q))
    .filter((a) => !minDur || (a.duration ?? 0) >= minDur)
    .filter((a) => !cutoff || !(a.used_in || []).some((u) => u.on >= cutoff))
    // least used first, so the feed doesn't repeat the same b-roll
    .sort((x, y) => (x.used_in?.length || 0) - (y.used_in?.length || 0) || x.id.localeCompare(y.id));
  if (argv.includes("--json")) console.log(JSON.stringify(hits.map((a) => ({ ...a, path: abs(a) ?? a.url })), null, 2));
  else for (const a of hits) console.log(`${a.id}  ${a.kind.padEnd(6)} ${a.licence.padEnd(8)} ${(a.duration ? a.duration + "s" : "").padStart(6)}  used ${a.used_in?.length || 0}×  [${a.tags.join(", ")}]  ${a.file ?? a.url}${a.credit ? `  credit: ${a.credit}` : ""}`);
  if (!hits.length) console.log("no matching assets");
} else if (cmd === "use") {
  const a = lib.assets.find((x) => x.id === target); if (!a) die(`no asset ${target}`);
  if (!LICENCES[a.licence].ok) die(`${a.id} has licence "${a.licence}": not cleared for use`);
  const post = flag("--post"); if (!post) die("use needs --post p-NNN");
  a.used_in = [...(a.used_in || []).filter((u) => u.post !== post), { post, on: new Date().toISOString().slice(0, 10) }]; save();
  console.log(`USED ${a.id} in ${post}${a.credit ? ` (put "credit": "${a.credit}" on the shot)` : ""}`);
} else if (cmd === "check") {
  const problems = [];
  for (const a of lib.assets) {
    if (a.file && !fs.existsSync(abs(a))) problems.push(`${a.id}: file missing (${a.file})`);
    if (!LICENCES[a.licence]) problems.push(`${a.id}: unknown licence value "${a.licence}"`);
    else if (!LICENCES[a.licence].ok) problems.push(`${a.id}: licence unknown — find the source or delete it`);
    if (LICENCES[a.licence]?.credit && !a.credit) problems.push(`${a.id}: ${a.licence} needs a credit line`);
    if (a.licence !== "own" && !a.source) problems.push(`${a.id}: no --source URL (needed to prove the licence)`);
    if (a.licence === "unsplash" && a.duration) problems.push(`${a.id}: Unsplash is stills only`);
  }
  const seen = new Map();
  for (const a of lib.assets) if (a.sha1) { if (seen.has(a.sha1)) problems.push(`${a.id}: duplicate of ${seen.get(a.sha1)}`); else seen.set(a.sha1, a.id); }
  for (const p of problems) console.log(`FAIL ${p}`);
  console.log(problems.length ? `CHECK FAILED ${problems.length}` : `CHECK OK ${lib.assets.length} assets`);
  process.exit(problems.length ? 1 : 0);
} else if (cmd === "seed") {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, "channels", slug, "settings.json"), "utf8"));
  const c = s.character || {};
  const items = [
    [c.face_anchor, ["face-anchor", "identity"]],
    [c.sheet, ["character-sheet", "identity"]],
    ...(c.location_stills || []).map((l) => [l, ["location", l.key].filter(Boolean)]),
  ].filter(([x]) => x?.media_url);
  let n = 0;
  for (const [x, tags] of items) {
    if (lib.assets.some((a) => a.url === x.media_url)) continue;
    lib.assets.push({ id: nextId(), kind: "still", tags, licence: "own", url: x.media_url, job_id: x.job_id || undefined, note: x.description || x.note, added: new Date().toISOString().slice(0, 10), used_in: [] });
    n++;
  }
  save(); console.log(`SEEDED ${n} stills from settings.json`);
} else die(`unknown command "${cmd}" (add, find, list, use, check, seed)`);
