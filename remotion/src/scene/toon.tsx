// A cartoon character in the style of animated story Shorts: a big round head with an expressive face
// (whites of the eyes, pupils that look where the character looks, brows, blinking, lip-sync from the
// voice), clothes drawn over thin ink limbs, thick outlines and flat colours. It reuses the stick rig's
// skeleton and poses, so every pose, walk and run works the same and the character never changes shape.
import { staticFile } from "remotion";
import React from "react";
import { random } from "remotion";
import { POSES, gait, at, rad, L, Limbs, Pose, Expression, Item , natural} from "./rig";

// An illustrated head sheet: a grid of the same head in different expressions, cut out on a transparent
// background, all cells the same size and aligned. `cells` names each cell left-to-right, top-to-bottom:
// <expr>, <expr>_talk (mouth open) and <expr>_blink (eyes shut). The neck sits at the bottom middle.
export type HeadSheet = { src: string; cols: number; rows: number; cells: string[]; w: number; h: number; size?: number; neck?: number };
export type ToonLook = {
  head?: HeadSheet;
  skin?: string;            // face and hands
  top?: string;             // hoodie / shirt / coat colour
  top_kind?: "hoodie" | "shirt" | "coat" | "scrubs";
  hood_up?: boolean;
  pants?: string; shoes?: string;
  hair?: string;            // hair colour ("none" for bald)
  hair_style?: "messy" | "short" | "bob" | "bun" | "long" | "slick";
  beard?: boolean; glasses?: boolean; tie?: string; lanyard?: boolean; headphones?: boolean;
};
export type Talk = { at: number; env: number[]; fps?: number }; // mouth openness 0-1 per frame of the voice line

const INK = "#141414";
const MOUTHS = (open: number, expr: Expression) => {
  if (open > 0.12) { const h = 6 + open * 34, w = 22 + open * 10; return { d: `M${-w} 0 Q0 ${-h * 0.35} ${w} 0 Q0 ${h} ${-w} 0Z`, fill: "#3a0d10" }; }
  const shapes: Record<string, string> = {
    neutral: "M-16 4 L16 4", calm: "M-16 2 Q0 12 16 2", smirk: "M-14 6 Q6 10 18 -2", sad: "M-16 10 Q0 -2 16 10",
    angry: "M-18 8 Q0 0 18 8", scared: "M-14 8 Q-4 0 4 8 Q10 14 16 6", shock: "M-10 2 a10 13 0 1 0 20 0 a10 13 0 1 0 -20 0",
  };
  return { d: shapes[expr] || shapes.neutral, fill: expr === "shock" ? "#3a0d10" : "none" };
};
const BROWS: Record<string, [number, number]> = { neutral: [0, 0], calm: [0, 2], smirk: [-6, 4], sad: [10, 2], angry: [-16, 6], scared: [14, 8], shock: [12, 14] }; // [tilt, raise]

export const Toon: React.FC<{
  x: number; ground: number; scale?: number; facing?: "left" | "right"; pose?: Pose; phase?: number; blend?: number;
  look: ToonLook; expression?: Expression; item?: Item; item2?: Item; talk?: Talk; sec: number; seed?: string; gaze?: number; opacity?: number;
}> = ({ x, ground, scale = 1, facing = "right", pose = "stand", phase = 0, blend = 1, look, expression = "neutral", item = "none", item2 = "none", talk, sec, seed = "a", gaze = 0, opacity = 1 }) => {
  const target = pose === "walk" || pose === "run" ? gait(pose, phase) : POSES[pose] || POSES.stand;
  const base = POSES.stand;
  const j = natural(Object.fromEntries(Object.keys(base).map((k) => [k, (base as any)[k] + ((target as any)[k] - (base as any)[k]) * blend])) as Limbs);
  // idle life: breathing and a slight sway when not moving
  const idle = pose === "walk" || pose === "run" ? 0 : Math.sin(sec * 2.1 + seed.length) * 1.6;
  const hipY = -(L.thigh + L.shin) + j.hipDrop;
  const [nx, ny] = at(0, hipY, 180 + j.lean + idle * 0.4, L.torso);
  const headR = 66;
  const [hx, hy] = at(nx, ny, 180 + j.lean + j.headTilt * 0.5, 22 + headR * 0.85);
  const shoulderY = ny + 22, sx = nx + Math.sin(rad(j.lean)) * -18;
  const legs = ([["l", j.lThigh, j.lShin], ["r", j.rThigh, j.rShin]] as const).map(([k, th, sh]) => {
    const [kx, ky] = at(0, hipY, th, L.thigh); const [fx, fy] = at(kx, ky, sh, L.shin);
    return { k, d: `M0 ${hipY} L${kx} ${ky} L${fx} ${fy}`, kx, ky, fx, fy };
  });
  const arms = ([["l", j.lUpper, j.lFore], ["r", j.rUpper, j.rFore]] as const).map(([k, up, fo]) => {
    const [ex, ey] = at(sx, shoulderY, up, L.upper); const [wx, wy] = at(ex, ey, fo, L.fore);
    return { k, d: `M${sx} ${shoulderY} L${ex} ${ey} L${wx} ${wy}`, up: `M${sx} ${shoulderY} L${ex} ${ey}`, ex, ey, wx, wy };
  });
  // blink: every 2.5-5 s, 0.12 s long
  let blink = false; { let t = random(`b${seed}`) * 2; let i = 0; while (t < sec + 1 && i < 200) { if (sec >= t && sec < t + 0.12) blink = true; t += 2.5 + random(`b${seed}${i++}`) * 2.5; } }
  // lip-sync
  let open = 0;
  if (talk) { const fps = talk.fps ?? 30; const i = Math.round((sec - talk.at) * fps); if (i >= 0 && i < talk.env.length) open = talk.env[i]; }
  const m = MOUTHS(open, expression);
  const [tilt, raise] = BROWS[expression] || BROWS.neutral;
  const eyeR = expression === "shock" || expression === "scared" ? 17 : 14;
  const px = 4 + gaze * 5, py = expression === "sad" ? 4 : 0;
  const flip = facing === "left" ? -1 : 1;
  const top = look.top || "#8b919c", skin = look.skin || "#f1cfac", pants = look.pants || "#2a3140", shoes = look.shoes || "#eeeeee";
  const torso = `M${sx - 40} ${shoulderY - 8} Q${nx} ${ny - 6} ${sx + 40} ${shoulderY - 8} L${30} ${hipY + 14} Q0 ${hipY + 24} ${-30} ${hipY + 14} Z`;
  return (
    <g transform={`translate(${x} ${ground}) scale(${flip * scale} ${scale})`} opacity={opacity} style={{ filter: "brightness(0.86) saturate(0.92)" }}>
      <ellipse cx={0} cy={6} rx={80} ry={14} fill="#000" opacity={0.35} />
      {/* legs: trousers over thin ink legs, then shoes */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {legs.map((l) => <path key={l.k} d={l.d} stroke={INK} strokeWidth={24} />)}
        {legs.map((l) => <path key={"p" + l.k} d={l.d} stroke={pants} strokeWidth={17} />)}
      </g>
      {legs.map((l) => <ellipse key={"s" + l.k} cx={l.fx + 12} cy={l.fy - 2} rx={26} ry={13} fill={shoes} stroke={INK} strokeWidth={5} />)}
      {/* back arm */}
      <ArmView a={arms[1]} top={top} skin={skin} />
      {/* torso */}
      <path d={torso} fill={top} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {look.top_kind === "hoodie" && <><path d={`M${-22} ${hipY - 6} Q0 ${hipY - 16} ${22} ${hipY - 6}`} stroke={INK} strokeWidth={4} fill="none" opacity={0.6} />
        <path d={`M${nx - 10} ${shoulderY + 4} l-2 46 M${nx + 10} ${shoulderY + 4} l2 46`} stroke="#e8e8e8" strokeWidth={3} /></>}
      {look.top_kind === "shirt" && <path d={`M${nx - 14} ${shoulderY - 6} L${nx} ${shoulderY + 14} L${nx + 14} ${shoulderY - 6}`} stroke={INK} strokeWidth={4} fill="#fff" />}
      {look.tie && <path d={`M${nx} ${shoulderY + 10} l-9 16 l9 64 l9 -64 Z`} fill={look.tie} stroke={INK} strokeWidth={3} />}
      {look.lanyard && <g><path d={`M${nx - 16} ${shoulderY - 4} L${nx - 4} ${shoulderY + 70} L${nx + 16} ${shoulderY - 4}`} stroke="#d94a4a" strokeWidth={5} fill="none" /><rect x={nx - 22} y={shoulderY + 66} width={34} height={44} rx={5} fill="#f4f4f4" stroke={INK} strokeWidth={3} /><rect x={nx - 16} y={shoulderY + 72} width={22} height={8} fill="#5a7bd8" /></g>}
      {/* head: an illustrated expression sheet when the cast has one, else the drawn head */}
      {look.head ? <SheetHead sheet={look.head} expr={expression} open={open} blink={blink} x={nx} y={ny} tilt={j.headTilt * 0.7 + idle * 0.5} /> : <>
      <g transform={`translate(${hx} ${hy}) rotate(${j.headTilt * 0.7 + idle * 0.5})`}>
        {look.top_kind === "hoodie" && look.hood_up && <path d={`M${-headR - 18} ${30} Q${-headR - 26} ${-headR - 22} 0 ${-headR - 26} Q${headR + 26} ${-headR - 22} ${headR + 18} ${30} Q${headR} ${headR * 0.6} 0 ${headR * 0.75} Q${-headR} ${headR * 0.6} ${-headR - 18} ${30}Z`} fill={top} stroke={INK} strokeWidth={6} />}
        <circle r={headR} fill={skin} stroke={INK} strokeWidth={6} />
        <Hair look={look} r={headR} />
        {look.beard && <path d={`M${-headR + 8} ${10} Q${-headR + 4} ${headR + 10} 0 ${headR + 14} Q${headR - 4} ${headR + 10} ${headR - 8} ${10} Q${headR * 0.5} ${34} 0 ${30} Q${-headR * 0.5} ${34} ${-headR + 8} ${10}Z`} fill={look.hair || "#5a3a22"} stroke={INK} strokeWidth={4} />}
        {/* eyes */}
        {[-24, 18].map((ex, k) => (
          <g key={k} transform={`translate(${ex + 6} ${-8})`}>
            {blink ? <path d={`M${-eyeR} 0 Q0 ${6} ${eyeR} 0`} stroke={INK} strokeWidth={5} fill="none" /> : <>
              <ellipse rx={eyeR} ry={eyeR + 3} fill="#fff" stroke={INK} strokeWidth={4} />
              <circle cx={px} cy={py} r={eyeR * 0.45} fill={INK} /><circle cx={px + 2} cy={py - 3} r={2.5} fill="#fff" />
              {expression === "calm" ? <path d={`M${-eyeR - 2} -4 L${eyeR + 2} -4`} stroke={INK} strokeWidth={5} /> : null}
            </>}
            <path d={`M${-eyeR} ${-eyeR - 10 - raise} L${eyeR} ${-eyeR - 10 - raise + (k === 0 ? -tilt : tilt) * 0.5}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
          </g>
        ))}
        {look.glasses && <g stroke={INK} strokeWidth={4} fill="none"><circle cx={-18} cy={-8} r={20} /><circle cx={24} cy={-8} r={20} /><path d="M2 -8 h2" /></g>}
        <path d="M2 10 q4 8 -2 10" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d={m.d} transform={`translate(4 ${36 - (open > 0.12 ? 4 : 0)})`} fill={m.fill} stroke={INK} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        {open > 0.45 && <path d={`M-14 ${34} h28`} stroke="#fff" strokeWidth={5} />}
      </g>
      </>}
      {look.headphones && !look.head && <g transform={`translate(${nx} ${ny + 2})`}><path d="M-46 -6 Q0 44 46 -6" stroke="#f2c230" strokeWidth={11} fill="none" /><ellipse cx={44} cy={-4} rx={18} ry={22} fill="#f2c230" stroke={INK} strokeWidth={4} /><ellipse cx={-44} cy={-4} rx={16} ry={20} fill="#d4a11c" stroke={INK} strokeWidth={4} /></g>}
      {/* front arm and held items */}
      <ArmView a={arms[0]} top={top} skin={skin} />
      <HeldToon item={item} x={arms[0].wx} y={arms[0].wy} />
      <HeldToon item={item2} x={arms[1].wx} y={arms[1].wy} />
    </g>
  );
};

const ArmView: React.FC<{ a: { d: string; up: string; ex: number; ey: number; wx: number; wy: number }; top: string; skin: string }> = ({ a, top, skin }) => (
  <g strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d={a.d} stroke={INK} strokeWidth={26} />
    <path d={a.d} stroke={top} strokeWidth={18} />
    <circle cx={a.wx} cy={a.wy} r={14} fill={skin} stroke={INK} strokeWidth={5} />
  </g>
);

const Hair: React.FC<{ look: ToonLook; r: number }> = ({ look, r }) => {
  if (!look.hair || look.hair === "none" || look.hood_up && look.top_kind === "hoodie" && look.hair_style !== "messy") return null;
  const c = look.hair, s = look.hair_style || "short";
  const d: Record<string, string> = {
    messy: `M${-r + 6} ${-14} Q${-r + 10} ${-r - 6} ${-10} ${-r + 2} Q${6} ${-r - 14} ${22} ${-r + 4} Q${r} ${-r + 10} ${r - 8} ${-18} Q${24} ${-r + 14} ${-4} ${-r + 22} Q${-28} ${-r + 16} ${-r + 6} ${-14}Z`,
    short: `M${-r + 4} ${-10} Q${-r + 8} ${-r - 4} 0 ${-r - 6} Q${r - 8} ${-r - 4} ${r - 4} ${-10} Q${r * 0.4} ${-r * 0.55} 0 ${-r * 0.6} Q${-r * 0.4} ${-r * 0.55} ${-r + 4} ${-10}Z`,
    slick: `M${-r + 2} ${-6} Q${-r} ${-r - 8} ${r * 0.2} ${-r - 6} Q${r} ${-r + 6} ${r - 2} ${-6} Q${r * 0.5} ${-r * 0.5} ${-r + 2} ${-6}Z`,
    bob: `M${-r - 6} ${40} Q${-r - 10} ${-r - 10} 0 ${-r - 8} Q${r + 10} ${-r - 10} ${r + 6} ${40} L${r - 8} ${40} Q${r - 6} ${-r * 0.4} 0 ${-r * 0.45} Q${-r + 6} ${-r * 0.4} ${-r + 8} ${40}Z`,
    bun: `M${-r + 4} ${-10} Q${-r + 8} ${-r - 4} 0 ${-r - 6} Q${r - 8} ${-r - 4} ${r - 4} ${-10} Q0 ${-r * 0.6} ${-r + 4} ${-10}Z M-20 ${-r - 26} a20 18 0 1 0 40 0 a20 18 0 1 0 -40 0`,
    long: `M${-r - 6} ${70} Q${-r - 12} ${-r - 10} 0 ${-r - 8} Q${r + 12} ${-r - 10} ${r + 6} ${70} L${r - 10} ${70} Q${r - 6} ${-r * 0.4} 0 ${-r * 0.45} Q${-r + 6} ${-r * 0.4} ${-r + 10} ${70}Z`,
  };
  return <path d={d[s] || d.short} fill={c} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
};

const HeldToon: React.FC<{ item: Item; x: number; y: number }> = ({ item, x, y }) => {
  if (item === "none" || !item) return null;
  if (item === "phone") return <g transform={`translate(${x} ${y - 6})`}><circle r={80} fill="#8fd0ff" opacity={0.14} /><rect x={-20} y={-36} width={40} height={66} rx={8} fill="#1b1b1b" stroke={INK} strokeWidth={4} /><rect x={-14} y={-29} width={28} height={50} rx={4} fill="#9fd8ff" /></g>;
  if (item === "knife") return <g transform={`translate(${x} ${y}) rotate(160)`}><rect x={-9} y={-12} width={18} height={40} rx={5} fill="#3a2618" stroke={INK} strokeWidth={4} /><path d="M-9 -12 L2 -120 L11 -12 Z" fill="#e6ebf2" stroke={INK} strokeWidth={4} /><path d="M3 -100 L6 -30" stroke="#fff" strokeWidth={3} /></g>;
  return null;
};

const SheetHead: React.FC<{ sheet: HeadSheet; expr: string; open: number; blink: boolean; x: number; y: number; tilt: number }> = ({ sheet, expr, open, blink, x, y, tilt }) => {
  const has = (n: string) => sheet.cells.includes(n);
  const fam = has(expr) ? expr : ({ angry: "scared", calm: "neutral", smirk: "neutral" } as Record<string, string>)[expr] || "neutral";
  let name = fam;
  if (open > 0.22 && has(`${fam}_talk`)) name = `${fam}_talk`;
  else if (blink && has(`${fam}_blink`)) name = `${fam}_blink`;
  else if (blink && fam !== "shock" && has("neutral_blink")) name = "neutral_blink";
  const i = Math.max(0, sheet.cells.indexOf(name));
  const cw = sheet.w / sheet.cols, ch = sheet.h / sheet.rows;
  const W = sheet.size ?? 250, H = (W * ch) / cw;
  const src = /^(https?:|data:)/.test(sheet.src) ? sheet.src : staticFile(sheet.src);
  return (
    <g transform={`translate(${x} ${y + 26}) rotate(${tilt})`}>
      <svg x={-W / 2} y={-H * (sheet.neck ?? 0.97)} width={W} height={H} viewBox={`${(i % sheet.cols) * cw} ${Math.floor(i / sheet.cols) * ch} ${cw} ${ch}`} overflow="hidden">
        <image href={src} width={sheet.w} height={sheet.h} />
      </svg>
    </g>
  );
};
