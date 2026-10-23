#!/usr/bin/env node
// Compare the route the audience voted for with the best possible route, for the end-of-season
// "Route Reveal" episode.
//
//   node scripts/story-route-compare.mjs story-map.json --route "S1:A,R1:A,D1:A,D2:C,DEAL1:A"
//   node scripts/story-route-compare.mjs story-map.json --canon canon.json      # settings.story.canon from the tracker
//   … --pct "S1:A=58,R1:A=64"   (optional: the winning vote shares, for "so close" moments)
//   … --spec reveal.json        (also write a Remotion spec for the reveal video)
//
// "Best" = the highest-ranked ending in map.ending_rank, then the fewest parts, then the lowest suspicion,
// using exactly the Showrunner's rules (scripts/lib/story-sim.mjs).
import fs from "node:fs";
import { makeSim } from "./lib/story-sim.mjs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const file = args[0];
if (!file || file.startsWith("--")) { console.error('usage: story-route-compare.mjs story-map.json --route "S1:A,R1:B,…" | --canon canon.json [--pct "S1:A=58"] [--spec out.json] [--json]'); process.exit(2); }
const map = JSON.parse(fs.readFileSync(file, "utf8"));
const sim = makeSim(map);
const { nodes, endings } = sim;

// ---------- the audience's route ----------
let route = [];
const pct = {};
if (flag("--canon")) {
  const canon = JSON.parse(fs.readFileSync(flag("--canon"), "utf8"));
  for (const c of canon) {
    if (!c.node || !c.key) continue; // the Showrunner records node + key for every closed vote
    route.push({ node: c.node, key: c.key });
    if (c.pct != null) pct[`${c.node}:${c.key}`] = Number(c.pct);
  }
} else if (flag("--route")) {
  route = flag("--route").split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [node, key] = x.split(":"); return { node, key }; });
}
for (const x of (flag("--pct") || "").split(",").filter(Boolean)) { const [k, v] = x.split("="); pct[k.trim()] = Number(v); }
if (!route.length) { console.error("No route given (use --route or --canon)"); process.exit(2); }

// ---------- walk it, comparing every vote with the best option at that moment ----------
const label = (id, key) => nodes[id]?.choice.options.find((o) => o.key === key)?.label || key;
const endName = (id) => `${endings[id]?.type === "caught" ? "caught" : "got away"}: ${endings[id]?.title || id}`;
let id = map.start, s = sim.startState(), part = 1;
const steps = [];
for (const r of route) {
  if (endings[id]) break;
  if (r.node !== id) { console.error(`Route goes to ${r.node} but the rules put Part ${part} at ${id}. Check the route.`); process.exit(1); }
  const opt = nodes[id].choice.options.find((o) => o.key === r.key);
  if (!opt) { console.error(`${id} has no option ${r.key}`); process.exit(1); }
  const bestHere = sim.bestFrom(id, s, part); // best possible from this moment
  const afterVote = sim.step(id, opt, s, part);
  const bestAfter = sim.bestFrom(afterVote.to, afterVote.s, part + 1); // best still possible after their vote
  const lost = sim.rank(bestAfter.ending) > sim.rank(bestHere.ending);
  steps.push({
    part, node: id, title: nodes[id].title, question: nodes[id].choice.text,
    chose: { key: r.key, label: opt.label, pct: pct[`${id}:${r.key}`] ?? null },
    best: { key: bestHere.path[0].key, label: label(id, bestHere.path[0].key) },
    matched_best: bestHere.path[0].key === r.key,
    best_ending_before: bestHere.ending, best_ending_after: bestAfter.ending, lost_ground: lost,
    stakes_after: { suspicion: afterVote.s.suspicion, proof: afterVote.s.proof },
  });
  s = afterVote.s; id = afterVote.to; part++;
}
if (!endings[id]) console.error(`Note: the route stops at ${id} (Part ${part}); comparing the season so far.`);

const optimal = sim.bestFrom(map.start, sim.startState(), 1);
const turning = steps.find((x) => x.lost_ground) || null;
const noReturn = steps.find((x) => x.best_ending_after !== sim.rankList[0]) || null;
const closeCalls = steps.filter((x) => !x.matched_best && x.chose.pct != null && x.chose.pct < 60);
const result = {
  audience: { ending: endings[id] ? id : null, ending_title: endings[id]?.title || null, ending_type: endings[id]?.type || null, parts: steps.length + (endings[id] ? 1 : 0), steps },
  optimal: { ending: optimal.ending, ending_title: endings[optimal.ending].title, parts: optimal.parts + 1, steps: optimal.path.map((p, i) => ({ part: i + 1, node: p.node, title: nodes[p.node].title, key: p.key, label: label(p.node, p.key) })) },
  same_ending: endings[id] && id === optimal.ending,
  matched_votes: steps.filter((x) => x.matched_best).length,
  turning_point: turning && { part: turning.part, title: turning.title, chose: turning.chose, best: turning.best, from: endName(turning.best_ending_before), to: endName(turning.best_ending_after) },
  point_of_no_return: noReturn && { part: noReturn.part, title: noReturn.title, chose: noReturn.chose },
  close_calls: closeCalls.map((x) => ({ part: x.part, title: x.title, chose: x.chose, best: x.best })),
};

if (has("--json")) { console.log(JSON.stringify(result, null, 2)); }
else {
  console.log(`AUDIENCE  ${result.audience.parts} parts → ${result.audience.ending ? endName(result.audience.ending) : "(season still running)"}`);
  console.log(`OPTIMAL   ${result.optimal.parts} parts → ${endName(result.optimal.ending)}: ${result.optimal.steps.map((x) => `${x.node}:${x.key} ${x.label}`).join(" › ")}`);
  console.log(`votes that matched the best move: ${result.matched_votes} of ${steps.length}`);
  for (const x of steps) console.log(`  Part ${String(x.part).padStart(2)} ${x.title.padEnd(26)} you: ${x.chose.key} ${x.chose.label}${x.chose.pct != null ? ` (${x.chose.pct}%)` : ""}${x.matched_best ? "  ✓ best" : `  · best was ${x.best.key} ${x.best.label}`}${x.lost_ground ? `  ← lost ${endings[x.best_ending_before].title}` : ""}`);
  if (turning) console.log(`TURNING POINT  Part ${turning.part} (${turning.title}): "${turning.chose.label}" took ${endings[turning.best_ending_before].title} off the table; "${turning.best.label}" kept it.`);
  else console.log("TURNING POINT  none: the audience never lost ground.");
  if (closeCalls.length) console.log(`CLOSE CALLS    ${closeCalls.map((x) => `Part ${x.part} (${x.chose.pct}% for ${x.chose.label})`).join(", ")}`);
}

// ---------- Remotion spec for the reveal video ----------
if (flag("--spec")) {
  const title = (map.title || "").replace(/\.$/, "");
  const nRows = Math.max(result.optimal.steps.length, steps.length);
  const dur = Math.min(58, 12 + nRows * 2.2);
  const lanes = [
    { label: "You chose", ending: result.audience.ending_title || "…", type: result.audience.ending_type || "got_away", steps: steps.map((x) => ({ part: x.part, key: x.chose.key, label: x.chose.label, pct: x.chose.pct, best: x.matched_best, turning: turning?.part === x.part })) },
    { label: "Perfect run", ending: result.optimal.ending_title, type: "got_away", steps: result.optimal.steps.map((x) => ({ part: x.part, key: x.key, label: x.label, best: true })) },
  ];
  const spec = {
    duration: dur,
    theme: { bg: "#0A0A0F", accent: "#FFD23F", danger: "#FF4D4D", good: "#3CCB7F" },
    shots: [{ at: 0, type: "title", text: "The route you took", highlight: "you took" }],
    overlays: [
      { at: 0, end: 3, type: "titlecard", text: `${title.split(" ").slice(0, 2).join(" ")}|${title.split(" ").slice(2).join(" ") || "Route reveal"}`, sub: "Route reveal" },
      { at: 3, end: dur, type: "routes", text: result.same_ending ? "You found the perfect ending." : `${result.matched_votes} of ${steps.length} votes matched the perfect run.`, sub: "Green: the best move from where you were. Red: the vote that cost you.", lanes },
      turning && { at: dur - 4, end: dur, type: "lowerthird", text: `Part ${turning.part}: "${turning.chose.label}"`, sub: `That vote cost you ${endings[turning.best_ending_before].title}. Voted ${turning.best.key}? Say so below.`, color: "danger", y: 150 },
    ].filter(Boolean),
    captions: { enabled: true },
    watermark: map.handle || "",
  };
  fs.writeFileSync(flag("--spec"), JSON.stringify(spec, null, 2));
  console.log(`SPEC ${flag("--spec")} (${dur.toFixed(1)} s; add the narration as "audio" and its words before rendering)`);
}
function has(n) { return args.includes(n); }
