#!/usr/bin/env node
// Scaffold a new channel: channels/<slug>/{settings.json, character.md}.
// Faceless by default (nobody on camera); FORMAT "character" adds an AI person on camera.
//
//   node scripts/new-channel.mjs                 # asks the questions in the terminal
//   node scripts/new-channel.mjs --answers a.json  # non-interactive (Claude uses this in /new-channel)
//
// The best experience is inside Claude (`claude` then `/new-channel`): it researches the niche,
// sets the look and voice (plus the character sheet for on-camera channels), publishes the tracker and schedules the agents.
// This script is the offline fallback, and the file layout Claude writes into.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TPL = path.join(ROOT, "channels", "_template");

// [key, question, example, on-camera only?]
const QUESTIONS = [
  ["FORMAT", "Format: faceless (nobody on camera), character (an AI person on camera) or series (an interactive story viewers vote on)", "faceless"],
  ["NAME", "Channel name (or the character's name)", "Quiet Money"],
  ["HANDLE", "Handle you want on the apps", "@quietmoneyshorts"],
  ["NICHE", "Niche — what does it post about?", "money mistakes explained in 30 seconds"],
  ["AGE", "Character's age", "34", true],
  ["CHARACTER_SUMMARY", "The narrator (or character), in one line", "a calm, dry narrator who has seen every money mistake"],
  ["BACKSTORY", "Backstory or angle (fictional, one or two lines)", "spent ten years watching friends repeat the same five money mistakes"],
  ["AUDIENCE", "Who is it for?", "20-somethings earning their first real salary"],
  ["WRITING_VOICE", "How does it talk?", "short, dry sentences; one number per video; never preachy"],
  ["VOICE_DELIVERY", "What should the voice sound like?", "low, calm, unhurried; neutral accent"],
  ["IDENTITY_ANCHORS", "Look anchors (face, hair, eyes, signature item) — leave blank to design with Claude", "", true],
  ["MAIN_LOCATION", "Where do we usually see them?", "a beige open-plan office desk by a window", true],
  ["OUTFIT_1", "Signature outfit", "navy blazer over a grey tee, lanyard", true],
  ["PILLAR_1", "Content pillar 1", "Money leaks"],
  ["PILLAR_2", "Content pillar 2", "Myth vs maths"],
  ["PILLAR_3", "Content pillar 3", "Stories: how it went wrong"],
  ["ACCENT", "Brand accent colour (hex)", "#F2B544"],
  ["TIMEZONE", "Your timezone (IANA)", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"],
];

const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "channel";

async function ask() {
  // Line queue instead of rl.question so piped answers (printf … | node new-channel.mjs) work too.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
  const lines = [], waiting = [];
  let closed = false;
  rl.on("line", (l) => (waiting.length ? waiting.shift()(l) : lines.push(l)));
  rl.on("close", () => { closed = true; while (waiting.length) waiting.shift()(""); });
  const next = () => (lines.length ? Promise.resolve(lines.shift()) : closed ? Promise.resolve("") : new Promise((r) => waiting.push(r)));
  console.log("\nLet's set up your first channel. Press Enter to accept the example in [brackets].\n");
  const a = {};
  for (const [k, q, ex, onCamera] of QUESTIONS) {
    if (onCamera && a.FORMAT !== "character") continue; // faceless channels have no face, outfit or set
    process.stdout.write(`${q}${ex ? ` [${ex}]` : ""}: `);
    const v = (await next()).trim();
    if (!process.stdin.isTTY) process.stdout.write((v || ex) + "\n");
    a[k] = v || ex;
  }
  rl.close();
  return a;
}

const ai = process.argv.indexOf("--answers");
const answers = ai > 0 ? JSON.parse(fs.readFileSync(process.argv[ai + 1], "utf8")) : await ask();
answers.FORMAT = { c: "character", s: "series" }[String(answers.FORMAT || "faceless").toLowerCase()[0]] || "faceless";
for (const [k, , ex, onCamera] of QUESTIONS) if (answers[k] == null) answers[k] = onCamera && answers.FORMAT !== "character" ? "" : ex;
answers.HANDLE = answers.HANDLE.startsWith("@") ? answers.HANDLE : "@" + answers.HANDLE;
answers.SHORT ??= answers.NAME.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3);
answers.TAGLINE ??= `${answers.NICHE}`;
answers.BRAND_TAG ??= "#" + answers.HANDLE.replace(/^@/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
answers.REPO_URL ??= process.env.REPO_URL || "";
answers.IDENTITY_ANCHORS ||= answers.FORMAT === "character" ? "(to be designed with the charsheet-soul skill)" : "(faceless channel: nobody on camera)";
for (const n of [1, 2, 3]) answers[`PILLAR_${n}_KEY`] ??= slugify(answers[`PILLAR_${n}`] || `pillar-${n}`);

const slug = answers.SLUG || slugify(answers.NAME);
const dir = path.join(ROOT, "channels", slug);
if (fs.existsSync(path.join(dir, "settings.json")) && !process.argv.includes("--force")) {
  console.error(`channels/${slug} already exists (use --force to overwrite)`);
  process.exit(1);
}
fs.mkdirSync(path.join(dir, "agents"), { recursive: true });

const fill = (text, json) =>
  text.replace(/\{\{([A-Z0-9_]+)(?::[^}]*)?\}\}/g, (m, k) => {
    if (answers[k] == null) return m;
    return json ? JSON.stringify(String(answers[k])).slice(1, -1) : String(answers[k]);
  });

const settings = fill(fs.readFileSync(path.join(TPL, "settings.json"), "utf8"), true);
JSON.parse(settings); // must still be valid JSON
fs.writeFileSync(path.join(dir, "settings.json"), settings);
fs.writeFileSync(path.join(dir, "character.md"), fill(fs.readFileSync(path.join(TPL, "character.md"), "utf8"), false));
fs.writeFileSync(path.join(dir, "answers.json"), JSON.stringify(answers, null, 2));

console.log(`\nCreated channels/${slug}/ (settings.json, character.md)`);
console.log(`Next: open Claude in this folder and run /new-channel ${slug}`);
console.log(`      — it sets the look and voice${answers.FORMAT === "character" ? " and designs the character sheet" : ""}, publishes the tracker and schedules the agents.`);
