#!/usr/bin/env node
// Check a branching story map and simulate every possible path through it.
//   node scripts/story-map-check.mjs channels/<slug>/story-map.json [--paths] [--max 14]
// Verifies: every option points at a real node or ending, labels fit the vote card, every node is
// reachable, every path reaches an ending within --max parts (applying stakes, flags and thresholds
// exactly as the Showrunner does), and reports which endings are reachable and how long paths run.
import fs from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const MAX = Number(args[args.indexOf("--max") + 1]) || 14;
if (!file) { console.error("usage: story-map-check.mjs story-map.json [--paths] [--max 14]"); process.exit(2); }
const map = JSON.parse(fs.readFileSync(file, "utf8"));
const nodes = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
const endings = Object.fromEntries(map.endings.map((e) => [e.id, e]));
const errs = [], warns = [];

// ---------- static checks ----------
for (const n of map.nodes) {
  const c = n.choice;
  if (!c || !c.options) { errs.push(`${n.id}: no choice`); continue; }
  if (c.text.length > 70) errs.push(`${n.id}: choice text ${c.text.length} > 70 chars`);
  if (c.options.length < 2 || c.options.length > 3) errs.push(`${n.id}: needs 2-3 options`);
  for (const o of c.options) {
    if (!nodes[o.to] && !endings[o.to]) errs.push(`${n.id}.${o.key}: unknown target ${o.to}`);
    if (o.label.length > 40) errs.push(`${n.id}.${o.key}: label ${o.label.length} > 40 chars`);
    for (const f of o.flags || []) if (!map.flags?.[f]) errs.push(`${n.id}.${o.key}: unknown flag ${f}`);
  }
  if (!n.summary || !(n.scenes || []).length) errs.push(`${n.id}: needs summary and scenes`);
}
for (const k of ["cleared", "caught_default", "cleared_fallback"]) { const v = (map.rules || {})[k]; if (v && !nodes[v] && !endings[v]) errs.push(`rules.${k}: unknown id ${v}`); }
for (const v of [...Object.values(map.rules?.caught_if_flag || {}), ...Object.values(map.rules?.caught_if_node_prefix || {})]) if (!endings[v]) errs.push(`rules: unknown ending ${v}`);
for (const e of map.endings) {
  if (!["got_away", "caught"].includes(e.type)) errs.push(`${e.id}: type must be got_away or caught`);
  if (!e.final_line) errs.push(`${e.id}: needs a final_line`);
}

// ---------- simulation (same rules the Showrunner follows) ----------
const st = map.stakes;
const clamp = (v) => Math.max(0, Math.min(100, v));
const PRESSURE = map.pressure?.suspicion_per_part || 0;
const MAXP = map.max_parts || Infinity;
const R = { cleared: "E_CLEARED", cleared_min_proof: 60, cleared_fallback: null, caught_default: "C_FRAMED", caught_if_flag: {}, caught_if_node_prefix: {}, cleared_fail_caught_at_suspicion: 70, ...(map.rules || {}) };
const caughtFor = (nodeId, flags) => {
  for (const [f, e] of Object.entries(R.caught_if_flag)) if (flags.has(f)) return e;
  for (const [pre, e] of Object.entries(R.caught_if_node_prefix)) if (nodeId.startsWith(pre)) return e;
  return R.caught_default;
};
function step(nodeId, opt, s, part) {
  const next = { suspicion: clamp(s.suspicion + PRESSURE + (opt.stakes?.suspicion || 0)), proof: clamp(s.proof + (opt.stakes?.proof || 0)), flags: new Set([...s.flags, ...(opt.flags || [])]) };
  let to = opt.to;
  if (next.suspicion >= st.suspicion.caught_at) to = caughtFor(nodeId, next.flags);
  else if (next.proof >= st.proof.cleared_at && !endings[to]) to = R.cleared;
  if (to === R.cleared && next.proof < R.cleared_min_proof) to = next.suspicion >= R.cleared_fail_caught_at_suspicion || !R.cleared_fallback ? caughtFor(nodeId, next.flags) : R.cleared_fallback; // the cleared ending needs real proof
  if (!endings[to] && part + 1 >= MAXP) to = next.proof >= R.cleared_min_proof ? R.cleared : caughtFor(nodeId, next.flags); // the season has to end
  return { to, s: next };
}
const results = {}; const lengths = []; let paths = 0, overlong = 0; const reached = new Set(["S1"]); const samples = {};
function walk(id, s, depth, trail) {
  if (endings[id]) {
    paths++; lengths.push(depth); results[id] = (results[id] || 0) + 1;
    if (!samples[id] || trail.length < samples[id].length) samples[id] = trail;
    return;
  }
  if (depth >= MAX) { overlong++; if (overlong <= 3) warns.push(`path longer than ${MAX} parts: ${trail.join(" > ")}`); return; }
  reached.add(id);
  for (const o of nodes[id].choice.options) {
    const r = step(id, o, s, depth + 1);
    walk(r.to, r.s, depth + 1, [...trail, `${id}:${o.key}`]);
  }
}
if (!errs.length) walk(map.start, { suspicion: st.suspicion.start, proof: st.proof.start, flags: new Set() }, 0, []);
for (const n of map.nodes) if (!reached.has(n.id)) warns.push(`${n.id} is never reached`);
for (const e of map.endings) if (!results[e.id]) warns.push(`ending ${e.id} is never reached`);

// ---------- report ----------
if (errs.length) { console.error("MAP INVALID:\n- " + errs.join("\n- ")); process.exit(1); }
const sum = (t) => Object.entries(results).filter(([k]) => endings[k].type === t).reduce((a, [, v]) => a + v, 0);
lengths.sort((a, b) => a - b);
console.log(`MAP OK  ${map.nodes.length} scenes · ${map.endings.length} endings · ${paths.toLocaleString()} possible playthroughs`);
console.log(`parts per playthrough: shortest ${lengths[0]}, median ${lengths[Math.floor(lengths.length / 2)]}, longest ${lengths[lengths.length - 1]}`);
console.log(`got away ${Math.round((sum("got_away") / paths) * 100)}% · caught ${Math.round((sum("caught") / paths) * 100)}% of playthroughs`);
for (const e of map.endings) console.log(`  ${e.type === "caught" ? "CAUGHT  " : "GOT AWAY"} ${e.id.padEnd(11)} ${String(results[e.id] || 0).padStart(6)}  e.g. ${(samples[e.id] || []).join(" > ")}`);
if (warns.length) console.log("WARN:\n- " + warns.join("\n- "));
if (overlong) process.exit(1);
