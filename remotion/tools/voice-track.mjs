#!/usr/bin/env node
// Join the narrator's takes and the characters' lines into one voice track, in script order.
//   node tools/voice-track.mjs takes.json voice.mp3 [--gap 0.25]
// takes.json: [{ "file": "n01.mp3", "speaker": "narrator" }, { "file": "pike01.mp3", "speaker": "pike", "gap": 0.1 }, …]
// Each take is loudness-matched (shouting characters stay loud, but nothing clips), joined with short
// gaps, and the result is ready to transcribe (faster-whisper) for word timings → tools/beats.mjs.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2);
const [inp, out] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--gap");
const gi = args.indexOf("--gap"); const GAP = gi >= 0 ? Number(args[gi + 1]) : 0.25;
if (!inp || !out) { console.error("usage: voice-track.mjs takes.json voice.mp3 [--gap 0.25]"); process.exit(2); }
const dir = path.dirname(path.resolve(inp));
const takes = JSON.parse(fs.readFileSync(inp, "utf8"));
const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), ".vt-"));
const parts = [], timeline = [];
let t = 0;
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
takes.forEach((tk, i) => {
  const src = path.resolve(dir, tk.file);
  const norm = path.join(tmp, `t${i}.wav`);
  // one consistent level for every voice; -16 LUFS is the usual target for phone speech
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000", "-ac", "1", norm]);
  const gap = i === 0 ? 0 : tk.gap ?? GAP;
  if (gap > 0) { const g = path.join(tmp, `g${i}.wav`); execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono`, "-t", String(gap), g]); parts.push(g); t += gap; }
  const d = dur(norm);
  timeline.push({ i, speaker: tk.speaker || "narrator", file: tk.file, start: +t.toFixed(3), end: +(t + d).toFixed(3) });
  parts.push(norm); t += d;
});
const list = path.join(tmp, "list.txt");
fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c:a", "libmp3lame", "-b:a", "192k", out]);
fs.writeFileSync(out.replace(/\.\w+$/, "") + ".timeline.json", JSON.stringify(timeline, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`VOICE ${out} ${t.toFixed(1)} s · ${takes.length} takes (${[...new Set(timeline.map((x) => x.speaker))].join(", ")})`);
