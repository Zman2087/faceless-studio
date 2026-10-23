#!/usr/bin/env node
// Render a spec to MP4 (and optionally a preview strip of stills).
//
//   node render.mjs spec.json out.mp4
//   node render.mjs spec.json out.mp4 --preview out.jpg --at 0.2,3,6,9
//   node render.mjs spec.json - --preview check.jpg --preview-only
//   node render.mjs spec.json --still cover.png --at 0.5      one full-size frame (thumbnails)
//   node render.mjs spec.json --validate
//
// Local files in the spec (audio, src, bg, music) are copied into public/_job/ automatically,
// so agents can point at ./clips/take1.mp4 or an https URL.
// Set REMOTION_BROWSER (or pass --browser <path>) if Remotion can't download Chrome on its own.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const has = (n) => args.includes(n);
const VALUE_FLAGS = ["--still", "--preview", "--at", "--words", "--browser", "--concurrency"];
const [specPath, outPath] = args.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(args[i - 1]));

if (!specPath) { console.error("usage: node render.mjs spec.json out.mp4 [--preview strip.jpg --at 0.2,3,6] [--words words.json] [--validate]"); process.exit(2); }

const specDir = path.dirname(path.resolve(specPath));
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
if (flag("--words")) spec.words = JSON.parse(fs.readFileSync(flag("--words"), "utf8"));

// ---------- validation (the checker agent relies on these messages) ----------
function validate(s) {
  const errs = [];
  if (!(s.duration > 0)) errs.push("duration must be > 0 seconds");
  if (!Array.isArray(s.shots) || !s.shots.length) errs.push("shots must be a non-empty array");
  const types = ["scene", "title", "number", "bars", "list", "timeline", "quote", "media", "compare", "chat", "kinetic"];
  const SETS = ["lane", "street", "docks", "station", "interview", "kitchen", "road", "rooftop", "office", "blank"];
  const transitions = ["fade", "cut", "slide", "zoom", "wipe"];
  let last = -1;
  (s.shots || []).forEach((sh, i) => {
    const n = `shots[${i}]`;
    if (!types.includes(sh.type)) errs.push(`${n}.type "${sh.type}" is not one of ${types.join(", ")}`);
    if (typeof sh.at !== "number" || sh.at < 0 || sh.at >= s.duration) errs.push(`${n}.at must be a number from 0 to duration`);
    if (sh.at <= last) errs.push(`${n}.at must be later than the previous shot`);
    last = sh.at;
    if (i === 0 && sh.at !== 0) errs.push("shots[0].at must be 0 (the hook frame is on screen from frame 0)");
    const hl = sh.type === "title" ? [sh.text, sh.highlight] : sh.type === "media" ? [sh.headline, sh.highlight] : null;
    if (hl && hl[1] && !(hl[0] || "").includes(hl[1])) errs.push(`${n}.highlight "${hl[1]}" is not an exact substring of its headline`);
    if (sh.stamp && String(sh.stamp.text).length > 7) errs.push(`${n}.stamp.text must be 7 characters or fewer`);
    if (sh.type === "media" && !sh.src) errs.push(`${n}.src is required for media shots`);
    const moves = ["push", "pull", "pan_left", "pan_right", "rise", "fall", "still"];
    if (sh.type === "media" && sh.move && !moves.includes(sh.move)) errs.push(`${n}.move "${sh.move}" is not one of ${moves.join(", ")}`);
    if (sh.focus && (typeof sh.focus.x !== "number" || typeof sh.focus.y !== "number")) errs.push(`${n}.focus needs x and y between 0 and 1`);
    if (sh.type === "scene") {
      if (!SETS.includes(sh.set)) errs.push(`${n}.set "${sh.set}" is not one of ${SETS.join(", ")}`);
      (sh.actors || []).forEach((a, k) => {
        if (typeof a.x !== "number") errs.push(`${n}.actors[${k}].x must be a number (0-1080)`);
        if (a.cast && !(s.cast || {})[a.cast]) errs.push(`${n}.actors[${k}].cast "${a.cast}" is not in spec.cast`);
      });
    }
    if (sh.type === "number" && typeof sh.value !== "number") errs.push(`${n}.value must be a number`);
    if (["bars", "list", "timeline"].includes(sh.type) && !(sh.items || []).length) errs.push(`${n}.items must not be empty`);
    if (sh.transition && !transitions.includes(sh.transition)) errs.push(`${n}.transition "${sh.transition}" is not one of ${transitions.join(", ")}`);
    if (sh.type === "compare" && !(sh.left?.items?.length && sh.right?.items?.length)) errs.push(`${n}.left.items and .right.items must not be empty`);
    if (sh.type === "chat" && !(sh.messages || []).length) errs.push(`${n}.messages must not be empty`);
    if (sh.type === "kinetic" && !sh.text) errs.push(`${n}.text is required for kinetic shots`);
    if (sh.type === "kinetic" && sh.highlight && !(sh.text || "").includes(sh.highlight)) errs.push(`${n}.highlight "${sh.highlight}" is not an exact substring of its text`);
  });
  (s.overlays || []).forEach((o, i) => {
    if (o.end != null && o.end <= o.at) errs.push(`overlays[${i}].end must be after .at`);
    if (o.style && o.style !== "poster") errs.push(`overlays[${i}].style must be "poster" or left out`);
    if (o.type === "titlecard" && o.style === "poster" && o.number && String(o.number).length > 3) errs.push(`overlays[${i}].number is the part number (3 characters or fewer)`);
    if (o.highlight && !(o.text || "").includes(o.highlight)) errs.push(`overlays[${i}].highlight is not a substring of its text`);
    if (o.type === "choice") {
      const ops = o.options || [];
      if (ops.length < 2 || ops.length > 3) errs.push(`overlays[${i}] choice needs 2-3 options`);
      if (ops.some((x) => !x.key || !x.label || x.label.length > 40)) errs.push(`overlays[${i}] choice options need a key and a label of 40 characters or fewer`);
      if ((o.text || "").length > 70) errs.push(`overlays[${i}] choice text must be 70 characters or fewer`);
    }
    if (o.type === "routes" && (!Array.isArray(o.lanes) || o.lanes.length < 1 || o.lanes.length > 2 || o.lanes.some((l) => !l.steps?.length || l.steps.length > 12))) errs.push(`overlays[${i}] routes needs 1-2 lanes of 1-12 steps`);
    if (o.type === "meter" && !(o.value >= 0 && o.value <= 100)) errs.push(`overlays[${i}] meter value must be 0-100`);
    if (o.type === "cameo") {
      const hs = o.handles || [];
      if (!hs.length || hs.length > 8) errs.push(`overlays[${i}] cameo needs 1-8 handles`);
      if (hs.some((h) => !/^@[A-Za-z0-9._]{1,30}$/.test(h))) errs.push(`overlays[${i}] cameo handles must look like @handle`);
    }
  });
  return errs;
}
const errs = validate(spec);
if (errs.length) { console.error("SPEC INVALID:\n- " + errs.join("\n- ")); process.exit(1); }
if (has("--validate")) { console.log("SPEC OK"); process.exit(0); }

// ---------- stage local assets into public/_job ----------
const job = crypto.createHash("sha1").update(JSON.stringify(spec)).digest("hex").slice(0, 10);
const pub = path.join(HERE, "public", "_job", job);
fs.mkdirSync(pub, { recursive: true });
const stage = (v) => {
  if (!v || /^(https?:|data:)/.test(v)) return v;
  const abs = path.isAbsolute(v) ? v : path.resolve(specDir, v);
  if (!fs.existsSync(abs)) { console.error(`MISSING FILE: ${v}`); process.exit(1); }
  const name = path.basename(abs);
  fs.copyFileSync(abs, path.join(pub, name));
  return `_job/${job}/${name}`;
};
spec.audio = stage(spec.audio);
spec.music = stage(spec.music);
spec.ambience = stage(spec.ambience);
for (const x of spec.sounds || []) x.src = stage(x.src);
for (const sh of spec.shots) { if (sh.src) sh.src = stage(sh.src); if (sh.bg) sh.bg = stage(sh.bg); }

// ---------- browser ----------
// Pre-installed Playwright Chromium (cloud sandboxes, the Higgsfield sandbox, or `npx playwright install chromium`).
const pwRoots = ["/opt/pw-browsers", "/ms-playwright", path.join(process.env.HOME || "", ".cache/ms-playwright")].filter((r) => fs.existsSync(r));
const candidates = [flag("--browser"), process.env.REMOTION_BROWSER,
  ...pwRoots.flatMap((r) => fs.readdirSync(r).filter((d) => /^chromium-\d/.test(d))
    .flatMap((d) => [`${r}/${d}/chrome-linux64/chrome`, `${r}/${d}/chrome-linux/chrome`]))];
const browserExecutable = candidates.find((p) => p && fs.existsSync(p)) || null;
const chromeMode = browserExecutable && !process.env.REMOTION_HEADLESS_SHELL ? "chrome-for-testing" : "headless-shell";

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src/index.ts"), publicDir: path.join(HERE, "public") });
const composition = await selectComposition({ serveUrl, id: "Video", inputProps: spec, browserExecutable, chromeMode });
const concurrency = Number(flag("--concurrency") || 2);

if (outPath && outPath !== "-" && !has("--preview-only")) {
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: outPath, inputProps: spec, browserExecutable, chromeMode, concurrency,
    onProgress: ({ progress }) => process.stdout.write(`\rrendering ${Math.round(progress * 100)}%`) });
  process.stdout.write("\n");
  console.log(`VIDEO ${outPath} ${composition.width}x${composition.height} ${(composition.durationInFrames / composition.fps).toFixed(1)}s`);
}

const still = flag("--still");
if (still) {
  fs.mkdirSync(path.dirname(path.resolve(still)), { recursive: true });
  const at = Number(flag("--at") || 0.5);
  await renderStill({ composition, serveUrl, output: path.resolve(still), frame: Math.min(composition.durationInFrames - 1, Math.round(at * composition.fps)), inputProps: spec, browserExecutable, chromeMode, imageFormat: still.endsWith(".png") ? "png" : "jpeg", jpegQuality: 92 });
  console.log(`STILL ${still} ${composition.width}x${composition.height} at ${at} s`);
}
const preview = flag("--preview");
if (preview) {
  const times = (flag("--at") || "0.2,3,6,9").split(",").map(Number).filter((x) => x < spec.duration);
  const tmp = fs.mkdtempSync(path.join(HERE, "public", "_job", "prev-"));
  const files = [];
  for (const [i, at] of times.entries()) {
    const f = path.join(tmp, `${i}.png`);
    await renderStill({ composition, serveUrl, output: f, frame: Math.min(composition.durationInFrames - 1, Math.round(at * composition.fps)), inputProps: spec, browserExecutable, chromeMode, scale: 0.35 });
    files.push(f);
  }
  const inputs = files.flatMap((f) => ["-i", f]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${files.map((_, i) => `[${i}]`).join("")}hstack=inputs=${files.length}`, preview]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`PREVIEW ${preview} at ${times.join(", ")} s`);
}
fs.rmSync(pub, { recursive: true, force: true });
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
