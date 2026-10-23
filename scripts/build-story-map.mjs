#!/usr/bin/env node
// Build the readable, playable story-map page for a series.
//   node scripts/build-story-map.mjs <slug>   →  channels/<slug>/story-map.html (publish it as an Artifact)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) { console.error("usage: build-story-map.mjs <slug>"); process.exit(2); }
const map = fs.readFileSync(path.join(ROOT, "influencers", slug, "story-map.json"), "utf8");
JSON.parse(map);
const tpl = fs.readFileSync(path.join(ROOT, "tracker", "story-map.html"), "utf8");
const out = path.join(ROOT, "influencers", slug, "story-map.html");
fs.writeFileSync(out, tpl.replace("/*MAP_JSON*/", () => map.replace(/<\//g, "<\\/")));
console.log(`MAP PAGE ${path.relative(ROOT, out)}`);
