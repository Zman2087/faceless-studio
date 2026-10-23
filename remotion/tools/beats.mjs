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

// Number words and digits compare equal: the script says "forty", the transcript writes "40".
const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const norm = (w) => {
  const x = String(w).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  if (UNITS.includes(x)) return String(UNITS.indexOf(x));
  if (x === "hundred") return "100";
  const m = x.match(/^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(one|two|three|four|five|six|seven|eight|nine)?$/);
  return m ? String(TENS[m[1]] + (m[2] ? UNITS.indexOf(m[2]) : 0)) : x;
};
const tokens = (s) => String(s || "").split(/\s+/).map(norm).filter(Boolean);

// ---------- timing: [start, end] per beat ----------
let times = [];
if (words?.length) {
  // Walk the transcript in order; each beat starts at its first word and ends where the next beat starts
  // (word counts differ between script and transcript: "forty percent" vs "40%").
  const tw = words.map((w) => norm(w.w));
  const starts = [];
  let k = 0;
  for (const beat of beats) {
    const t = tokens(beat.say);
    const hi = Math.min(tw.length, k + t.length + 8);
    // the beat's first word, else its second (the first may be misheard), else straight after the last beat
    const find = (w, from) => { for (let j = from; j < hi; j++) if (tw[j] === w) return j; return -1; };
    let start = find(t[0], k);
    if (start < 0 && t[1]) { const j = find(t[1], k + 1); if (j > 0) start = j - 1; }
    if (start < 0) start = k;
    start = Math.min(start, tw.length - 1);
    starts.push(start);
    k = start + Math.max(1, Math.floor(t.length * 0.6)); // the next beat can't start inside the first part of this one
  }
  times = starts.map((s, i) => [words[s].s, words[i + 1 < starts.length ? Math.max(s, starts[i + 1] - 1) : words.length - 1].e]);
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
if (!spec.shots.length || spec.shots[0].at !== 0) { console.error("the first beat must have a shot (it is the hook frame)"); process.exit(1); }
if (b.hook?.text) spec.overlays.unshift({ at: 0, end: +Math.min(times[0][1] + 0.3, 3).toFixed(2), type: "headline", text: b.hook.text, ...(b.hook.highlight && { highlight: b.hook.highlight }), y: b.hook.y ?? 220 });
if (b.cta?.text) spec.overlays.push({ at: +Math.max(0, duration - 2.5).toFixed(2), end: duration, type: "lowerthird", text: b.cta.text, ...(b.cta.sub && { sub: b.cta.sub }) });
if (!spec.overlays.length) delete spec.overlays;
if (!spec.watermark) delete spec.watermark;

fs.writeFileSync(out, JSON.stringify(spec, null, 2));
const pad = (x) => x.toFixed(2).padStart(6);
console.log(`BEATS ${beats.length} -> ${out} (${duration}s, timed ${words ? "from words" : `at ${wps} words/s (estimate)`})`);
beats.forEach((beat, i) => console.log(`${pad(times[i][0])} ${pad(times[i][1])}  ${beat.shot ? beat.shot.type.padEnd(8) : "  ·     "} ${String(beat.say).slice(0, 60)}`));
