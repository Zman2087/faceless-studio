#!/usr/bin/env node
// Render a long spec (90-150 s episodes) in chunks so each job stays well inside sandbox time limits,
// then stitch the chunks and lay the full audio back over the joined picture.
//   node tools/render-long.mjs spec.json out.mp4 [--chunk 25] [--only 3] [--mix-only]
//   --only: render one chunk, for parallel jobs. --mix-only: keep the rendered picture, redo just the audio mix.
// A sound with "bed": true (sirens, crowd, wind) joins the music/ambience bed and is ducked under the voice.
// Chunks split at shot boundaries; overlays, words and sounds are re-timed into each chunk.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const [inp, out] = args.filter((a, i) => !a.startsWith("--") && !["--chunk", "--only"].includes(args[i - 1]));
if (!inp || !out) { console.error("usage: render-long.mjs spec.json out.mp4 [--chunk 25] [--only N]"); process.exit(2); }
const CH = Number(flag("--chunk") || 25);
const specDir = path.dirname(path.resolve(inp));
const spec = JSON.parse(fs.readFileSync(inp, "utf8"));
const shots = [...spec.shots].sort((a, b) => a.at - b.at);

// cut points: the first shot boundary after every CH seconds
const cuts = [0];
for (const s of shots) if (s.at - cuts[cuts.length - 1] >= CH && spec.duration - s.at > 4) cuts.push(s.at);
cuts.push(spec.duration);
const work = path.join(path.dirname(path.resolve(out)), path.basename(out, ".mp4") + ".chunks");
fs.mkdirSync(work, { recursive: true });
const abs = (v) => (!v || /^(https?:|data:)/.test(v) ? v : path.resolve(specDir, v));
const files = [];
// cast head sheets are spec-relative; chunk specs live elsewhere, so make them absolute
for (const c of Object.values(spec.cast || {})) if (c.toon?.head?.src) c.toon.head.src = abs(c.toon.head.src);
for (let c = 0; c < cuts.length - 1; c++) {
  const [a, b] = [cuts[c], cuts[c + 1]];
  const file = path.join(work, `chunk${String(c + 1).padStart(2, "0")}.mp4`);
  files.push(file);
  if (flag("--only") && Number(flag("--only")) !== c + 1) continue;
  if (args.includes("--mix-only")) continue;
  const inChunk = shots.filter((s) => s.at < b && (shots[shots.indexOf(s) + 1]?.at ?? spec.duration) > a);
  const part = {
    ...spec, duration: +(b - a).toFixed(3), audio: undefined, music: undefined, ambience: undefined, sounds: undefined, // audio goes back on after stitching
    shots: inChunk.map((s, i) => ({ ...s, at: i === 0 ? 0 : +(s.at - a).toFixed(3), ...(s.src && { src: abs(s.src) }), ...(s.bg && { bg: abs(s.bg) }), transition: i === 0 ? "cut" : s.transition })),
    overlays: (spec.overlays || []).filter((o) => o.at < b && (o.end ?? spec.duration) > a).map((o) => ({ ...o, at: Math.max(0, +(o.at - a).toFixed(3)), end: +(Math.min(o.end ?? spec.duration, b) - a).toFixed(3) })),
    words: (spec.words || []).filter((w) => w.s >= a && w.s < b).map((w) => ({ ...w, s: +(w.s - a).toFixed(3), e: +(w.e - a).toFixed(3) })),
  };
  // a scene shot that started in the previous chunk keeps its place in time
  const first = inChunk[0];
  if (first && first.at < a && first.type === "scene") {
    const len = (shots[shots.indexOf(first) + 1]?.at ?? spec.duration) - first.at;
    part.shots[0] = { ...part.shots[0], start_offset: +(a - first.at).toFixed(3), shot_len: +len.toFixed(3) };
  }
  const pf = path.join(work, `chunk${c + 1}.json`);
  fs.writeFileSync(pf, JSON.stringify(part));
  console.log(`CHUNK ${c + 1}/${cuts.length - 1}  ${a.toFixed(1)}–${b.toFixed(1)} s`);
  execFileSync("node", [path.join(HERE, "..", "render.mjs"), pf, file, "--concurrency", flag("--concurrency") || "2"], { stdio: ["ignore", "ignore", "inherit"] });
}
if (flag("--only")) process.exit(0);
const silent = path.join(work, "picture.mp4");
if (!args.includes("--mix-only") || !fs.existsSync(silent)) execFileSync("bash", [path.join(HERE, "stitch.sh"), silent, ...files], { stdio: "inherit" });
// full mix: voice + music bed + timed sounds, over the stitched picture
const ins = ["-i", silent], filters = [], mix = [];
let n = 1, voice = null;
if (spec.audio) { ins.push("-i", abs(spec.audio)); filters.push(`[${n}:a]volume=${spec.audio_volume ?? 1},asplit=2[a${n}][sc${n}]`); mix.push(`[a${n}]`); voice = `[sc${n}]`; n++; }
// the bed: music + ambience, low, and ducked under the voice so it always leads
const bed = [];
if (spec.music) { ins.push("-stream_loop", "-1", "-i", abs(spec.music)); filters.push(`[${n}:a]volume=${spec.music_volume ?? 0.12}[b${n}]`); bed.push(`[b${n}]`); n++; }
if (spec.ambience) { ins.push("-stream_loop", "-1", "-i", abs(spec.ambience)); filters.push(`[${n}:a]volume=${spec.ambience_volume ?? 0.08}[b${n}]`); bed.push(`[b${n}]`); n++; }
const delayed = (x) => `adelay=${Math.round(x.at * 1000)}|${Math.round(x.at * 1000)},volume=${x.volume ?? 1}`;
for (const x of (spec.sounds || []).filter((x) => x.bed)) { ins.push("-i", abs(x.src)); filters.push(`[${n}:a]${delayed(x)},apad[b${n}]`); bed.push(`[b${n}]`); n++; }
if (bed.length) {
  filters.push(`${bed.join("")}amix=inputs=${bed.length}:normalize=0:duration=longest[bed]`);
  if (voice) { filters.push(`[bed]${voice}sidechaincompress=threshold=0.02:ratio=${Math.max(1, 1 / Math.max(0.1, spec.duck ?? 0.6)) * 2}:attack=30:release=450[bedd]`); mix.push("[bedd]"); }
  else mix.push("[bed]");
} else if (voice) filters.push(`${voice}anullsink`);
for (const x of (spec.sounds || []).filter((x) => !x.bed)) { ins.push("-i", abs(x.src)); filters.push(`[${n}:a]${delayed(x)}[a${n}]`); mix.push(`[a${n}]`); n++; }
if (mix.length) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...ins, "-filter_complex", `${filters.join(";")};${mix.join("")}amix=inputs=${mix.length}:normalize=0:duration=first[out]`, "-map", "0:v", "-map", "[out]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(spec.duration), "-movflags", "+faststart", out]);
} else fs.copyFileSync(silent, out);
console.log(`LONG ${out} ${spec.duration}s in ${files.length} chunks`);
