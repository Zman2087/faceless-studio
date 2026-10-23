import React from "react";
import { Scene } from "../scene/Scene";
import {
  AbsoluteFill, Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile,
} from "remotion";
import { Shot, Theme, Stamp } from "../types";
import { tone, onAccent } from "../theme";

const resolve = (src: string) => (/^(https?:|data:)/.test(src) ? src : staticFile(src));
const isVideo = (src: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);

const useIn = (delay = 0, damping = 16) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay * fps, fps, config: { damping, mass: 0.7 } });
};

// A headline with one phrase in a highlight pill.
export const Headline: React.FC<{ text: string; highlight?: string; t: Theme; size?: number; delay?: number }> = ({
  text, highlight, t, size = 88, delay = 0,
}) => {
  const p = useIn(delay);
  const words = text.split(" ");
  const hl = highlight && text.includes(highlight) ? highlight : undefined;
  const parts = hl ? [text.slice(0, text.indexOf(hl)), hl, text.slice(text.indexOf(hl) + hl.length)] : [text];
  return (
    <div
      style={{
        fontFamily: t.font, fontWeight: 800, fontSize: size, lineHeight: 1.12, color: t.text, textAlign: "center",
        letterSpacing: -1, transform: `translateY(${(1 - p) * 40}px)`, opacity: p, padding: "0 70px",
        textShadow: "0 4px 24px rgba(0,0,0,.45)", textWrap: "balance" as any,
      }}
      data-words={words.length}
    >
      {parts.map((s, i) =>
        i === 1 ? (
          <span key={i} style={{ background: t.accent, color: onAccent(t.accent), padding: "0 18px", borderRadius: 18, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" as any, textShadow: "none" }}>
            {s}
          </span>
        ) : (
          <span key={i}>{s}</span>
        ),
      )}
    </div>
  );
};

export const StampMark: React.FC<{ s: Stamp; t: Theme; base: number }> = ({ s, t, base }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = f - (s.at ?? 0) * fps; // stamp.at = seconds after the shot starts
  if (local < 0) return null;
  const p = spring({ frame: local, fps, config: { damping: 9, mass: 0.6 } });
  const c = tone(t, s.color);
  return (
    <div style={{ position: "absolute", top: s.y ?? 250, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: t.font, fontWeight: 900, fontSize: 150, color: c, border: `10px solid ${c}`, borderRadius: 22,
          padding: "0 34px", transform: `rotate(-6deg) scale(${interpolate(p, [0, 1], [2.2, 1])})`, opacity: Math.min(1, p * 2),
          background: "rgba(0,0,0,.25)",
        }}
      >
        {s.text}
      </div>
    </div>
  );
};

const Label: React.FC<{ text?: string; t: Theme }> = ({ text, t }) =>
  text ? (
    <div style={{ fontFamily: "monospace", fontSize: 34, letterSpacing: 6, color: t.accent, textTransform: "uppercase", marginBottom: 30, textAlign: "center" }}>
      {text}
    </div>
  ) : null;

type Move = "push" | "pull" | "pan_left" | "pan_right" | "rise" | "fall" | "still";
// Camera moves for stills (illustrated parts): eased, slow, toward a focus point.
const camera = (move: Move, k: number, fx: number, fy: number) => {
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
  const ox = (0.5 - fx) * 100, oy = (0.5 - fy) * 100; // % shift that keeps the focus point in frame as we zoom
  switch (move) {
    case "pull": return { z: 1.16 - 0.1 * e, x: ox * 0.12 * (1 - e), y: oy * 0.12 * (1 - e) };
    case "pan_left": return { z: 1.14, x: 4 - 8 * e, y: oy * 0.08 };
    case "pan_right": return { z: 1.14, x: -4 + 8 * e, y: oy * 0.08 };
    case "rise": return { z: 1.14, x: ox * 0.08, y: -4 + 8 * e };
    case "fall": return { z: 1.14, x: ox * 0.08, y: 4 - 8 * e };
    case "still": return { z: 1.04, x: 0, y: 0 };
    default: return { z: 1.04 + 0.12 * e, x: ox * 0.12 * e, y: oy * 0.12 * e }; // push
  }
};

const Media: React.FC<{ src: string; start?: number; fit?: "cover" | "contain"; kenburns?: boolean; muted?: boolean; dim?: number; move?: Move; focus?: { x: number; y: number }; flicker?: boolean; rain?: boolean }> = ({
  src, start = 0, fit = "cover", kenburns = true, muted = true, dim = 0, move, focus, flicker, rain,
}) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = Math.min(1, f / Math.max(1, durationInFrames));
  const cam = move ? camera(move, k, focus?.x ?? 0.5, focus?.y ?? 0.5) : { z: kenburns ? interpolate(f, [0, durationInFrames], [1.04, 1.14]) : 1, x: 0, y: 0 };
  const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: fit, ...(focus ? { objectPosition: `${focus.x * 100}% ${focus.y * 100}%` } : {}) };
  // flicker: a soft irregular light pulse, deterministic per frame
  const fl = flicker ? 0.06 * (Math.sin(f * 0.9) * Math.sin(f * 0.37 + 1.3) > 0.55 ? 1 : 0) + 0.02 * Math.sin(f * 0.21) : 0;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {isVideo(src) ? (
        <OffthreadVideo src={resolve(src)} startFrom={Math.round(start * fps)} muted={muted} style={style} />
      ) : (
        <Img src={resolve(src)} style={{ ...style, transform: `translate(${cam.x}%, ${cam.y}%) scale(${cam.z})` }} />
      )}
      {flicker && <AbsoluteFill style={{ background: `rgba(0,0,0,${0.08 + fl})` }} />}
      {rain && (
        <AbsoluteFill style={{
          backgroundImage: "repeating-linear-gradient(104deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 22px, rgba(220,230,255,.10) 23px, rgba(255,255,255,0) 25px)",
          backgroundSize: "140px 260px", backgroundPosition: `${-f * 4}px ${f * 38}px`, mixBlendMode: "screen",
        }} />
      )}
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(0,0,0,${dim})` }} />}
    </AbsoluteFill>
  );
};

const Credit: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <div style={{ position: "absolute", left: 40, bottom: 40, fontFamily: "monospace", fontSize: 22, color: "rgba(255,255,255,.75)", maxWidth: 800 }}>{text}</div>
  ) : null;

const Number_: React.FC<{ s: Extract<Shot, { type: "number" }>; t: Theme }> = ({ s, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(f, [0, 1.2 * fps], [0, 1], { extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });
  const v = (s.value * p).toLocaleString("en-AU", { minimumFractionDigits: s.decimals ?? 0, maximumFractionDigits: s.decimals ?? 0 });
  const cap = useIn(0.5);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: t.font, fontWeight: 900, fontSize: 230, color: tone(t, s.color), letterSpacing: -6, fontVariantNumeric: "tabular-nums" }}>
        {s.prefix}{v}{s.suffix}
      </div>
      {s.caption && (
        <div style={{ fontFamily: t.font, fontWeight: 600, fontSize: 56, color: t.text, opacity: cap, padding: "0 80px", marginTop: 10 }}>{s.caption}</div>
      )}
    </div>
  );
};

const Bars: React.FC<{ s: Extract<Shot, { type: "bars" }>; t: Theme }> = ({ s, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...s.items.map((i) => i.value), 1);
  return (
    <div style={{ width: 900 }}>
      {s.title && <div style={{ fontFamily: t.font, fontWeight: 800, fontSize: 64, color: t.text, marginBottom: 50, textAlign: "center" }}>{s.title}</div>}
      {s.items.map((it, i) => {
        const p = spring({ frame: f - (0.2 + i * 0.35) * fps, fps, config: { damping: 18 } });
        return (
          <div key={i} style={{ marginBottom: 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: t.font, fontSize: 44, fontWeight: 700, color: t.text, marginBottom: 12 }}>
              <span>{it.label}</span>
              <span style={{ color: tone(t, it.color), opacity: p }}>{it.value.toLocaleString("en-AU")}{s.unit ?? ""}</span>
            </div>
            <div style={{ height: 54, background: "rgba(255,255,255,.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ width: `${(it.value / max) * 100 * p}%`, height: "100%", background: tone(t, it.color), borderRadius: 12 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const List: React.FC<{ s: Extract<Shot, { type: "list" }>; t: Theme }> = ({ s, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: 900 }}>
      {s.title && <div style={{ fontFamily: t.font, fontWeight: 800, fontSize: 68, color: t.text, marginBottom: 50, textAlign: "center" }}>{s.title}</div>}
      {s.items.map((it, i) => {
        const p = spring({ frame: f - (0.3 + i * 0.6) * fps, fps, config: { damping: 15 } });
        const mark = s.style === "cross" ? "✕" : s.style === "number" ? `${i + 1}` : "✓";
        const c = s.style === "cross" ? t.danger : t.accent;
        return (
          <div key={i} style={{ display: "flex", gap: 30, alignItems: "center", marginBottom: 40, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
            <div style={{ minWidth: 90, height: 90, borderRadius: 45, background: c, color: onAccent(c), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.font, fontWeight: 900, fontSize: 50 }}>{mark}</div>
            <div style={{ fontFamily: t.font, fontWeight: 700, fontSize: 54, color: t.text, lineHeight: 1.2 }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

const Timeline: React.FC<{ s: Extract<Shot, { type: "timeline" }>; t: Theme }> = ({ s, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = s.items.length;
  const line = interpolate(f, [0, (0.3 + n * 0.5) * fps], [0, 100], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: 880, position: "relative" }}>
      {s.title && <div style={{ fontFamily: t.font, fontWeight: 800, fontSize: 64, color: t.text, marginBottom: 50, textAlign: "center" }}>{s.title}</div>}
      <div style={{ position: "relative", paddingLeft: 80 }}>
        <div style={{ position: "absolute", left: 28, top: 0, width: 8, height: `${line}%`, background: t.accent, borderRadius: 4 }} />
        {s.items.map((it, i) => {
          const p = spring({ frame: f - (0.3 + i * 0.5) * fps, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{ marginBottom: 46, opacity: p, position: "relative" }}>
              <div style={{ position: "absolute", left: -66, top: 14, width: 36, height: 36, borderRadius: 18, background: t.accent }} />
              <div style={{ fontFamily: "monospace", fontSize: 40, color: t.accent }}>{it.year}</div>
              <div style={{ fontFamily: t.font, fontWeight: 700, fontSize: 50, color: t.text }}>{it.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Quote: React.FC<{ s: Extract<Shot, { type: "quote" }>; t: Theme }> = ({ s, t }) => {
  const p = useIn(0);
  return (
    <div style={{ padding: "0 90px", opacity: p, transform: `scale(${0.94 + 0.06 * p})` }}>
      <div style={{ fontFamily: t.font, fontSize: 200, color: t.accent, lineHeight: 0.6 }}>“</div>
      <div style={{ fontFamily: t.font, fontWeight: 700, fontSize: 66, color: t.text, lineHeight: 1.25 }}>{s.text}</div>
      {s.by && <div style={{ fontFamily: "monospace", fontSize: 36, color: t.muted, marginTop: 30 }}>— {s.by}</div>}
    </div>
  );
};

// Two columns side by side: "them vs you", "before / after", "myth / fact".
const Compare: React.FC<{ s: Extract<Shot, { type: "compare" }>; t: Theme }> = ({ s, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const col = (c: typeof s.left, side: number) => {
    const head = spring({ frame: f - side * 0.25 * fps, fps, config: { damping: 15 } });
    const color = tone(t, c.color ?? (side ? "good" : "danger"));
    return (
      <div style={{ flex: 1, opacity: head, transform: `translateY(${(1 - head) * 40}px)` }}>
        <div style={{ background: color, color: onAccent(color), fontFamily: t.font, fontWeight: 900, fontSize: 50, padding: "16px 10px", borderRadius: 18, textAlign: "center", marginBottom: 34 }}>{c.label}</div>
        {c.items.map((it, i) => {
          // items alternate left/right so the eye reads row by row
          const p = spring({ frame: f - (0.6 + i * 0.7 + side * 0.35) * fps, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{ fontFamily: t.font, fontWeight: 700, fontSize: 44, lineHeight: 1.2, color: t.text, background: "rgba(255,255,255,.07)", borderLeft: `8px solid ${color}`, borderRadius: 12, padding: "18px 20px", marginBottom: 22, opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>{it}</div>
          );
        })}
      </div>
    );
  };
  return (
    <div style={{ width: 960 }}>
      {s.title && <div style={{ fontFamily: t.font, fontWeight: 800, fontSize: 64, color: t.text, marginBottom: 46, textAlign: "center" }}>{s.title}</div>}
      <div style={{ display: "flex", gap: 30 }}>{col(s.left, 0)}{col(s.right, 1)}</div>
    </div>
  );
};

// A phone text-message thread; each bubble pops in at its own time.
const Chat: React.FC<{ s: Extract<Shot, { type: "chat" }>; t: Theme }> = ({ s, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: 900, background: "#F2F2F7", borderRadius: 48, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
      <div style={{ background: "#E5E5EA", padding: "26px 0", textAlign: "center", fontFamily: t.font, fontWeight: 700, fontSize: 40, color: "#111" }}>{s.title ?? "Messages"}</div>
      <div style={{ padding: "36px 30px", display: "flex", flexDirection: "column", gap: 20, minHeight: 500 }}>
        {s.messages.map((m, i) => {
          const at = m.at ?? 0.3 + i * 1.1;
          const p = spring({ frame: f - at * fps, fps, config: { damping: 13, mass: 0.6 } });
          if (f < at * fps) return null;
          const me = m.from === "me";
          return (
            <div key={i} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "78%", background: me ? "#0A84FF" : "#E5E5EA", color: me ? "#fff" : "#111", fontFamily: "-apple-system, Helvetica, Arial, sans-serif", fontSize: 44, lineHeight: 1.25, padding: "18px 28px", borderRadius: 36, transform: `scale(${p})`, transformOrigin: me ? "right bottom" : "left bottom" }}>{m.text}</div>
          );
        })}
      </div>
    </div>
  );
};

// Kinetic type: big words that pop in one at a time, the highlight in the accent colour.
const Kinetic: React.FC<{ s: Extract<Shot, { type: "kinetic" }>; t: Theme; instant: boolean }> = ({ s, t, instant }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const per = s.per_word ?? 0.18;
  const words = s.text.split(/\s+/);
  const hl = s.highlight && s.text.includes(s.highlight) ? s.highlight.split(/\s+/) : [];
  // index range of the highlighted phrase inside the word list
  const hlStart = hl.length ? words.findIndex((_, i) => hl.every((h, j) => words[i + j] === h)) : -1;
  return (
    <div style={{ padding: "0 70px", textAlign: "center", lineHeight: 1.05 }}>
      {words.map((w, i) => {
        const p = instant ? 1 : spring({ frame: f - i * per * fps, fps, config: { damping: 11, mass: 0.5 } });
        const on = hlStart >= 0 && i >= hlStart && i < hlStart + hl.length;
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: t.font, fontWeight: 900, fontSize: 130, letterSpacing: -3, color: on ? t.accent : t.text, marginRight: 28, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 60}px) scale(${0.6 + 0.4 * p})`, textTransform: "uppercase" }}>{w}</span>
        );
      })}
    </div>
  );
};

// Renders one shot; `base` = the shot's start time (for stamp offsets).
export const ShotView: React.FC<{ s: Shot; t: Theme; base: number; cast?: Record<string, any> }> = ({ s, t, base, cast }) => {
  if (s.type === "scene") return <><Scene s={s} t={t} cast={cast} />{s.stamp && <StampMark s={s.stamp} t={t} base={base} />}<Credit text={s.credit} /></>;
  const isMedia = s.type === "media";
  const bg = isMedia ? (s as any).src : s.bg;
  let body: React.ReactNode = null;
  const d0 = base === 0 ? -1 : 0; // the hook frame is fully on screen from frame 0
  if (s.type === "title") body = <Headline text={s.text} highlight={s.highlight} t={t} size={100} delay={d0} />;
  if (s.type === "number") body = <Number_ s={s} t={t} />;
  if (s.type === "bars") body = <Bars s={s} t={t} />;
  if (s.type === "list") body = <List s={s} t={t} />;
  if (s.type === "timeline") body = <Timeline s={s} t={t} />;
  if (s.type === "quote") body = <Quote s={s} t={t} />;
  if (s.type === "compare") body = <Compare s={s} t={t} />;
  if (s.type === "chat") body = <Chat s={s} t={t} />;
  if (s.type === "kinetic") body = <Kinetic s={s} t={t} instant={base === 0} />;
  if (s.type === "media" && s.headline) body = <Headline text={s.headline} highlight={s.highlight} t={t} size={92} delay={base === 0 ? -1 : 0.1} />;
  return (
    <AbsoluteFill style={{ background: t.bg }}>
      {bg && (
        <Media src={bg} start={isMedia ? (s as any).start : 0} fit={isMedia ? (s as any).fit : "cover"}
          kenburns={isMedia ? (s as any).kenburns !== false : true} muted={isMedia ? (s as any).muted !== false : true}
          move={isMedia ? (s as any).move : undefined} focus={isMedia ? (s as any).focus : undefined}
          flicker={isMedia ? (s as any).flicker : false} rain={isMedia ? (s as any).rain : false}
          dim={isMedia ? ((s as any).headline ? 0.35 : 0) : 0.62} />
      )}
      {!bg && (
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.04) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.04) 2px, transparent 2px)`, backgroundSize: "90px 90px" }} />
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: isMedia ? "flex-start" : "center", paddingTop: isMedia ? 620 : 0 }}>
        <Label text={s.label} t={t} />
        {body}
      </AbsoluteFill>
      {s.stamp && <StampMark s={s.stamp} t={t} base={base} />}
      <Credit text={s.credit} />
    </AbsoluteFill>
  );
};
