#!/usr/bin/env node
// Refresh the website's live state (state.json) from the tracker.
//   node scripts/site-state.mjs <tracker-export-dir> <site-dir>
// <tracker-export-dir> is what ArtifactData list/get with out_dir writes: settings/channel.json, posts/*.json, cameos/*.json.
// Shows only what viewers may see: the current vote (labels and live shares), past parts and what won,
// the next drop, and the case board of featured / scheduled handles. Never meters, maps or endings.
import fs from "node:fs";
import path from "node:path";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: site-state.mjs <tracker-export-dir> <site-dir>"); process.exit(2); }
const read = (p) => { try { const j = JSON.parse(fs.readFileSync(p, "utf8")); return j.data ?? j; } catch { return null; } };
const all = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => ({ id: f.replace(/\.json$/, ""), ...read(path.join(d, f)) })) : []);
const settings = read(path.join(src, "settings", "channel.json")) || {};
const posts = all(path.join(src, "posts")).filter((p) => p.choice && p.kind !== "side");
const cameos = all(path.join(src, "cameos"));

const posted = posts.filter((p) => p.status === "posted").sort((a, b) => (a.part || a.number) - (b.part || b.number));
const urlOf = (p) => p.post_urls?.instagram || p.post_urls?.tiktok || p.post_urls?.youtube || "";
const parts = posted.map((p) => ({
  part: p.part || p.number,
  title: (p.title || "").replace(/^.*?·\s*/, ""),
  url: urlOf(p),
  result: p.vote?.closed_at ? `${p.vote.winner_label || p.vote.winner} · ${p.vote.pct?.[p.vote.winner] ?? ""}%` : null,
}));
const open = [...posted].reverse().find((p) => !p.vote?.closed_at);
const vote = open && {
  part: open.part || open.number, open: true, question: open.choice.text,
  options: open.choice.options.map((o) => ({ key: o.key, label: o.label, votes: open.vote?.counts?.[o.key] ?? 0 })),
  how: `Comment ${open.choice.options.map((o) => o.key).join(", ").replace(/, ([^,]*)$/, " or $1")} on Part ${open.part || open.number}, or vote in the story poll. Votes close ${settings.story?.vote?.closes_text || "before the next part"}.`,
  naming: open.naming ? `And comment a name for the ${open.naming.target}.` : "",
};
const ready = posts.filter((p) => ["ready", "produced", "producing", "approved"].includes(p.status)).sort((a, b) => (a.part || a.number) - (b.part || b.number))[0];
const board = cameos.filter((c) => ["featured", "scheduled"].includes(c.status)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  .map((c) => ({ handle: c.handle, where: c.status === "featured" ? (c.placement || "Featured") : "Coming up" }));
const state = {
  updated_at: new Date().toISOString(),
  vote, parts, board,
  next: settings.story?.next_drop ? { title: ready ? `Part ${ready.part || ready.number}` : "Next part", at: settings.story.next_drop } : null,
};
fs.mkdirSync(dst, { recursive: true });
fs.writeFileSync(path.join(dst, "state.json"), JSON.stringify(state, null, 2));
console.log(`STATE ${path.join(dst, "state.json")} · ${parts.length} parts · vote ${vote ? "open (Part " + vote.part + ")" : "closed"} · ${board.length} on the board`);
