// A rigged stick figure: joint angles per pose, procedural walk/run cycles, simple faces and
// costume accents, so a whole cast reads clearly at phone size. Angles are degrees from straight down.
import React from "react";

export type Pose = "stand" | "walk" | "run" | "crouch" | "kneel" | "point" | "phone" | "hold" | "handsup" | "sit" | "look_down" | "reach" | "shrug" | "lean" | "slumped" | "slumped_reach";
export type Expression = "neutral" | "scared" | "angry" | "calm" | "shock" | "sad" | "smirk";
export type Outfit = { hood?: boolean; cap?: boolean; coat?: boolean; tie?: boolean; scrubs?: boolean; glasses?: boolean; hair?: "short" | "bob" | "bun" | "long" | "silver" | "none"; gloves?: boolean };
export type Item = "phone" | "knife" | "bag" | "envelope" | "badge" | "torch" | "mug" | "suitcase" | "none";

type Limbs = { lean: number; hipDrop: number; lThigh: number; lShin: number; rThigh: number; rShin: number; lUpper: number; lFore: number; rUpper: number; rFore: number; headTilt: number };
const L = { torso: 150, thigh: 98, shin: 98, upper: 78, fore: 74, head: 38, neck: 14 };

const POSES: Record<string, Limbs> = {
  stand: { lean: 0, hipDrop: 0, lThigh: 6, lShin: 0, rThigh: -6, rShin: 0, lUpper: 12, lFore: 8, rUpper: -12, rFore: -8, headTilt: 0 },
  crouch: { lean: 22, hipDrop: 80, lThigh: 70, lShin: -55, rThigh: 40, rShin: -75, lUpper: 50, lFore: 70, rUpper: 30, rFore: 60, headTilt: 10 },
  kneel: { lean: 8, hipDrop: 95, lThigh: 85, lShin: -5, rThigh: 0, rShin: -90, lUpper: 35, lFore: 60, rUpper: 25, rFore: 55, headTilt: 15 },
  point: { lean: 0, hipDrop: 0, lThigh: 6, lShin: 0, rThigh: -6, rShin: 0, lUpper: 92, lFore: 92, rUpper: -12, rFore: -8, headTilt: 0 },
  phone: { lean: 0, hipDrop: 0, lThigh: 5, lShin: 0, rThigh: -5, rShin: 0, lUpper: 40, lFore: 150, rUpper: -10, rFore: -6, headTilt: 6 },
  hold: { lean: 4, hipDrop: 0, lThigh: 6, lShin: 0, rThigh: -6, rShin: 0, lUpper: 35, lFore: 80, rUpper: 25, rFore: 75, headTilt: 12 },
  handsup: { lean: -4, hipDrop: 0, lThigh: 8, lShin: 0, rThigh: -8, rShin: 0, lUpper: 155, lFore: 175, rUpper: -155, rFore: -175, headTilt: -4 },
  sit: { lean: 4, hipDrop: 92, lThigh: 88, lShin: -88, rThigh: 84, rShin: -86, lUpper: 25, lFore: 70, rUpper: 15, rFore: 65, headTilt: 4 },
  look_down: { lean: 10, hipDrop: 0, lThigh: 5, lShin: 0, rThigh: -5, rShin: 0, lUpper: 30, lFore: 85, rUpper: 20, rFore: 80, headTilt: 30 },
  reach: { lean: 18, hipDrop: 10, lThigh: 25, lShin: -10, rThigh: -15, rShin: 0, lUpper: 80, lFore: 80, rUpper: -20, rFore: -10, headTilt: 5 },
  shrug: { lean: 0, hipDrop: 0, lThigh: 6, lShin: 0, rThigh: -6, rShin: 0, lUpper: 55, lFore: 140, rUpper: -55, rFore: -140, headTilt: -6 },
  slumped: { lean: -28, hipDrop: 150, lThigh: 80, lShin: 70, rThigh: 95, rShin: 60, lUpper: 10, lFore: 20, rUpper: -30, rFore: -40, headTilt: 35 },
  slumped_reach: { lean: -24, hipDrop: 150, lThigh: 80, lShin: 70, rThigh: 95, rShin: 60, lUpper: 85, lFore: 95, rUpper: -30, rFore: -40, headTilt: 20 },
  lean: { lean: -8, hipDrop: 0, lThigh: 14, lShin: 0, rThigh: -2, rShin: 0, lUpper: -20, lFore: -10, rUpper: -35, rFore: -20, headTilt: -6 },
};

// Walk and run are cycles over phase p (radians).
function gait(kind: "walk" | "run", p: number): Limbs {
  const run = kind === "run";
  const A = run ? 46 : 24, K = run ? 70 : 32, S = run ? 60 : 26;
  const s = Math.sin(p), c = Math.sin(p + Math.PI);
  const knee = (x: number) => -Math.max(0, Math.sin(x + 1.2)) * K;
  return {
    lean: run ? 16 : 3, hipDrop: run ? 6 + Math.abs(Math.cos(p)) * 10 : Math.abs(Math.cos(p)) * 5,
    lThigh: A * s, lShin: A * s + knee(p), rThigh: A * c, rShin: A * c + knee(p + Math.PI),
    lUpper: -S * s + (run ? 10 : 0), lFore: -S * s + (run ? 80 : 18), rUpper: -S * c + (run ? 10 : 0), rFore: -S * c + (run ? 80 : 18), headTilt: run ? 6 : 0,
  };
}

const rad = (d: number) => (d * Math.PI) / 180;
const at = (x: number, y: number, ang: number, len: number) => [x + Math.sin(rad(ang)) * len, y + Math.cos(rad(ang)) * len] as const;

export type FigureProps = {
  x: number; ground: number; scale?: number; facing?: "left" | "right"; pose?: Pose; phase?: number;
  color: string; ink: string; skin?: string; outfit?: Outfit; item?: Item; expression?: Expression; glow?: string; label?: string; labelColor?: string; opacity?: number;
  blend?: number; // 0..1 blend from stand to pose (for a pose that eases in)
};

export const StickFigure: React.FC<FigureProps> = ({ x, ground, scale = 1, facing = "right", pose = "stand", phase = 0, color, ink, outfit = {}, item = "none", expression = "neutral", glow, label, labelColor, opacity = 1, blend = 1 }) => {
  const target = pose === "walk" || pose === "run" ? gait(pose, phase) : POSES[pose] || POSES.stand;
  const base = POSES.stand;
  const j = Object.fromEntries(Object.keys(base).map((k) => [k, (base as any)[k] + ((target as any)[k] - (base as any)[k]) * blend])) as Limbs;
  const hipY = -(L.thigh + L.shin) + j.hipDrop;
  const [nx, ny] = at(0, hipY, 180 + j.lean, L.torso);
  const [hx, hy] = at(nx, ny, 180 + j.lean + j.headTilt * 0.5, L.neck + L.head);
  const legs = ([["l", j.lThigh, j.lShin], ["r", j.rThigh, j.rShin]] as const).map(([k, th, sh]) => {
    const [kx, ky] = at(0, hipY, th, L.thigh); const [fx, fy] = at(kx, ky, sh, L.shin);
    return { k, d: `M0 ${hipY} L${kx} ${ky} L${fx} ${fy}`, fx, fy };
  });
  const shoulderY = ny + 18;
  const sx = nx + Math.sin(rad(j.lean)) * -18;
  const arms = ([["l", j.lUpper, j.lFore], ["r", j.rUpper, j.rFore]] as const).map(([k, up, fo]) => {
    const [ex, ey] = at(sx, shoulderY, up, L.upper); const [wx, wy] = at(ex, ey, fo, L.fore);
    return { k, d: `M${sx} ${shoulderY} L${ex} ${ey} L${wx} ${wy}`, wx, wy };
  });
  const hand = arms[0];
  const sw = 11;
  const eye = { neutral: [5, 0], scared: [7, -4], angry: [5, 3], calm: [3, 0], shock: [9, -6], sad: [5, 2], smirk: [4, 0] }[expression] || [5, 0];
  const mouth: Record<string, string> = {
    neutral: "M-10 14 L10 14", scared: "M-8 16 Q0 8 8 16", angry: "M-10 16 Q0 10 10 16", calm: "M-9 12 Q0 18 9 12",
    shock: "M-6 14 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0", sad: "M-9 17 Q0 10 9 17", smirk: "M-8 14 Q4 18 10 10",
  };
  const flip = facing === "left" ? -1 : 1;
  return (
    <g transform={`translate(${x} ${ground}) scale(${flip * scale} ${scale})`} opacity={opacity}>
      {glow && <ellipse cx={0} cy={-150} rx={170} ry={230} fill={glow} opacity={0.18} />}
      <ellipse cx={0} cy={4} rx={70} ry={12} fill="#000" opacity={0.35} />
      <g stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {legs.map((l) => <path key={l.k} d={l.d} stroke={outfit.scrubs ? color : ink} />)}
        <path d={`M0 ${hipY} L${nx} ${ny}`} stroke={outfit.coat || outfit.hood || outfit.scrubs ? color : ink} strokeWidth={outfit.coat || outfit.hood || outfit.scrubs ? 22 : sw} />
        {outfit.tie && <path d={`M${nx * 0.95} ${ny + 14} L${nx * 0.8} ${ny + 70}`} stroke={color} strokeWidth={8} />}
        {arms.map((a) => <path key={a.k} d={a.d} stroke={outfit.coat || outfit.hood ? color : ink} />)}
        {outfit.gloves && arms.map((a) => <circle key={"g" + a.k} cx={a.wx} cy={a.wy} r={9} fill="#111" stroke="#111" />)}
      </g>
      {/* head */}
      <g transform={`translate(${hx} ${hy}) rotate(${j.headTilt})`}>
        {outfit.hood && <path d={`M-52 18 Q-56 -52 0 -56 Q56 -52 52 18 Q30 2 0 0 Q-30 2 -52 18Z`} fill={color} />}
        <circle r={L.head} fill="#0d0f14" stroke={ink} strokeWidth={sw} />
        {outfit.hair && outfit.hair !== "none" && !outfit.hood && (
          <path d={{ short: "M-36 -12 Q-30 -44 0 -42 Q30 -44 36 -12 Q20 -30 -36 -12Z", bob: "M-42 18 Q-46 -46 0 -44 Q46 -46 42 18 L32 18 Q34 -24 0 -26 Q-34 -24 -32 18Z", bun: "M-36 -12 Q-30 -44 0 -42 Q30 -44 36 -12 Q20 -30 -36 -12Z M-14 -46 a14 12 0 1 0 28 0 a14 12 0 1 0 -28 0", long: "M-40 40 Q-48 -46 0 -44 Q48 -46 40 40 L30 40 Q34 -24 0 -26 Q-34 -24 -30 40Z", silver: "M-38 -8 Q-34 -44 0 -42 Q34 -44 38 -8 Q22 -28 -38 -8Z" }[outfit.hair]}
            fill={outfit.hair === "silver" ? "#c9ced6" : color} />
        )}
        {outfit.cap && <path d="M-40 -12 Q-38 -46 0 -46 Q38 -46 40 -12 Z M10 -14 L64 -10 L40 -2 Z" fill={color} />}
        {/* face: always looks the way the figure faces */}
        <g fill={ink} stroke="none">
          <circle cx={10} cy={-4 + eye[1]} r={eye[0]} />
          <circle cx={26} cy={-4 + eye[1]} r={eye[0]} />
        </g>
        {expression === "angry" && <path d="M2 -18 L18 -12 M34 -18 L22 -12" stroke={ink} strokeWidth={5} strokeLinecap="round" />}
        <path d={mouth[expression] || mouth.neutral} transform="translate(18 2)" stroke={ink} strokeWidth={5} fill={expression === "shock" ? ink : "none"} strokeLinecap="round" />
        {outfit.glasses && <path d="M0 -6 h20 M16 -6 h20" stroke={color} strokeWidth={4} fill="none" />}
      </g>
      {/* item in the lead hand */}
      <Held item={item} x={hand.wx} y={hand.wy} ink={ink} accent={color} />
      {label && (
        <g transform={`scale(${flip} 1)`}>
          <text x={0} y={hy * 1 - 80} textAnchor="middle" fontFamily="monospace" fontSize={30} fontWeight={700} fill={labelColor || color} letterSpacing={3}>{label.toUpperCase()}</text>
        </g>
      )}
    </g>
  );
};

const Held: React.FC<{ item: Item; x: number; y: number; ink: string; accent: string }> = ({ item, x, y, ink, accent }) => {
  if (item === "none") return null;
  if (item === "phone") return <g transform={`translate(${x} ${y})`}><rect x={-14} y={-26} width={28} height={48} rx={6} fill="#111" stroke={ink} strokeWidth={4} /><rect x={-9} y={-20} width={18} height={34} rx={3} fill="#8fd0ff" opacity={0.9} /><circle r={60} fill="#8fd0ff" opacity={0.12} /></g>;
  if (item === "knife") return <g transform={`translate(${x} ${y}) rotate(25)`}><rect x={-5} y={-8} width={10} height={26} rx={3} fill="#3a2a1a" /><path d="M-4 -8 L0 -62 L5 -8 Z" fill="#cfd6df" /></g>;
  if (item === "bag") return <g transform={`translate(${x} ${y})`}><path d="M-28 0 h56 l-6 70 h-44 Z" fill="rgba(220,230,240,.25)" stroke={ink} strokeWidth={4} /><path d="M-16 0 q16 -26 32 0" stroke={ink} strokeWidth={4} fill="none" /></g>;
  if (item === "envelope") return <g transform={`translate(${x} ${y}) rotate(-10)`}><rect x={-34} y={-20} width={68} height={42} fill="#e8dcc0" stroke={ink} strokeWidth={3} /><path d="M-34 -20 L0 6 L34 -20" stroke="#8a7a5a" strokeWidth={3} fill="none" /></g>;
  if (item === "badge") return <g transform={`translate(${x} ${y})`}><path d="M0 -26 L20 -14 L16 14 L0 24 L-16 14 L-20 -14 Z" fill="#d8b44a" stroke={ink} strokeWidth={3} /></g>;
  if (item === "torch") return <g transform={`translate(${x} ${y}) rotate(-70)`}><rect x={-8} y={-10} width={16} height={40} rx={4} fill="#333" stroke={ink} strokeWidth={3} /><path d="M-8 -10 L-140 -520 L140 -520 L8 -10 Z" fill="#fff6c8" opacity={0.18} /></g>;
  if (item === "mug") return <g transform={`translate(${x} ${y})`}><rect x={-16} y={-14} width={32} height={34} rx={4} fill={accent} stroke={ink} strokeWidth={3} /><path d="M16 -6 q14 4 0 18" stroke={ink} strokeWidth={4} fill="none" /></g>;
  if (item === "suitcase") return <g transform={`translate(${x} ${y + 10})`}><rect x={-46} y={0} width={92} height={66} rx={8} fill="#5a4630" stroke={ink} strokeWidth={4} /><path d="M-14 0 v-12 h28 v12" stroke={ink} strokeWidth={4} fill="none" /></g>;
  return null;
};
