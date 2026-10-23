#!/usr/bin/env node
// Clip editing before and after Remotion: everything ffmpeg does well, with safe defaults for 9:16 social video.
//   node tools/edit.mjs probe   in.mp4                                   # size, fps, length, audio, loudness (JSON)
//   node tools/edit.mjs trim    in.mp4 out.mp4 --from 0.4 [--to 7.9]     # frame-accurate cut (re-encodes)
//   node tools/edit.mjs reframe in.mp4 out.mp4 [--mode blur|crop|pad]    # any shape -> 1080x1920 @ 30
//   node tools/edit.mjs jumpcut in.mp4 out.mp4 [--words words.json] [--gap 0.35] [--pad 0.08] [--words-out cut-words.json]
//                                                                        # removes pauses; re-times the words for captions
//   node tools/edit.mjs loudnorm in.mp4 out.mp4 [--lufs -14]             # social loudness (-14 LUFS, -1.5 dBTP)
//   node tools/edit.mjs qc      final.mp4                                # delivery check; exit 1 on any FAIL
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const [cmd, ...rest] = process.argv.slice(2);
const VALUE_FLAGS = ["--from", "--to", "--mode", "--words", "--gap", "--pad", "--words-out", "--lufs", "--db", "--min"];
const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const [inp, out] = rest.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(rest[i - 1]));
const die = (m) => { console.error(m); process.exit(2); };
if (!cmd || !inp) die(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 9).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
if (!fs.existsSync(inp)) die(`MISSING FILE: ${inp}`);

const ff = (a) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...a], { stdio: ["ignore", "inherit", "inherit"] });
const ffStderr = (a) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...a], { encoding: "utf8", maxBuffer: 1 << 26 }).stderr;
const ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"];

function probe(f) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", f], { encoding: "utf8" }));
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  const [n, d] = (v?.avg_frame_rate || "0/1").split("/").map(Number);
  return {
    file: f, duration: +Number(j.format.duration).toFixed(3), width: v?.width, height: v?.height, fps: d ? +(n / d).toFixed(2) : 0,
    vcodec: v?.codec_name, pix_fmt: v?.pix_fmt, acodec: a?.codec_name ?? null, sample_rate: a ? Number(a.sample_rate) : null,
    faststart: moovFirst(f),
  };
}
// MP4 "faststart": the moov atom sits before mdat, so the app can start playing before the whole file arrives.
function moovFirst(f) {
  const fd = fs.openSync(f, "r"); const buf = Buffer.alloc(8); let pos = 0; const size = fs.fstatSync(fd).size;
  try {
    while (pos + 8 <= size) {
      fs.readSync(fd, buf, 0, 8, pos);
      const len = buf.readUInt32BE(0), type = buf.toString("latin1", 4, 8);
      if (type === "moov") return true;
      if (type === "mdat") return false;
      if (len < 8) return null;
      pos += len;
    }
  } finally { fs.closeSync(fd); }
  return null;
}
function loudness(f) {
  const e = ffStderr(["-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const I = e.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  const TP = e.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  return { lufs: I != null ? Number(I) : null, true_peak: TP != null ? Number(TP) : null };
}

// Speech spans to keep: from word timings if given, else from ffmpeg silencedetect.
function speechSpans(f, dur) {
  const gap = Number(flag("--gap", 0.35)), pad = Number(flag("--pad", 0.08));
  let spans = [];
  if (flag("--words")) {
    const words = JSON.parse(fs.readFileSync(flag("--words"), "utf8"));
    for (const w of words) {
      const last = spans[spans.length - 1];
      if (last && w.s - last[1] <= gap) last[1] = w.e; else spans.push([w.s, w.e]);
    }
  } else {
    const e = ffStderr(["-i", f, "-af", `silencedetect=noise=${flag("--db", "-35")}dB:d=${gap}`, "-f", "null", "-"]);
    const starts = [...e.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, +m[1]));
    const ends = [...e.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
    let t = 0;
    starts.forEach((s, i) => { if (s > t) spans.push([t, s]); t = ends[i] ?? dur; });
    if (t < dur) spans.push([t, dur]);
  }
  return spans.map(([s, e]) => [Math.max(0, s - pad), Math.min(dur, e + pad)]).filter(([s, e]) => e - s > 0.05)
    .reduce((acc, sp) => { const l = acc[acc.length - 1]; if (l && sp[0] <= l[1]) l[1] = Math.max(l[1], sp[1]); else acc.push(sp); return acc; }, []);
}

if (cmd === "probe") {
  console.log(JSON.stringify({ ...probe(inp), ...loudness(inp) }, null, 2));
} else if (cmd === "trim") {
  if (!out) die("trim needs an output file");
  const from = Number(flag("--from", 0)), to = flag("--to");
  ff(["-i", inp, "-ss", String(from), ...(to ? ["-to", String(to)] : []), ...ENC, out]);
  console.log(`TRIM ${out} ${from}s-${to ?? "end"}`);
} else if (cmd === "reframe") {
  if (!out) die("reframe needs an output file");
  const mode = flag("--mode", "blur");
  const fit = "scale=1080:1920:force_original_aspect_ratio=decrease";
  const vf = mode === "crop" ? "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
    : mode === "pad" ? `${fit},pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1`
    : `split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,eq=brightness=-0.08[bg];[b]${fit}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`;
  const hasAudio = probe(inp).acodec;
  ff(["-i", inp, ...(mode === "blur" ? ["-filter_complex", `[0:v]${vf}[v]`, "-map", "[v]", ...(hasAudio ? ["-map", "0:a"] : [])] : ["-vf", vf]), ...ENC, out]);
  console.log(`REFRAME ${out} 1080x1920 (${mode})`);
} else if (cmd === "jumpcut") {
  if (!out) die("jumpcut needs an output file");
  const p = probe(inp);
  const spans = speechSpans(inp, p.duration);
  if (!spans.length) die("no speech found; nothing to keep");
  const keep = spans.reduce((a, [s, e]) => a + e - s, 0);
  // one filtergraph: trim each kept span, then concat (frame-accurate, audio stays in sync)
  const parts = spans.map(([s, e], i) => `[0:v]trim=${s.toFixed(3)}:${e.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` + (p.acodec ? `[0:a]atrim=${s.toFixed(3)}:${e.toFixed(3)},asetpts=PTS-STARTPTS[a${i}];` : "")).join("");
  const ins = spans.map((_, i) => `[v${i}]` + (p.acodec ? `[a${i}]` : "")).join("");
  const graph = `${parts}${ins}concat=n=${spans.length}:v=1:a=${p.acodec ? 1 : 0}[v]${p.acodec ? "[a]" : ""}`;
  const script = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "jc-")), "graph.txt");
  fs.writeFileSync(script, graph); // long graphs overflow the command line
  ff(["-i", inp, "-filter_complex_script", script, "-map", "[v]", ...(p.acodec ? ["-map", "[a]"] : []), ...ENC, out]);
  if (flag("--words") && flag("--words-out")) {
    // shift every word left by the silence removed before it
    const words = JSON.parse(fs.readFileSync(flag("--words"), "utf8"));
    const shift = (t) => { let cut = 0, prevEnd = 0; for (const [s, e] of spans) { if (t < s) return null; cut += s - prevEnd; prevEnd = e; if (t <= e) return t - cut; } return null; };
    const moved = words.map((w) => ({ w: w.w, s: shift(w.s), e: shift(w.e) })).filter((w) => w.s != null && w.e != null && w.e > w.s)
      .map((w) => ({ ...w, s: +w.s.toFixed(3), e: +w.e.toFixed(3) }));
    fs.writeFileSync(flag("--words-out"), JSON.stringify(moved));
    console.log(`WORDS ${moved.length} -> ${flag("--words-out")}`);
  }
  console.log(`JUMPCUT ${out} ${spans.length} spans, ${p.duration.toFixed(1)}s -> ${keep.toFixed(1)}s (cut ${(p.duration - keep).toFixed(1)}s)`);
} else if (cmd === "loudnorm") {
  if (!out) die("loudnorm needs an output file");
  const I = Number(flag("--lufs", -14));
  // two passes: measure, then correct linearly so the voice isn't pumped
  const m = ffStderr(["-i", inp, "-af", `loudnorm=I=${I}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"]);
  const j = JSON.parse(m.slice(m.lastIndexOf("{"), m.lastIndexOf("}") + 1));
  const af = `loudnorm=I=${I}:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  ff(["-i", inp, "-af", af, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out]);
  console.log(`LOUDNORM ${out} ${j.input_i} -> ${I} LUFS`);
} else if (cmd === "qc") {
  const p = { ...probe(inp), ...loudness(inp) };
  const checks = [
    [p.width === 1080 && p.height === 1920, `size ${p.width}x${p.height}`, "1080x1920 (node tools/edit.mjs reframe)"],
    [Math.abs(p.fps - 30) < 0.1, `fps ${p.fps}`, "30"],
    [p.vcodec === "h264" && p.pix_fmt === "yuv420p", `video ${p.vcodec}/${p.pix_fmt}`, "h264/yuv420p"],
    [p.acodec === "aac", `audio ${p.acodec ?? "none"}`, "aac (every app expects a sound track)"],
    [p.duration >= 3 && p.duration <= 180, `length ${p.duration}s`, "3-180 s"],
    [p.lufs == null || (p.lufs >= -17 && p.lufs <= -11), `loudness ${p.lufs} LUFS`, "-14 ±3 (node tools/edit.mjs loudnorm)"],
    [p.true_peak == null || p.true_peak <= -0.5, `true peak ${p.true_peak} dBFS`, "≤ -0.5"],
    [p.faststart === true, `faststart ${p.faststart}`, "moov first (-movflags +faststart)"],
  ];
  for (const [ok, got, want] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${got}${ok ? "" : `  (want ${want})`}`);
  const fails = checks.filter((c) => !c[0]).length;
  console.log(fails ? `QC FAILED ${fails}` : "QC OK");
  process.exit(fails ? 1 : 0);
} else die(`unknown command "${cmd}" (probe, trim, reframe, jumpcut, loudnorm, qc)`);
