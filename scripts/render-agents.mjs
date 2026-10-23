#!/usr/bin/env node
// Fill the agent templates for one channel.
//   node scripts/render-agents.mjs <slug> --tracker <artifact url> [--repo <git url>]
// Writes channels/<slug>/agents/*.md and channels/<slug>/agents/schedule.json
// (prompt + cron + timezone per agent), ready for Claude to create the scheduled tasks.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const slug = args[0];
if (!slug || slug.startsWith("--")) { console.error("usage: render-agents.mjs <slug> --tracker <url> [--repo <url>]"); process.exit(2); }

const dir = path.join(ROOT, "channels", slug);
const settings = JSON.parse(fs.readFileSync(path.join(dir, "settings.json"), "utf8"));
const tracker = flag("--tracker") || settings.tracker_url;
let repo = flag("--repo") || settings.remotion?.repo_url;
if (!repo) { try { repo = execSync("git remote get-url origin", { cwd: ROOT }).toString().trim(); } catch {} }
if (!tracker) { console.error("Need --tracker <artifact url> (publish tracker/tracker.html first)"); process.exit(1); }
if (!repo) { console.error("Need --repo <public git url> (the producer clones it in the Higgsfield sandbox)"); process.exit(1); }
repo = repo.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");

const T = path.join(ROOT, "agents", "templates");
const shared = fs.readFileSync(path.join(T, "_shared.md"), "utf8");
if (settings.format === "series") settings.format = "story"; // older name
const isStory = settings.format === "story";
const storyRules = isStory ? fs.readFileSync(path.join(T, "_story.md"), "utf8").trim() : "";
const vars = {
  NAME: settings.name, HANDLE: settings.handle, SHORT: settings.short || settings.name.slice(0, 3).toUpperCase(),
  PLATFORMS: (settings.platforms || []).join(", "), TRACKER_URL: tracker, REPO_URL: repo, TIMEZONE: settings.timezone || "UTC",
};
const fill = (s) => s.replace(/\n*\{\{STORY_RULES\}\}/g, storyRules ? "\n\n" + storyRules : "").replace(/\{\{SHARED\}\}/g, shared.trim()).replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => vars[k] ?? m);

const sched = JSON.parse(fs.readFileSync(path.join(ROOT, "agents", "schedule.json"), "utf8"));
const out = [];
fs.mkdirSync(path.join(dir, "agents"), { recursive: true });
for (const a of sched.agents) {
  const fmt = settings.format || "character";
  if (a.only_formats && !a.only_formats.includes(fmt)) continue;
  if (a.skip_formats && a.skip_formats.includes(fmt)) continue;
  const prompt = fill(fs.readFileSync(path.join(T, a.file), "utf8"));
  const left = prompt.match(/\{\{[A-Z_]+\}\}/g);
  if (left) { console.error(`${a.file}: unfilled ${[...new Set(left)].join(", ")}`); process.exit(1); }
  fs.writeFileSync(path.join(dir, "agents", a.file), prompt);
  out.push({ name: fill(a.name), cron_expression: `CRON_TZ=${vars.TIMEZONE} ${a.cron}`, prompt_file: `channels/${slug}/agents/${a.file}`, spends_credits: a.spends_credits, chars: prompt.length });
}
fs.writeFileSync(path.join(dir, "agents", "schedule.json"), JSON.stringify({ channel: slug, tracker_url: tracker, repo_url: repo, tasks: out }, null, 2));
settings.tracker_url = tracker;
settings.remotion = { ...(settings.remotion || {}), repo_url: repo };
fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(settings, null, 2));
for (const o of out) console.log(`AGENT ${o.name.padEnd(42)} ${o.cron_expression}  (${o.chars} chars)`);
console.log(`\nWrote channels/${slug}/agents/ — ask Claude to "schedule the agents for ${slug}".`);
