#!/usr/bin/env node
// Turn a beat sheet (what is said + what is seen, beat by beat) into a render-ready spec.
// Beats are timed to the real voice when word timings exist, otherwise estimated from the text.
//   node tools/beats.mjs beats.json spec.json [--words words.json] [--wps 2.6]
//
// beats.json:
// {
//   "theme": {...}, "watermark": "@handle", "audio": "voice.mp3", "music": "bed.mp3",
//   "hook": { "text": "≤ 7 words on screen from frame 0", "highlight": "exact substring" },
//   "cta":  { "text": "Follow for part 2", "sub": "optional second line" },
//   "beats": [
//     { "say": "the exact words spoken in this beat",
//       "shot": { "type": "media", "src": "CLIP_1" },        // optional: a new shot starts with this beat
//       "overlay": { "type": "textover", "text": "..." } }   // optional: shown for the length of this beat
//   ]
// }
import fs from "node:fs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const [inp, out] = args.filter((a, i) => !a.startsWith("--") && !["--words", "--wps"].includes(args[i - 1]));
if (!inp || !out) { console.error("usage: beats.mjs beats.json spec.json [--words words.json] [--wps 2.6]"); process.exit(2); }

const b = JSON.parse(fs.readFileSync(inp, "utf8"));
const wps = Number(flag("--wps") || b.wps || 2.6);
const wordsFile = flag("--words") || (typeof b.words === "string" ? b.words : null);
const words = wordsFile ? JSON.parse(fs.readFileSync(wordsFile, "utf8")) : Array.isArray(b.words) ? b.words : null;
const beats = b.beats || [];
if (!beats.length) { console.error("beats.json has no beats"); process.exit(1); }

const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const tokens = (s) => String(s || "").split(/\s+/).map(norm).filter(Boolean);

// ---------- timing: [start, end] per beat ----------
let times = [];
if (words?.length) {
  // Walk the transcript in order; each beat starts at its first word (fuzzy: skips misheard words).
  const tw = words.map((w) => norm(w.w));
  let k = 0;
  for (const beat of beats) {
    const t = tokens(beat.say);
    // look a few words ahead for the beat's first word, then its second (the first may be misheard)
    const near = (w, from) => { for (let j = from; j < Math.min(tw.length, k + 6); j++) if (tw[j] === w) return j; return -1; };
    let start = near(t[0], k);
    if (start < 0 && t[1]) { const j = near(t[1], k + 1); if (j > 0) start = j - 1; }
    if (start < 0) start = k; // not found: assume it follows straight on
    const endIdx = Math.min(tw.length - 1, start + Math.max(0, t.length - 1));
    times.push([words[start]?.s ?? 0, words[endIdx]?.e ?? 0]);
    k = endIdx + 1;
  }
} else {
  let at = 0.2; // a breath before the first word
  for (const beat of beats) {
    const len = Math.max(0.8, tokens(beat.say).length / wps);
    times.push([at, at + len]);
    at += len + 0.25; // short pause between beats
  }
}
times[0][0] = 0; // the hook frame starts at 0
const end = +(times[times.length - 1][1] + 0.6).toFixed(2);
const duration = Number(b.duration || end);

// ---------- spec ----------
const spec = {
  duration,
  ...(b.theme && { theme: b.theme }),
  ...(b.audio && { audio: b.audio }),
  ...(b.music && { music: b.music, music_volume: b.music_volume ?? 0.12 }),
  ...(words && { words }),
  captions: b.captions || { enabled: !!words },
  shots: [],
  overlays: [],
  watermark: b.watermark,
};
beats.forEach((beat, i) => {
  const [s] = times[i];
  const next = i + 1 < beats.length ? times[i + 1][0] : duration;
  if (beat.shot) {
    const at = i === 0 ? 0 : +s.toFixed(2);
    const prev = spec.shots[spec.shots.length - 1];
    if (prev && at <= prev.at) console.error(`beat ${i + 1}: starts at ${at}s, not after the previous shot; merged into it`);
    else spec.shots.push({ ...beat.shot, at });
  }
  if (beat.overlay) spec.overlays.push({ ...beat.overlay, at: +(i === 0 ? 0 : s).toFixed(2), end: +next.toFixed(2) });
});
// Story series extras: a character speaking (speech bubble), cameo lists, sound cues, the title card and the vote card.
beats.forEach((beat, i) => {
  const [s0] = times[i];
  const next = i + 1 < beats.length ? times[i + 1][0] : duration;
  const at = +(i === 0 ? 0 : s0).toFixed(2);
  if (beat.speaker && beat.speaker !== "narrator") {
    const who = (b.cast_names || {})[beat.speaker] || beat.speaker;
    spec.overlays.push({ at, end: +next.toFixed(2), type: "bubble", text: beat.say, sub: who, x: beat.bubble?.x ?? 540, y: beat.bubble?.y ?? 380, tail: beat.bubble?.tail ?? 0.5, color: beat.bubble?.color || "accent" });
  }
  if (beat.cameo) spec.overlays.push({ at, end: +next.toFixed(2), type: "cameo", text: beat.cameo.text, handles: beat.cameo.handles });
  for (const snd of [].concat(beat.sound || [])) (spec.sounds = spec.sounds || []).push({ src: snd.src, at: +(at + (snd.offset || 0)).toFixed(2), volume: snd.volume ?? 0.8 });
});
if (b.cast) spec.cast = b.cast;
if (b.titlecard?.text) spec.overlays.unshift({ at: 0, end: +Math.min(times[0][1] + 0.5, 3.8).toFixed(2), type: "titlecard", text: b.titlecard.text, sub: b.titlecard.sub });
if (b.choice?.options) {
  const hold = b.choice.hold ?? 3.5; // the card stays up after the last word so people can read and comment
  spec.duration = +(Math.max(spec.duration, times[times.length - 1][1] + hold)).toFixed(2);
  const lastShot = spec.shots[spec.shots.length - 1];
  spec.overlays.push({ at: +times[times.length - 1][0].toFixed(2), end: spec.duration, type: "choice", text: b.choice.text, options: b.choice.options, sub: b.choice.sub || (b.choice.options.length > 2 ? "Comment A, B or C" : "Comment A or B") });
  if (lastShot && lastShot.at >= spec.duration) console.error("the last shot starts after the end");
}
if (!spec.shots.length || spec.shots[0].at !== 0) { console.error("the first beat must have a shot (it is the hook frame)"); process.exit(1); }
if (b.hook?.text) spec.overlays.unshift({ at: 0, end: +Math.min(times[0][1] + 0.3, 3).toFixed(2), type: "headline", text: b.hook.text, ...(b.hook.highlight && { highlight: b.hook.highlight }), y: b.hook.y ?? 220 });
if (b.cta?.text) spec.overlays.push({ at: +Math.max(0, duration - 2.5).toFixed(2), end: duration, type: "lowerthird", text: b.cta.text, ...(b.cta.sub && { sub: b.cta.sub }) });
if (!spec.overlays.length) delete spec.overlays;
if (!spec.watermark) delete spec.watermark;

fs.writeFileSync(out, JSON.stringify(spec, null, 2));
const pad = (x) => x.toFixed(2).padStart(6);
console.log(`BEATS ${beats.length} -> ${out} (${duration}s, timed ${words ? "from words" : `at ${wps} words/s (estimate)`})`);
beats.forEach((beat, i) => console.log(`${pad(times[i][0])} ${pad(times[i][1])}  ${beat.shot ? beat.shot.type.padEnd(8) : "  ·     "} ${String(beat.say).slice(0, 60)}`));
