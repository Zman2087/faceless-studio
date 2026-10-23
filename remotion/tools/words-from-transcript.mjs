#!/usr/bin/env node
// Turn a transcription into words.json ([{w, s, e}]) for burned-in captions and cue timing.
// Accepts ElevenLabs Scribe output ({words:[{text,start,end,type}]}), Whisper/faster-whisper
// ({segments:[{words:[{word,start,end}]}]}) or an already-flat [{w,s,e}] array.
//   node tools/words-from-transcript.mjs transcript.json words.json [--offset 0.0]
import fs from "node:fs";
const [inp, out] = process.argv.slice(2);
const oi = process.argv.indexOf("--offset");
const off = oi > 0 ? Number(process.argv[oi + 1]) : 0;
if (!inp || !out) { console.error("usage: words-from-transcript.mjs in.json out.json [--offset s]"); process.exit(2); }
const j = JSON.parse(fs.readFileSync(inp, "utf8"));
let raw = Array.isArray(j) ? j : j.words || (j.segments || []).flatMap((s) => s.words || []);
const words = raw
  .filter((x) => (x.type ?? "word") === "word")
  .map((x) => ({ w: String(x.w ?? x.text ?? x.word ?? "").trim(), s: +(x.s ?? x.start) + off, e: +(x.e ?? x.end) + off }))
  .filter((x) => x.w && x.e > x.s && !/^\[.*\]$/.test(x.w)) // drop [pause]-style stage directions
  .map((x) => ({ ...x, s: +x.s.toFixed(3), e: +x.e.toFixed(3) }));
fs.writeFileSync(out, JSON.stringify(words));
console.log(`WORDS ${words.length} -> ${out} (${words.length ? words[words.length - 1].e.toFixed(1) : 0} s)`);
