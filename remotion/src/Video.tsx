import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadCustomFont } from "./fonts";
import { Spec, Theme, Word, Overlay } from "./types";
import { DEFAULT_THEME, tone, onAccent } from "./theme";
import { ShotView, Headline, StampMark } from "./shots/Shots";

const resolve = (src: string) => (/^(https?:|data:)/.test(src) ? src : staticFile(src));

// Burned-in captions: groups words into short chunks, current word in the accent colour.
const Captions: React.FC<{ words: Word[]; t: Theme; per: number; y: number; upper: boolean; hide?: [number, number][] }> = ({ words, t, per, y, upper, hide = [] }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = f / fps;
  if (hide.some(([a, b]) => now >= a && now < b)) return null; // the vote card speaks for itself
  const clean = words.filter((w) => w.e > w.s && w.w.trim() && !/^\[.*\]$/.test(w.w.trim()));
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  for (const w of clean) {
    cur.push(w);
    const brk = /[.!?,;:]$/.test(w.w) || cur.length >= per;
    if (brk) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  const chunk = chunks.find((c, i) => now >= c[0].s - 0.05 && now < (chunks[i + 1]?.[0].s ?? c[c.length - 1].e + 0.4));
  if (!chunk) return null;
  const p = spring({ frame: f - chunk[0].s * fps, fps, config: { damping: 14, mass: 0.5 } });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, textAlign: "center", transform: `scale(${0.9 + 0.1 * p})` }}>
      {chunk.map((w, i) => {
        const on = now >= w.s && now < w.e + 0.05;
        const txt = upper ? w.w.toUpperCase() : w.w;
        return (
          <span key={i} style={{
            fontFamily: t.font, fontWeight: 900, fontSize: 78, lineHeight: 1.15, color: on ? t.accent : t.text,
            WebkitTextStroke: "3px rgba(0,0,0,.9)", paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,.6)", marginRight: 18,
          }}>{txt}</span>
        );
      })}
    </div>
  );
};

const OverlayView: React.FC<{ o: Overlay; t: Theme }> = ({ o, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const instant = o.at === 0; // anything on screen at 0 s is the hook frame: no fade-in
  const p = instant ? 1 : spring({ frame: f, fps, config: { damping: 15 } });
  if (o.type === "headline") return <AbsoluteFill style={{ top: o.y ?? 240, justifyContent: "flex-start" }}><Headline text={o.text} highlight={o.highlight} t={t} size={84} delay={instant ? -1 : 0} /></AbsoluteFill>;
  if (o.type === "stamp") return <StampMark s={{ text: o.text, color: o.color, y: o.y, at: 0 }} t={t} base={0} />;
  if (o.type === "lowerthird")
    return (
      <div style={{ position: "absolute", left: 60, bottom: o.y ?? 420, opacity: p, transform: `translateX(${(1 - p) * -80}px)` }}>
        <div style={{ background: tone(t, o.color), color: onAccent(tone(t, o.color)), fontFamily: t.font, fontWeight: 800, fontSize: 52, padding: "14px 26px", borderRadius: 14, display: "table" }}>{o.text}</div>
        {o.sub && <div style={{ display: "table", marginTop: 10, background: "rgba(0,0,0,.65)", color: "#fff", fontFamily: t.font, fontWeight: 600, fontSize: 38, padding: "10px 22px", borderRadius: 12 }}>{o.sub}</div>}
      </div>
    );
  if (o.type === "titlecard") {
    // The recurring series title (the thumbnail look): huge stacked caps, one line in the accent colour, a part pill.
    const lines = o.text.split("|").map((x) => x.trim());
    return (
      <div style={{ position: "absolute", left: 50, right: 50, top: o.y ?? 150, textAlign: "center", transform: `scale(${0.85 + 0.15 * p})`, opacity: p }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: t.font, fontWeight: 900, fontSize: i === 1 ? 150 : 104, lineHeight: 1.0, letterSpacing: -2, textTransform: "uppercase",
            color: l === o.highlight || i === 1 ? t.accent : t.text, WebkitTextStroke: "5px rgba(0,0,0,.85)", paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,.6)" }}>{l}</div>
        ))}
        {o.sub && <div style={{ display: "inline-block", marginTop: 26, background: t.accent, color: onAccent(t.accent), fontFamily: t.font, fontWeight: 900, fontSize: 56, padding: "8px 30px", borderRadius: 14, transform: "rotate(-3deg)", textTransform: "uppercase" }}>{o.sub}</div>}
      </div>
    );
  }
  if (o.type === "choice") {
    // End-of-episode vote card. text = the dilemma, options = [{key:"A", label}, {key:"B", label}], sub = the call to comment.
    const opts = o.options || [];
    return (
      <AbsoluteFill style={{ background: `rgba(0,0,0,${0.72 * p})`, alignItems: "center", justifyContent: "center", padding: "0 70px" }}>
        <div style={{ fontFamily: "monospace", fontSize: 36, letterSpacing: 8, color: t.accent, marginBottom: 30, opacity: p }}>YOU DECIDE</div>
        <div style={{ fontFamily: t.font, fontWeight: 900, fontSize: 82, lineHeight: 1.1, color: t.text, textAlign: "center", marginBottom: 60, opacity: p }}>{o.text}</div>
        {opts.map((op, i) => {
          const q = spring({ frame: f - (0.35 + i * 0.25) * fps, fps, config: { damping: 13 } });
          const c = i === 0 ? t.accent : t.danger;
          return (
            <div key={i} style={{ width: "100%", display: "flex", alignItems: "center", gap: 30, background: "rgba(255,255,255,.08)", border: `5px solid ${c}`, borderRadius: 26, padding: "26px 34px", marginBottom: 34, opacity: q, transform: `translateX(${(1 - q) * (i ? 120 : -120)}px)` }}>
              <div style={{ minWidth: 110, height: 110, borderRadius: 22, background: c, color: onAccent(c), fontFamily: t.font, fontWeight: 900, fontSize: 78, display: "flex", alignItems: "center", justifyContent: "center" }}>{op.key}</div>
              <div style={{ fontFamily: t.font, fontWeight: 800, fontSize: 58, color: t.text, lineHeight: 1.15 }}>{op.label}</div>
            </div>
          );
        })}
        {o.sub && <div style={{ marginTop: 30, fontFamily: t.font, fontWeight: 800, fontSize: 52, color: t.text, opacity: interpolate(f, [0.9 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{o.sub}</div>}
      </AbsoluteFill>
    );
  }
  if (o.type === "cameo") {
    // Paid cameo handles shown in-world (a witness list, a contacts screen, a credits roll). label = what the list is.
    const hs = o.handles || [];
    return (
      <div style={{ position: "absolute", right: 50, top: o.y ?? 380, width: 560, background: "rgba(10,10,12,.82)", border: `3px solid ${t.accent}`, borderRadius: 18, padding: "24px 28px", opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
        <div style={{ fontFamily: "monospace", fontSize: 26, letterSpacing: 4, color: t.accent, marginBottom: 14, textTransform: "uppercase" }}>{o.text}</div>
        {hs.map((h, i) => {
          const on = f > (0.3 + i * 0.22) * fps;
          return <div key={i} style={{ fontFamily: "monospace", fontSize: 38, color: "#fff", lineHeight: 1.45, opacity: on ? 1 : 0 }}>{String(i + 1).padStart(2, "0")}  {h}</div>;
        })}
      </div>
    );
  }
  if (o.type === "meter") {
    // A running stake carried across episodes (e.g. SUSPICION 62%): animates from `from` to `value`.
    const v0 = o.from ?? 0, v1 = o.value ?? 0;
    const k = interpolate(f, [0.2 * fps, 1.4 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });
    const v = v0 + (v1 - v0) * k;
    const c = tone(t, o.color ?? "danger");
    return (
      <div style={{ position: "absolute", left: 60, right: 60, top: o.y ?? 1560, opacity: p }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 34, letterSpacing: 4, color: "#fff", marginBottom: 12, textShadow: "0 2px 8px #000" }}>
          <span>{o.text.toUpperCase()}</span><span style={{ color: c, fontWeight: 700 }}>{Math.round(v)}%{v1 > v0 && k > 0.95 ? `  ▲${Math.round(v1 - v0)}` : ""}</span>
        </div>
        <div style={{ height: 30, background: "rgba(255,255,255,.15)", borderRadius: 15, overflow: "hidden", border: "2px solid rgba(255,255,255,.25)" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", background: c, borderRadius: 15 }} />
        </div>
      </div>
    );
  }
  if (o.type === "routes") {
    // Route reveal: the audience's route next to the perfect run, one row per part, revealed in order.
    const lanes = o.lanes || [];
    const rows = Math.max(0, ...lanes.map((l) => l.steps.length));
    const per = Math.min(1.6, Math.max(0.6, ((o.end ?? 30) - o.at - 4) / Math.max(1, rows)));
    const rowH = Math.min(132, 1150 / Math.max(1, rows));
    return (
      <AbsoluteFill style={{ background: `rgba(6,6,10,${0.97 * p})`, padding: "150px 44px 80px", flexDirection: "column", gap: 26 }}>
        <div style={{ fontFamily: t.font, fontWeight: 900, fontSize: 64, color: t.text, textAlign: "center", lineHeight: 1.1 }}>{o.text}</div>
        {o.sub && <div style={{ fontFamily: "monospace", fontSize: 24, color: t.muted, textAlign: "center", marginTop: -10 }}>{o.sub}</div>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${lanes.length}, 1fr)`, gap: 22 }}>
          {lanes.map((l, li) => (
            <div key={li} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 5, color: li === 0 ? t.text : t.good, textTransform: "uppercase", textAlign: "center" }}>{l.label}</div>
              {Array.from({ length: rows }).map((_, ri) => {
                const x = l.steps[ri];
                const q = spring({ frame: f - (0.4 + ri * per + li * 0.15) * fps, fps, config: { damping: 15 } });
                if (!x) return <div key={ri} style={{ height: rowH }} />;
                const c = x.turning ? t.danger : x.best ? t.good : t.muted;
                return (
                  <div key={ri} style={{ height: rowH, display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,.06)", border: `3px solid ${c}`, borderRadius: 16, padding: "0 16px", opacity: q, transform: `translateY(${(1 - q) * 24}px)` }}>
                    <div style={{ fontFamily: "monospace", fontSize: 24, color: t.muted, minWidth: 42 }}>P{x.part}</div>
                    <div style={{ minWidth: 58, height: 58, borderRadius: 12, background: c, color: onAccent(c), fontFamily: t.font, fontWeight: 900, fontSize: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.key}</div>
                    <div style={{ fontFamily: t.font, fontWeight: 700, fontSize: Math.min(36, rowH * 0.3), color: t.text, lineHeight: 1.15, flex: 1 }}>
                      {x.label}{x.pct != null ? <span style={{ color: t.muted, fontWeight: 600 }}> · {x.pct}%</span> : null}
                    </div>
                    {x.turning ? <div style={{ fontFamily: t.font, fontWeight: 900, fontSize: 40, color: t.danger }}>✕</div> : null}
                  </div>
                );
              })}
              {(() => {
                const q = spring({ frame: f - (0.6 + rows * per + li * 0.3) * fps, fps, config: { damping: 11 } });
                const c = l.type === "caught" ? t.danger : t.good;
                return <div style={{ marginTop: 6, background: c, color: onAccent(c), fontFamily: t.font, fontWeight: 900, fontSize: 40, textAlign: "center", padding: "14px 10px", borderRadius: 16, textTransform: "uppercase", opacity: q, transform: `scale(${0.8 + 0.2 * q})` }}>{l.ending}</div>;
              })()}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  if (o.type === "bubble") {
    // A character speaking in their own voice: a comic speech balloon with the speaker's name.
    const pop = instant ? 1 : spring({ frame: f, fps, config: { damping: 9, mass: 0.5 } });
    const x = o.x ?? 540, y = o.y ?? 420, shout = /!/.test(o.text) && o.text === o.text.toUpperCase();
    return (
      <div style={{ position: "absolute", left: Math.max(40, Math.min(x - 300, 1080 - 640)), top: y, width: 600, transform: `scale(${0.6 + 0.4 * pop}) rotate(${shout ? -3 : 0}deg)`, transformOrigin: "50% 100%", opacity: pop }}>
        {o.sub && <div style={{ fontFamily: "monospace", fontSize: 26, letterSpacing: 4, color: tone(t, o.color), textTransform: "uppercase", marginBottom: 8, marginLeft: 18 }}>{o.sub}</div>}
        <div style={{ position: "relative", background: "#fff", color: "#111", border: "6px solid #111", borderRadius: shout ? 12 : 44, padding: "24px 30px", fontFamily: t.font, fontWeight: 900, fontSize: shout ? 64 : 52, lineHeight: 1.1, textAlign: "center", boxShadow: "8px 8px 0 rgba(0,0,0,.5)" }}>
          {o.text}
          <div style={{ position: "absolute", left: (o.tail ?? 0.5) * 100 + "%", bottom: -46, width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderTop: "46px solid #111", transform: "translateX(-50%)" }} />
          <div style={{ position: "absolute", left: (o.tail ?? 0.5) * 100 + "%", bottom: -34, width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: "34px solid #fff", transform: "translateX(-50%)" }} />
        </div>
      </div>
    );
  }
  // textover: the TikTok-style text box used on silent b-roll
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: o.y ?? 300, display: "flex", justifyContent: "center", opacity: p }}>
      <div style={{ background: "#FFFFFF", color: "#111", fontFamily: t.font, fontWeight: 700, fontSize: 56, lineHeight: 1.25, padding: "22px 30px", borderRadius: 18, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}>
        {o.text}
      </div>
    </div>
  );
};

export const Video: React.FC<Spec> = (spec) => {
  const { fps } = useVideoConfig();
  const t: Theme = { ...DEFAULT_THEME, ...(spec.theme || {}) };
  loadCustomFont(spec.theme?.font, (spec.theme as any)?.font_file);
  t.font = `"${t.font}", Montserrat, sans-serif`;
  const shots = [...(spec.shots || [])].sort((a, b) => a.at - b.at);
  const total = Math.round(spec.duration * fps);
  const sceneLed = (spec.shots || []).some((x) => x.type === "scene"); // drawn scenes: captions sit below the ground line, clear of the cast
  const cap = { enabled: true, words_per_chunk: 3, y: sceneLed ? 1660 : 1280, case: "sentence", ...(spec.captions || {}) };
  return (
    <AbsoluteFill style={{ background: t.bg }}>
      {shots.map((s, i) => {
        const from = Math.round(s.at * fps);
        const to = i + 1 < shots.length ? Math.round(shots[i + 1].at * fps) : total;
        if (to <= from) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={to - from} name={`${i + 1}. ${s.type}`}>
            <Enter kind={s.transition ?? "fade"} first={i === 0}><ShotView s={s} t={t} base={s.at} cast={spec.cast} /></Enter>
          </Sequence>
        );
      })}
      {(spec.overlays || []).map((o, i) => {
        const from = Math.round(o.at * fps);
        const to = Math.round((o.end ?? spec.duration) * fps);
        return to > from ? <Sequence key={"o" + i} from={from} durationInFrames={to - from} name={`overlay ${o.type}`}><OverlayView o={o} t={t} /></Sequence> : null;
      })}
      {cap.enabled && spec.words && spec.words.length > 0 && <Captions words={spec.words} t={t} per={cap.words_per_chunk!} y={cap.y!} upper={cap.case === "upper"}
        hide={(spec.overlays || []).filter((o) => o.type === "choice").map((o) => [o.at, o.end ?? spec.duration] as [number, number])} />}
      {spec.watermark && <div style={{ position: "absolute", right: 40, top: 60, fontFamily: t.font, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,.7)" }}>{spec.watermark}</div>}
      {spec.ai_label !== false && <div style={{ position: "absolute", left: 40, top: 60, fontFamily: "monospace", fontSize: 22, color: "rgba(255,255,255,.55)" }}>AI-generated</div>}
      {spec.audio && <Audio src={resolve(spec.audio)} volume={spec.audio_volume ?? 1} />}
      {spec.music && <Audio src={resolve(spec.music)} volume={spec.music_volume ?? 0.12} loop />}
      {(spec.sounds || []).map((x, i) => <Sequence key={"snd" + i} from={Math.round(x.at * fps)} name={`sound ${i + 1}`}><Audio src={resolve(x.src)} volume={x.volume ?? 1} /></Sequence>)}
    </AbsoluteFill>
  );
};

// How a shot comes in (the first shot is on screen from frame 0: the hook frame).
// fade = 4-frame cross-fade, slide = pushes in from the right, zoom = punches in, wipe = reveals left to right.
const Enter: React.FC<{ kind: string; first: boolean; children: React.ReactNode }> = ({ kind, first, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (first || kind === "cut") return <AbsoluteFill>{children}</AbsoluteFill>;
  if (kind === "fade") return <AbsoluteFill style={{ opacity: interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
  const p = spring({ frame: f, fps, config: { damping: 20, mass: 0.6 } });
  if (kind === "slide") return <AbsoluteFill style={{ transform: `translateX(${(1 - p) * 100}%)` }}>{children}</AbsoluteFill>;
  if (kind === "zoom") return <AbsoluteFill style={{ transform: `scale(${1.25 - 0.25 * p})`, opacity: Math.min(1, p * 3) }}>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{children}</AbsoluteFill>;
};
