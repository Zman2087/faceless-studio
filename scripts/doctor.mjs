#!/usr/bin/env node
// Checks that everything the kit needs is in place.  node scripts/doctor.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.argv.includes("--quiet");
let bad = 0;
const row = (okay, label, fix) => {
  if (!okay) bad++;
  if (!quiet || !okay) console.log(`${okay ? "✓" : "✗"} ${label}${!okay && fix ? `\n    fix: ${fix}` : ""}`);
};
const has = (cmd) => { try { execSync(`${cmd}`, { stdio: "ignore" }); return true; } catch { return false; } };

row(Number(process.versions.node.split(".")[0]) >= 20, `Node ${process.versions.node} (need 20+)`, "install Node 20+ from nodejs.org");
row(has("ffmpeg -version"), "ffmpeg", "brew install ffmpeg  /  sudo apt-get install ffmpeg");
row(has("git --version"), "git", "install git");
row(fs.existsSync(path.join(ROOT, "remotion/node_modules/remotion")), "Remotion engine installed", "cd remotion && npm ci");
const skills = ["charsheet-soul", "ugc-character-video", "content-engine", "digital-product", "new-channel", "make-post", "video-script", "animated-video", "video-edit", "asset-library"];
for (const s of skills) row(fs.existsSync(path.join(ROOT, ".claude/skills", s, "SKILL.md")), `skill ${s}`, "git checkout .claude/skills");
const vendor = ["remotion-best-practices", "remotion-captions"]; // Remotion's own skills, downloaded by setup.sh
row(vendor.every((s) => fs.existsSync(path.join(ROOT, ".claude/skills", s, "SKILL.md"))), "Remotion skills", "./setup.sh --no-test --no-onboard");
let mcp = {};
try { mcp = JSON.parse(fs.readFileSync(path.join(ROOT, ".mcp.json"), "utf8")).mcpServers || {}; } catch {}
row(!!mcp.higgsfield, ".mcp.json has higgsfield", "restore .mcp.json from git");
row(has("claude --version"), "Claude Code CLI (optional if you use the desktop app)", "npm install -g @anthropic-ai/claude-code");
const inf = fs.existsSync(path.join(ROOT, "channels")) ? fs.readdirSync(path.join(ROOT, "channels")).filter((d) => !d.startsWith("_") && fs.existsSync(path.join(ROOT, "channels", d, "settings.json"))) : [];
if (!quiet) console.log(inf.length ? `• channels: ${inf.join(", ")}` : "• no channels yet — run /new-channel in Claude");
for (const d of inf) {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, "channels", d, "settings.json"), "utf8"));
  if (!quiet) {
    console.log(`  ${d}: ${s.format || "faceless"}${s.format === "character" ? ` · sheet ${s.character?.sheet?.job_id || s.character?.sheet?.media_url ? "✓" : "–"}` : ""} · voice ${s.voice?.voice_id ? "✓" : "–"} · tracker ${s.tracker_url && !/PENDING/.test(s.tracker_url) ? "✓" : "–"} · agents ${fs.existsSync(path.join(ROOT, "channels", d, "agents/schedule.json")) ? "✓" : "–"}`);
  }
}
if (bad) { console.log(`\n${bad} thing(s) to fix.`); process.exit(1); } else if (!quiet) console.log("\nAll good.");
