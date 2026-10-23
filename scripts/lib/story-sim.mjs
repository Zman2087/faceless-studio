// The story-map rules in one place. Used by story-map-check.mjs and story-route-compare.mjs;
// tracker/story-map.html carries a browser copy of step() — keep them identical.
export function makeSim(map) {
  const nodes = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
  const endings = Object.fromEntries(map.endings.map((e) => [e.id, e]));
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
  const startState = () => ({ suspicion: st.suspicion.start, proof: st.proof.start, flags: new Set() });
  // part = the number of the part being decided (1 = the first part's vote)
  function step(nodeId, opt, s, part) {
    const next = { suspicion: clamp(s.suspicion + PRESSURE + (opt.stakes?.suspicion || 0)), proof: clamp(s.proof + (opt.stakes?.proof || 0)), flags: new Set([...s.flags, ...(opt.flags || [])]) };
    let to = opt.to;
    if (next.suspicion >= st.suspicion.caught_at) to = caughtFor(nodeId, next.flags);
    else if (next.proof >= st.proof.cleared_at && !endings[to]) to = R.cleared;
    if (to === R.cleared && next.proof < R.cleared_min_proof) to = next.suspicion >= R.cleared_fail_caught_at_suspicion || !R.cleared_fallback ? caughtFor(nodeId, next.flags) : R.cleared_fallback; // the cleared ending needs real proof
    if (!endings[to] && part + 1 >= MAXP) to = next.proof >= R.cleared_min_proof ? R.cleared : caughtFor(nodeId, next.flags); // the season has to end
    return { to, s: next };
  }

  // Ending ranking, best first: map.ending_rank, else got_away endings (in map order) then caught ones.
  const rankList = map.ending_rank || [...map.endings.filter((e) => e.type === "got_away"), ...map.endings.filter((e) => e.type === "caught")].map((e) => e.id);
  const rank = (id) => { const i = rankList.indexOf(id); return i < 0 ? rankList.length : i; };

  // Best reachable outcome from a state: lowest ending rank, then fewest parts, then lowest final suspicion.
  // Returns { ending, parts, suspicion, path: [{node, key}] }. Memoised on the full state.
  const memo = new Map();
  const better = (a, b) => !b || rank(a.ending) < rank(b.ending) || (rank(a.ending) === rank(b.ending) && (a.parts < b.parts || (a.parts === b.parts && a.suspicion < b.suspicion)));
  function bestFrom(id, s, part, depth = 0) {
    if (endings[id]) return { ending: id, parts: 0, suspicion: s.suspicion, path: [] };
    if (depth > 30) return null;
    const key = `${id}|${s.suspicion}|${s.proof}|${[...s.flags].sort()}|${part}`;
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (const o of nodes[id].choice.options) {
      const r = step(id, o, s, part);
      const sub = bestFrom(r.to, r.s, part + 1, depth + 1);
      if (!sub) continue;
      const cand = { ending: sub.ending, parts: sub.parts + 1, suspicion: sub.suspicion, path: [{ node: id, key: o.key }, ...sub.path] };
      if (better(cand, best)) best = cand;
    }
    memo.set(key, best);
    return best;
  }
  return { nodes, endings, step, startState, rank, rankList, bestFrom, R, MAXP };
}
