// Drawn sets for scene shots: flat noir line-art on a 1080x1920 canvas. Every set takes the same
// palette so a whole series stays one look; `text` fills signs, boards and screens in the set.
import React from "react";

export type SetName = "lane" | "street" | "docks" | "station" | "interview" | "kitchen" | "road" | "rooftop" | "office" | "blank";
export type Pal = { sky: string; sky2: string; wall: string; wall2: string; line: string; light: string; window: string; ground: string; accent: string; ink: string; danger: string };
export const W = 1080, H = 1920, GROUND = 1500;

export function palette(time: "night" | "dawn" | "day", accent: string, danger: string): Pal {
  if (time === "day") return { sky: "#9fb7cf", sky2: "#dfe7ee", wall: "#5b6474", wall2: "#4a5262", line: "#2b313c", light: "#fff1c4", window: "#cfe3f3", ground: "#3d434e", accent, ink: "#f4f5f7", danger };
  if (time === "dawn") return { sky: "#2d2440", sky2: "#e48a5c", wall: "#262536", wall2: "#1d1c2b", line: "#4a4560", light: "#ffc58a", window: "#ffd9a8", ground: "#1b1a26", accent, ink: "#f4f1ee", danger };
  return { sky: "#05070d", sky2: "#141a2a", wall: "#121722", wall2: "#0c1019", line: "#2b3346", light: "#f2a541", window: "#f6c56b", ground: "#0b0e15", accent, ink: "#eef1f6", danger };
}

const Sky: React.FC<{ p: Pal; id: string }> = ({ p, id }) => (
  <>
    <defs>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky} /><stop offset="1" stopColor={p.sky2} /></linearGradient>
      <radialGradient id={`lamp-${id}`} cx="0.5" cy="0" r="1"><stop offset="0" stopColor={p.light} stopOpacity="0.55" /><stop offset="1" stopColor={p.light} stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#sky-${id})`} />
  </>
);
const Ground: React.FC<{ p: Pal; y?: number }> = ({ p, y = GROUND }) => (
  <>
    <rect x={0} y={y} width={W} height={H - y} fill={p.ground} />
    <line x1={0} y1={y} x2={W} y2={y} stroke={p.line} strokeWidth={4} />
  </>
);
const Lamp: React.FC<{ p: Pal; x: number; top: number; id: string; flicker?: number; h?: number }> = ({ p, x, top, id, flicker = 1, h = GROUND - 40 }) => (
  <g opacity={flicker}>
    <path d={`M${x} ${top} L${x - 330} ${h} L${x + 330} ${h} Z`} fill={`url(#lamp-${id})`} />
    <circle cx={x} cy={top} r={16} fill={p.light} />
    <circle cx={x} cy={top} r={60} fill={p.light} opacity={0.18} />
  </g>
);
const Windows: React.FC<{ p: Pal; x: number; y: number; cols: number; rows: number; w?: number; h?: number; gap?: number; lit?: number[]; seed?: number }> = ({ p, x, y, cols, rows, w = 70, h = 90, gap = 40, lit = [], seed = 1 }) => {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c; const on = lit.includes(i) || ((i * 37 + seed * 13) % 11 === 0);
    out.push(<rect key={i} x={x + c * (w + gap)} y={y + r * (h + gap)} width={w} height={h} fill={on ? p.window : p.wall2} opacity={on ? 0.85 : 1} stroke={p.line} strokeWidth={3} />);
  }
  return <>{out}</>;
};

export const SetView: React.FC<{ name: SetName; p: Pal; f: number; text?: string; lit?: number[]; flicker?: number }> = ({ name, p, f, text, lit, flicker = 1 }) => {
  const id = name;
  switch (name) {
    case "lane":
      return (
        <g>
          <Sky p={p} id={id} />
          {/* left and right walls in one-point perspective */}
          <path d={`M0 0 L330 520 L330 ${GROUND - 60} L0 ${GROUND + 160} Z`} fill={p.wall} stroke={p.line} strokeWidth={4} />
          <path d={`M${W} 0 L750 520 L750 ${GROUND - 60} L${W} ${GROUND + 160} Z`} fill={p.wall2} stroke={p.line} strokeWidth={4} />
          {Array.from({ length: 14 }).map((_, i) => <line key={i} x1={0} y1={160 + i * 100} x2={330} y2={600 + i * 62} stroke={p.line} strokeWidth={2} opacity={0.6} />)}
          <rect x={330} y={520} width={420} height={GROUND - 580} fill={p.sky2} opacity={0.5} />
          {/* Lena's window, the lit one */}
          <path d={`M790 640 L960 560 L960 800 L790 860 Z`} fill={lit?.includes(0) === false ? p.wall : p.window} opacity={0.9} stroke={p.line} strokeWidth={4} />
          <path d={`M60 420 L230 560 L230 760 L60 640 Z`} fill={p.wall2} stroke={p.line} strokeWidth={4} />
          {/* fire escape */}
          <g stroke={p.line} strokeWidth={5} fill="none"><path d="M780 960 L1000 900 M780 1100 L1000 1040 M820 960 L960 1040 M820 1100 L960 1180" /></g>
          {/* bins */}
          <rect x={120} y={GROUND - 150} width={120} height={150} rx={8} fill="#1b2a22" stroke={p.line} strokeWidth={4} />
          <rect x={250} y={GROUND - 120} width={90} height={120} rx={8} fill="#22232b" stroke={p.line} strokeWidth={4} />
          <Lamp p={p} x={540} top={600} id={id} flicker={flicker} />
          <rect x={530} y={600} width={20} height={GROUND - 600} fill={p.line} opacity={0.0} />
          <Ground p={p} />
          {/* puddles catching the lamp */}
          <ellipse cx={560} cy={GROUND + 120} rx={170} ry={22} fill={p.light} opacity={0.18 * flicker} />
          <ellipse cx={330} cy={GROUND + 260} rx={110} ry={14} fill={p.light} opacity={0.1 * flicker} />
        </g>
      );
    case "street":
      return (
        <g>
          <Sky p={p} id={id} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 360} 0)`}>
              <path d={`M20 ${GROUND - 520} L180 ${GROUND - 680} L340 ${GROUND - 520} Z`} fill={p.wall2} stroke={p.line} strokeWidth={4} />
              <rect x={40} y={GROUND - 520} width={280} height={520} fill={p.wall} stroke={p.line} strokeWidth={4} />
              <rect x={140} y={GROUND - 220} width={80} height={220} fill={p.wall2} stroke={p.line} strokeWidth={4} />
              <circle cx={240} cy={GROUND - 120} r={8} fill={p.danger} opacity={0.6 + 0.4 * Math.sin(f / 8 + i)} />
              <Windows p={p} x={70} y={GROUND - 460} cols={2} rows={1} w={80} h={90} gap={60} lit={i === 1 ? [0] : []} seed={i + 3} />
            </g>
          ))}
          <Lamp p={p} x={900} top={GROUND - 760} id={id} flicker={flicker} />
          <Ground p={p} />
        </g>
      );
    case "docks":
      return (
        <g>
          <Sky p={p} id={id} />
          {/* crane */}
          <g stroke={p.line} strokeWidth={8} fill="none"><path d="M760 300 L760 1200 M760 300 L1060 300 M760 380 L1000 300 M700 300 L760 300" /><path d="M960 300 L960 560" strokeWidth={4} /></g>
          {/* container stacks */}
          {[[0, 900, "#4a2a2a"], [0, 1100, "#2a3a4a"], [0, 1300, "#3a4a2a"], [380, 1100, "#4a3a20"], [380, 1300, "#2a2a44"], [700, 1300, "#43262f"]].map(([x, y, c], i) => (
            <g key={i}><rect x={x as number} y={y as number} width={340} height={200} fill={c as string} stroke={p.line} strokeWidth={4} />
              {Array.from({ length: 9 }).map((_, k) => <line key={k} x1={(x as number) + 20 + k * 36} y1={(y as number) + 10} x2={(x as number) + 20 + k * 36} y2={(y as number) + 190} stroke="#000" opacity={0.25} strokeWidth={4} />)}
              {text && i === 4 && <text x={(x as number) + 170} y={(y as number) + 115} textAnchor="middle" fontFamily="monospace" fontSize={42} fill="#d8d0bf" opacity={0.8}>{text}</text>}
            </g>
          ))}
          <Lamp p={p} x={240} top={420} id={id} flicker={flicker} h={GROUND} />
          {/* chain fence in the foreground */}
          <g opacity={0.5} stroke={p.ink} strokeWidth={2}>{Array.from({ length: 30 }).map((_, i) => <line key={i} x1={i * 40 - 200} y1={1150} x2={i * 40 + 200} y2={1550} />)}{Array.from({ length: 30 }).map((_, i) => <line key={"b" + i} x1={i * 40 + 200} y1={1150} x2={i * 40 - 200} y2={1550} />)}</g>
          <Ground p={p} />
          <rect x={0} y={GROUND + 160} width={W} height={H - GROUND - 160} fill="#08121c" />
          {Array.from({ length: 6 }).map((_, i) => <line key={i} x1={(i * 220 + f * 2) % (W + 200) - 100} y1={GROUND + 220 + i * 30} x2={(i * 220 + f * 2) % (W + 200) + 20} y2={GROUND + 220 + i * 30} stroke={p.light} strokeWidth={3} opacity={0.25} />)}
        </g>
      );
    case "station":
      return (
        <g>
          <Sky p={{ ...p, sky: p.wall2, sky2: p.wall }} id={id} />
          {[140, 540, 940].map((x) => <rect key={x} x={x - 20} y={300} width={40} height={GROUND - 300} fill={p.wall2} stroke={p.line} strokeWidth={4} />)}
          {/* departure board */}
          <rect x={250} y={360} width={580} height={220} rx={10} fill="#0a0a0a" stroke={p.line} strokeWidth={6} />
          <text x={540} y={440} textAnchor="middle" fontFamily="monospace" fontSize={44} fill={p.light}>{(text || "01:14  INTERSTATE").split("|")[0]}</text>
          <text x={540} y={520} textAnchor="middle" fontFamily="monospace" fontSize={36} fill={p.light} opacity={0.75}>{(text || "|PLATFORM 7").split("|")[1] || "PLATFORM 7"}</text>
          {[240, 840].map((x) => <path key={x} d={`M${x} 200 L${x - 260} ${GROUND - 60} L${x + 260} ${GROUND - 60} Z`} fill={`url(#lamp-${id})`} opacity={0.7 * flicker} />)}
          <Ground p={p} />
          <rect x={0} y={GROUND} width={W} height={26} fill="#d6c34a" opacity={0.85} />
          <g stroke={p.line} strokeWidth={8}><line x1={0} y1={GROUND + 230} x2={W} y2={GROUND + 230} /><line x1={0} y1={GROUND + 320} x2={W} y2={GROUND + 320} /></g>
        </g>
      );
    case "interview":
      return (
        <g>
          <rect width={W} height={H} fill="#151a22" />
          <rect x={620} y={420} width={400} height={300} fill="#0a0d12" stroke={p.line} strokeWidth={6} />
          <rect x={620} y={420} width={400} height={300} fill={p.ink} opacity={0.04} />
          <line x1={540} y1={0} x2={540} y2={360} stroke={p.line} strokeWidth={4} />
          <path d="M460 360 L620 360 L580 400 L500 400 Z" fill={p.wall2} stroke={p.line} strokeWidth={4} />
          <path d="M540 400 L120 1460 L960 1460 Z" fill={p.light} opacity={0.1 * flicker} />
          <Ground p={{ ...p, ground: "#10141b" }} y={GROUND} />
          <rect x={240} y={1240} width={600} height={28} fill={p.wall} stroke={p.line} strokeWidth={4} />
          <line x1={290} y1={1268} x2={290} y2={GROUND} stroke={p.line} strokeWidth={8} /><line x1={790} y1={1268} x2={790} y2={GROUND} stroke={p.line} strokeWidth={8} />
          <rect x={500} y={1210} width={80} height={30} rx={4} fill="#2a2f3a" stroke={p.line} strokeWidth={3} /><circle cx={565} cy={1225} r={6} fill={p.danger} opacity={0.6 + 0.4 * Math.sin(f / 6)} />
        </g>
      );
    case "kitchen":
      return (
        <g>
          <rect width={W} height={H} fill="#1e1a20" />
          <rect x={120} y={420} width={480} height={520} fill="#0b1220" stroke={p.line} strokeWidth={6} />
          <Windows p={{ ...p, wall2: "#0b1220" }} x={150} y={560} cols={6} rows={4} w={30} h={30} gap={46} seed={7} />
          <path d={`M60 300 Q300 360 540 300 Q780 360 1020 300`} stroke={p.line} strokeWidth={3} fill="none" />
          {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={80 + i * 82} cy={310 + Math.sin(i) * 20 + 22} r={8} fill={p.light} opacity={0.5 + 0.5 * Math.sin(f / 10 + i)} />)}
          <rect x={760} y={560} width={220} height={GROUND - 560} fill="#d8dde3" opacity={0.12} stroke={p.line} strokeWidth={4} />
          <rect x={0} y={1180} width={W} height={36} fill={p.wall} stroke={p.line} strokeWidth={4} />
          <Ground p={{ ...p, ground: "#16131a" }} />
        </g>
      );
    case "office":
      return (
        <g>
          <rect width={W} height={H} fill="#141922" />
          <Windows p={p} x={80} y={300} cols={3} rows={2} w={260} h={320} gap={40} seed={4} lit={[]} />
          <rect x={140} y={1180} width={800} height={30} fill={p.wall} stroke={p.line} strokeWidth={4} />
          <rect x={430} y={1030} width={220} height={150} rx={8} fill="#0a0c10" stroke={p.line} strokeWidth={4} />
          <Ground p={p} />
        </g>
      );
    case "road":
      return (
        <g>
          <Sky p={p} id={id} />
          <circle cx={780} cy={980} r={110} fill={p.light} opacity={0.6} />
          {/* gum-tree silhouettes */}
          {[80, 260, 880, 1000].map((x, i) => <g key={x} fill="#0d0d14"><rect x={x - 10} y={820 - i * 20} width={20} height={300} /><circle cx={x} cy={800 - i * 20} r={90} /><circle cx={x + 60} cy={850 - i * 20} r={70} /></g>)}
          <path d={`M0 1100 L${W} 1100 L${W} ${H} L0 ${H} Z`} fill={p.ground} />
          <path d={`M540 1100 L-200 ${H} L${W + 200} ${H} Z`} fill="#15151d" />
          {Array.from({ length: 6 }).map((_, i) => { const k = ((i * 0.18 + f / 90) % 1); const y = 1100 + k * k * 820; return <rect key={i} x={540 - 6 - k * 30} y={y} width={12 + k * 60} height={10 + k * 70} fill={p.light} opacity={0.7} />; })}
        </g>
      );
    case "rooftop":
      return (
        <g>
          <Sky p={p} id={id} />
          {[[0, 700, 160], [180, 560, 140], [340, 820, 200], [560, 480, 130], [710, 640, 170], [900, 760, 180]].map(([x, y, w], i) => (
            <g key={i}><rect x={x} y={y} width={w} height={1300 - y} fill={p.wall} stroke={p.line} strokeWidth={3} /><Windows p={p} x={x + 18} y={y + 30} cols={3} rows={8} w={(w - 60) / 3} h={34} gap={12} seed={i} /></g>
          ))}
          <rect x={0} y={1300} width={W} height={40} fill={p.wall2} stroke={p.line} strokeWidth={4} />
          {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={i * 100} y1={1300} x2={i * 100} y2={1180} stroke={p.ink} strokeWidth={6} opacity={0.5} />)}
          <line x1={0} y1={1180} x2={W} y2={1180} stroke={p.ink} strokeWidth={6} opacity={0.5} />
          <Ground p={{ ...p, ground: "#15171e" }} />
          <g stroke="#e8e8e8" strokeWidth={8} opacity={0.35}><line x1={300} y1={GROUND + 120} x2={300} y2={H} /><line x1={780} y1={GROUND + 120} x2={780} y2={H} /></g>
        </g>
      );
    default:
      return (
        <g>
          <defs><radialGradient id="blank-g" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stopColor={p.sky2} /><stop offset="1" stopColor={p.sky} /></radialGradient></defs>
          <rect width={W} height={H} fill="url(#blank-g)" />
        </g>
      );
  }
};
