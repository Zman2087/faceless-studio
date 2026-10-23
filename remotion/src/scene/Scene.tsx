// "scene" shots: a drawn set, a stick-figure cast that walks, runs and reacts, props, weather and
// light, under a moving camera. Everything is code, so a whole episode costs zero credits.
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig, Easing, staticFile } from "remotion";
import { Theme } from "../types";
import { StickFigure, Pose, Outfit, Item, Expression } from "./rig";
import { Toon, ToonLook, Talk } from "./toon";
import { SetView, SetName, palette, W, H, GROUND, Pal } from "./sets";

export type CastMember = { color: string; outfit?: Outfit; name?: string; toon?: ToonLook };
export type Actor = {
  cast?: string; color?: string; outfit?: Outfit; label?: string;
  x: number; y?: number; scale?: number; facing?: "left" | "right";
  pose?: Pose; then?: { at: number; pose: Pose; expression?: Expression; item?: Item; item2?: Item; facing?: "left" | "right" }[];
  move?: { to: number; at?: number; dur?: number; gait?: "walk" | "run" };
  item?: Item; item2?: Item; expression?: Expression; enter_at?: number; exit_at?: number; glow?: boolean;
  style?: "stick" | "toon"; look?: ToonLook; talk?: Talk; gaze?: number; // toon: cartoon character with a face, blinking and lip-sync (talk.env = mouth openness per frame)
};
export type Prop = { skew?: number; figure?: "bun" | "short" | "none"; gesture?: "hand_mouth" | "point" | "still"; w?: number; h?: number; type: "window" | "ute" | "car" | "police" | "bin" | "door" | "sign" | "screen" | "phone" | "tape" | "chair" | "knife" | "bag" | "drain" | "boat" | "truck"; x: number; y?: number; scale?: number; text?: string; at?: number; flip?: boolean };
export type Fx = "siren_rise" | "streaks" | "rain" | "sirens" | "flicker" | "heartbeat" | "fog" | "flash" | "letterbox" | "spotlight" | "dark" | "shake";
export type SceneShot = {
  type: "scene"; at: number; set: SetName; time?: "night" | "dawn" | "day"; text?: string; lit?: number[];
  camera?: { zoom?: [number, number]; x?: [number, number]; y?: [number, number]; ease?: "in" | "out" | "inout" | "linear" };
  actors?: Actor[]; props?: Prop[]; fx?: Fx[]; fx_at?: Record<string, number>; spot?: number; // spot = index of the actor the spotlight follows
  label?: string; stamp?: any; credit?: string; transition?: any;
  bg?: string; // a painted background plate (image) drawn instead of the code-drawn set; characters animate on top
  bg_dim?: number; // 0-1 darkening over the plate so the figures read (default 0.15)
  start_offset?: number; shot_len?: number; // set by tools/render-long.mjs when a shot spans two chunks
  relative?: boolean; // true: every at/dur inside this shot is a fraction of the shot (0-1), so it survives retiming to the voice
};

const ease = (e?: string) => (e === "linear" ? (x: number) => x : e === "in" ? Easing.in(Easing.cubic) : e === "out" ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic));

export const Scene: React.FC<{ s: SceneShot; t: Theme; cast?: Record<string, CastMember> }> = ({ s, t, cast = {} }) => {
  const { fps, durationInFrames: seqD } = useVideoConfig();
  // a long episode is rendered in chunks: a scene cut at a chunk boundary carries on from where it was
  const f = useCurrentFrame() + Math.round((s.start_offset ?? 0) * fps);
  const d = s.shot_len ? Math.round(s.shot_len * fps) : seqD;
  const sec = f / fps;
  const p: Pal = palette(s.time || "night", t.accent, t.danger);
  const fx = new Set(s.fx || []);
  const fxOn = (k: Fx) => fx.has(k) && sec >= (s.fx_at?.[k] ?? 0) * (s.relative ? d / fps : 1);
  const k = interpolate(f, [0, Math.max(1, d - 1)], [0, 1], { extrapolateRight: "clamp", easing: ease(s.camera?.ease) });
  const z = s.camera?.zoom ? s.camera.zoom[0] + (s.camera.zoom[1] - s.camera.zoom[0]) * k : 1.04 + 0.05 * k;
  const cx = s.camera?.x ? s.camera.x[0] + (s.camera.x[1] - s.camera.x[0]) * k : W / 2;
  const cy = s.camera?.y ? s.camera.y[0] + (s.camera.y[1] - s.camera.y[0]) * k : H * 0.62;
  const shake = fxOn("shake") ? 10 : 0;
  const sx = shake ? (random(`sx${f}`) - 0.5) * shake : 0, sy = shake ? (random(`sy${f}`) - 0.5) * shake : 0;
  const flicker = fxOn("flicker") ? (random(`fl${Math.floor(f / 3)}`) > 0.82 ? 0.25 : 1) : 1;

  const T = s.relative ? d / fps : 1; // relative timing: fractions of the shot
  const actorAt = (a: Actor) => {
    let x = a.x, pose: Pose = a.pose || "stand", expr = a.expression || "neutral", item = a.item || "none", item2 = a.item2 || "none", facing = a.facing || "right", moving = false;
    if (a.move) {
      const m0 = (a.move.at ?? 0) * T * fps, m1 = m0 + (a.move.dur ?? (s.relative ? 0.5 : 2)) * T * fps;
      const q = interpolate(f, [m0, m1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      x = a.x + (a.move.to - a.x) * q;
      moving = f >= m0 && f < m1;
      if (moving) { pose = a.move.gait || "walk"; facing = a.move.to < a.x ? "left" : "right"; }
    }
    let blend = 1;
    for (const th of a.then || []) if (sec >= th.at * T) {
      if (!moving) pose = th.pose; if (th.expression) expr = th.expression; if (th.item) item = th.item; if (th.item2) item2 = th.item2; if (th.facing) facing = th.facing;
      blend = interpolate(f, [th.at * T * fps, th.at * T * fps + 6], [0, 1], { extrapolateRight: "clamp" });
    }
    const speed = a.move?.gait === "run" ? 0.55 : 0.32;
    return { x, pose, expr, item, item2, facing, moving, run: a.move?.gait === "run", phase: f * speed, blend: moving ? 1 : blend };
  };

  return (
    <AbsoluteFill style={{ background: p.sky, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${W / 2 + sx} ${H * 0.62 + sy}) scale(${z}) translate(${-cx} ${-cy})`}>
          {s.bg ? <><image href={/^(https?:|data:)/.test(s.bg) ? s.bg : staticFile(s.bg)} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" opacity={flicker < 1 ? 0.85 : 1} />
            <rect x={0} y={0} width={W} height={H} fill="#000" opacity={s.bg_dim ?? 0.15} /></>
            : <SetView name={s.set} p={p} f={f} text={s.text} lit={s.lit} flicker={flicker} />}
          {(s.props || []).filter((pr) => pr.type === "window" || sec >= (pr.at ?? 0) * T).map((pr, i) => <PropView key={i} pr={pr} p={p} f={f} fps={fps} T={T} />)}
          {(s.actors || []).map((a, i) => {
            if (a.enter_at != null && sec < a.enter_at * T) return null;
            if (a.exit_at != null && sec >= a.exit_at * T) return null;
            const c = (a.cast && cast[a.cast]) || ({} as CastMember);
            const st = actorAt(a);
            const op = a.enter_at != null ? interpolate(f, [a.enter_at * T * fps, a.enter_at * T * fps + 6], [0, 1], { extrapolateRight: "clamp" }) : 1;
            const sc = a.scale ?? 1, gy = a.y ?? GROUND + 40;
            const streaks = st.moving && (st.run || fx.has("streaks"));
            return (
              <g key={i}>
              {streaks && <g stroke={p.ink} strokeWidth={5 * sc} strokeLinecap="round" opacity={0.45}>{[0.25, 0.45, 0.62, 0.8].map((h, k) => { const dir = st.facing === "left" ? 1 : -1; const len = (120 + 60 * random(`st${k}${Math.floor(f / 2)}`)) * sc; const y0 = gy - h * 420 * sc; const x0 = st.x + dir * 50 * sc; return <line key={k} x1={x0} y1={y0} x2={x0 + dir * len} y2={y0} />; })}</g>}
              {(a.style === "toon" || (a.style !== "stick" && c.toon)) ? <Toon x={st.x} ground={a.y ?? GROUND + 40} scale={a.scale ?? 1} facing={st.facing} pose={st.pose} phase={st.phase} blend={st.blend}
                look={{ ...(c.toon || {}), ...(a.look || {}) }} expression={st.expr} item={st.item} item2={st.item2} talk={a.talk} sec={sec} seed={a.cast || String(i)} gaze={a.gaze} opacity={op} /> :
              <StickFigure x={st.x} ground={a.y ?? GROUND + 40} scale={a.scale ?? 1} facing={st.facing} pose={st.pose} phase={st.phase} blend={st.blend}
                color={a.color || c.color || t.accent} ink={p.ink} outfit={{ ...(c.outfit || {}), ...(a.outfit || {}) }} item={st.item} expression={st.expr}
                glow={a.glow ? p.light : undefined} label={a.label} opacity={op} item2={st.item2} />}
              </g>
            );
          })}
        </g>
        {fxOn("fog") && <Fog f={f} />}
        {fxOn("rain") && <Rain f={f} />}
      </svg>
      {fxOn("dark") && <AbsoluteFill style={{ background: "rgba(0,0,0,.45)" }} />}
      {fxOn("spotlight") && <Spot s={s} actorX={(() => { const a = (s.actors || [])[s.spot ?? 0]; return a ? actorAt(a).x : W / 2; })()} z={z} cx={cx} cy={cy} />}
      {fxOn("sirens") && <Sirens f={f} p={p} />}
      {fx.has("siren_rise") && sec >= (s.fx_at?.siren_rise ?? 0) * T && <Sirens f={f} p={p} level={interpolate(sec, [(s.fx_at?.siren_rise ?? 0) * T, (s.fx_at?.siren_rise ?? 0) * T + 6], [0.15, 1], { extrapolateRight: "clamp" }) * ((s as any).siren_level ?? 1)} />}
      {fxOn("heartbeat") && <Heart f={f} fps={fps} />}
      {fxOn("flash") && <AbsoluteFill style={{ background: "#fff", opacity: interpolate(f, [(s.fx_at?.flash ?? 0) * T * fps, (s.fx_at?.flash ?? 0) * T * fps + 8], [0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />}
      {fxOn("letterbox") && <><div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150, background: "#000" }} /><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "#000" }} /></>}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
};

const Rain: React.FC<{ f: number }> = ({ f }) => (
  <g stroke="#b8c7e0" strokeWidth={3} opacity={0.35}>
    {Array.from({ length: 110 }).map((_, i) => {
      const x0 = random(`rx${i}`) * (W + 200) - 100, sp = 38 + random(`rs${i}`) * 26, len = 40 + random(`rl${i}`) * 40;
      const y = ((random(`ry${i}`) * H + f * sp) % (H + 200)) - 100;
      return <line key={i} x1={x0 + y * 0.12} y1={y} x2={x0 + (y + len) * 0.12} y2={y + len} />;
    })}
  </g>
);
const Fog: React.FC<{ f: number }> = ({ f }) => (
  <g opacity={0.22}>{[0, 1, 2].map((i) => <ellipse key={i} cx={((f * (1.5 + i) + i * 400) % (W + 800)) - 400} cy={GROUND - 60 + i * 90} rx={600} ry={70} fill="#c8d2e0" />)}</g>
);
const Sirens: React.FC<{ f: number; p: Pal; level?: number }> = ({ f, p, level = 1 }) => {
  const on = Math.floor(f / 7) % 2 === 0;
  const a = (0.32 * level).toFixed(3);
  return <AbsoluteFill style={{ background: `linear-gradient(90deg, ${on ? `rgba(255,40,60,${a})` : "transparent"} 0%, transparent 35%, transparent 65%, ${on ? "transparent" : `rgba(40,110,255,${a})`} 100%)`, mixBlendMode: "screen" }} />;
};
const Heart: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const q = (f % Math.round(fps * 0.8)) / (fps * 0.8);
  const v = q < 0.15 ? q / 0.15 : q < 0.3 ? 1 - (q - 0.15) / 0.15 : 0;
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(120,0,10,${0.25 + 0.3 * v}) 100%)` }} />;
};
const Spot: React.FC<{ s: SceneShot; actorX: number; z: number; cx: number; cy: number }> = ({ actorX, z, cx, cy }) => {
  const px = ((actorX - cx) * z + W / 2) / W * 100, py = (((GROUND - 150) - cy) * z + H * 0.62) / H * 100;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at ${px}% ${py}%, transparent 0, transparent 14%, rgba(0,0,0,.78) 30%)` }} />;
};

const PropView: React.FC<{ pr: Prop; p: Pal; f: number; fps: number; T?: number }> = ({ pr, p, f, fps, T = 1 }) => {
  const y = pr.y ?? GROUND + 40, sc = pr.scale ?? 1;
  const g = (el: React.ReactNode) => <g transform={`translate(${pr.x} ${y}) scale(${pr.flip ? -sc : sc} ${sc})`}>{el}</g>;
  switch (pr.type) {
    case "ute": case "car": case "police": case "truck": {
      const big = pr.type === "truck";
      const body = pr.type === "police" ? "#e8ecf2" : pr.type === "ute" ? "#14161c" : big ? "#2b3546" : "#2a3040";
      return g(<>
        <path d={big ? "M-260 -40 L-260 -300 L120 -300 L120 -40 Z M120 -40 L120 -220 L220 -220 L260 -140 L260 -40 Z" : "M-230 -40 L-230 -110 L-120 -120 L-70 -190 L110 -190 L170 -120 L230 -110 L230 -40 Z"} fill={body} stroke={p.ink} strokeWidth={6} strokeLinejoin="round" />
        {pr.type === "police" && <><rect x={-60} y={-210} width={50} height={18} fill={Math.floor(f / 7) % 2 ? "#ff2840" : "#2a6dff"} /><rect x={10} y={-210} width={50} height={18} fill={Math.floor(f / 7) % 2 ? "#2a6dff" : "#ff2840"} /><rect x={-230} y={-90} width={460} height={18} fill="#2a6dff" opacity={0.7} /></>}
        <circle cx={big ? -180 : -140} cy={-40} r={44} fill="#0a0a0a" stroke={p.ink} strokeWidth={6} /><circle cx={big ? 180 : 140} cy={-40} r={44} fill="#0a0a0a" stroke={p.ink} strokeWidth={6} />
        <circle cx={big ? 250 : 222} cy={-90} r={12} fill={p.light} /><path d={`M${big ? 250 : 222} -90 L${big ? 700 : 650} -150 L${big ? 700 : 650} -20 Z`} fill={p.light} opacity={0.15} />
        {pr.text && <text x={big ? -70 : 0} y={big ? -150 : -70} textAnchor="middle" fontFamily="monospace" fontSize={big ? 44 : 30} fontWeight={700} fill={pr.type === "police" ? "#1a2a5a" : "#d8d0bf"}>{pr.text}</text>}
      </>);
    }
    case "window": {
      // A window that is dark until `at`, then snaps on (a flicker), with a silhouette behind the glass.
      const on0 = (pr.at ?? 0) * T * fps;
      const lit = f < on0 ? 0 : f < on0 + 4 ? (Math.floor((f - on0)) % 2 ? 0.3 : 1) : 1;
      const w = pr.w ?? 180, h = pr.h ?? 240;
      const fig = pr.figure ?? "bun";
      const g2 = pr.gesture ?? "hand_mouth";
      return <g transform={`translate(${pr.x} ${pr.y ?? 700}) scale(${sc}) skewY(${pr.skew ?? 0})`}>
        {lit > 0 && <ellipse cx={0} cy={h * 0.6} rx={w * 1.6} ry={h * 1.4} fill={p.window} opacity={0.16 * lit} />}
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={lit ? p.window : p.wall2} opacity={lit ? 0.95 * lit : 1} stroke={p.line} strokeWidth={6} />
        {lit > 0 && fig !== "none" && <g fill="#14100c" opacity={lit}>
          <circle cx={-6} cy={-h * 0.12} r={w * 0.16} />
          {fig === "bun" && <circle cx={-6 - w * 0.12} cy={-h * 0.12 - w * 0.13} r={w * 0.08} />}
          <path d={`M${-w * 0.36} ${h / 2} Q${-w * 0.34} ${-h * 0.02} ${-6} ${-h * 0.0} Q${w * 0.3} ${-h * 0.02} ${w * 0.32} ${h / 2} Z`} />
          {g2 === "hand_mouth" && <path d={`M${w * 0.2} ${h * 0.3} L${w * 0.12} ${-h * 0.02}`} stroke="#14100c" strokeWidth={w * 0.07} strokeLinecap="round" />}
          {g2 === "point" && <path d={`M${w * 0.2} ${h * 0.15} L${w * 0.46} ${h * 0.34}`} stroke="#14100c" strokeWidth={w * 0.07} strokeLinecap="round" />}
          {(fig === "bun") && <path d={`M${-6 - w * 0.13} ${-h * 0.14} h${w * 0.11} M${-6 + w * 0.02} ${-h * 0.14} h${w * 0.11}`} stroke={p.window} strokeWidth={3} />}
        </g>}
        <line x1={0} y1={-h / 2} x2={0} y2={h / 2} stroke={p.line} strokeWidth={5} /><line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke={p.line} strokeWidth={5} opacity={0.6} />
      </g>;
    }
    case "bin": return g(<rect x={-60} y={-150} width={120} height={150} rx={8} fill="#1b2a22" stroke={p.ink} strokeWidth={4} />);
    case "drain": return g(<><rect x={-90} y={-10} width={180} height={34} fill="#050505" stroke={p.ink} strokeWidth={4} />{[-60, -30, 0, 30, 60].map((x) => <line key={x} x1={x} y1={-10} x2={x} y2={24} stroke={p.ink} strokeWidth={4} />)}</>);
    case "door": return g(<><rect x={-90} y={-420} width={180} height={420} fill={p.wall2} stroke={p.ink} strokeWidth={5} /><circle cx={60} cy={-200} r={10} fill={p.light} />{pr.text && <text x={0} y={-440} textAnchor="middle" fontFamily="monospace" fontSize={34} fill={p.ink}>{pr.text}</text>}</>);
    case "sign": return g(<><rect x={-200} y={-120} width={400} height={110} fill="#101318" stroke={p.accent} strokeWidth={5} /><text x={0} y={-50} textAnchor="middle" fontFamily="monospace" fontSize={40} fontWeight={700} fill={p.accent}>{pr.text}</text></>);
    case "tape": return <g transform={`translate(0 ${y - 520}) rotate(-6 540 0)`}><rect x={-100} y={-28} width={W + 200} height={56} fill="#f2c230" />{Array.from({ length: 8 }).map((_, i) => <text key={i} x={i * 300 - 60} y={14} fontFamily="monospace" fontSize={30} fontWeight={800} fill="#111">{pr.text || "POLICE LINE DO NOT CROSS"}</text>)}</g>;
    case "chair": return g(<path d="M-50 0 L-50 -110 L50 -110 L50 0 M-50 -110 L-50 -230" stroke={p.ink} strokeWidth={8} fill="none" />);
    case "knife": return g(<g transform="rotate(80)"><rect x={-6} y={-10} width={12} height={34} rx={3} fill="#3a2a1a" /><path d="M-5 -10 L0 -80 L6 -10 Z" fill="#cfd6df" /></g>);
    case "bag": return g(<><path d="M-50 0 h100 l-12 -110 h-76 Z" fill="rgba(220,230,240,.25)" stroke={p.ink} strokeWidth={4} /><path d="M-24 -110 q24 -40 48 0" stroke={p.ink} strokeWidth={4} fill="none" /></>);
    case "boat": return g(<><path d="M-280 -40 L280 -40 L220 40 L-220 40 Z" fill="#1c2836" stroke={p.ink} strokeWidth={5} /><rect x={-80} y={-150} width={170} height={110} fill="#253244" stroke={p.ink} strokeWidth={5} /></>);
    case "screen": case "phone": {
      // A big in-world screen (a phone, a TV, a station screen) with a line of text that types in.
      const isPhone = pr.type === "phone";
      const n = Math.floor(interpolate(f, [(pr.at ?? 0) * fps, (pr.at ?? 0) * fps + 20], [0, (pr.text || "").length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      const w = isPhone ? 420 : 640, h = isPhone ? 760 : 380;
      return <g transform={`translate(${pr.x - w / 2} ${(pr.y ?? 600) - h / 2}) scale(${sc})`}>
        <rect width={w} height={h} rx={isPhone ? 48 : 16} fill="#0a0c10" stroke={p.ink} strokeWidth={8} />
        <rect x={20} y={isPhone ? 70 : 20} width={w - 40} height={h - (isPhone ? 140 : 40)} rx={isPhone ? 20 : 8} fill={isPhone ? "#101826" : "#0e1a2c"} />
        {isPhone && <rect x={50} y={260} width={w - 100} height={170} rx={26} fill="#2a3a52" />}
        <foreignObject x={isPhone ? 70 : 50} y={isPhone ? 280 : 60} width={w - (isPhone ? 140 : 100)} height={isPhone ? 140 : h - 120}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: isPhone ? 34 : 44, color: "#eef3ff", lineHeight: 1.2 }}>{(pr.text || "").slice(0, n)}</div>
        </foreignObject>
      </g>;
    }
    default: return null;
  }
};
