// The spec format every agent writes and render.mjs renders.
// One spec = one video (a 10 s block, a full Short, or a talking clip with overlays).
// See ../SPEC.md for the full reference.

export type Theme = {
  bg: string; // page background
  text: string; // main text
  muted: string; // secondary text
  accent: string; // highlight pill, routes, stamps
  danger: string; // losses, warnings
  good: string; // gains
  font: string; // font family (Montserrat is bundled)
  font_file?: string; // optional .woff2 in public/ or a URL, for a custom font
};

export type Word = { w: string; s: number; e: number }; // word, start s, end s

export type Stamp = { text: string; at?: number; color?: "accent" | "danger" | "good"; y?: number };

type ShotBase = {
  at: number; // seconds from the start of the spec
  label?: string; // small mono kicker above the content
  stamp?: Stamp;
  bg?: string; // optional media background for card shots (image or video)
  credit?: string; // licence credit shown small in the corner when bg/src is used
  transition?: "fade" | "cut" | "slide" | "zoom" | "wipe"; // how this shot comes in (default fade)
};

export type TitleShot = ShotBase & { type: "title"; text: string; highlight?: string };
export type NumberShot = ShotBase & {
  type: "number";
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  caption?: string;
  color?: "accent" | "danger" | "good";
};
export type BarsShot = ShotBase & {
  type: "bars";
  title?: string;
  unit?: string;
  items: { label: string; value: number; color?: "accent" | "danger" | "good" | "muted" }[];
};
export type ListShot = ShotBase & { type: "list"; title?: string; items: string[]; style?: "tick" | "cross" | "number" };
export type TimelineShot = ShotBase & { type: "timeline"; title?: string; items: { year: string; text: string }[] };
export type QuoteShot = ShotBase & { type: "quote"; text: string; by?: string };
export type MediaShot = ShotBase & {
  type: "media";
  src: string; // mp4/webm/png/jpg: AI clip, footage, photo
  start?: number; // seconds into the source video
  fit?: "cover" | "contain";
  kenburns?: boolean; // slow zoom on photos
  move?: "push" | "pull" | "pan_left" | "pan_right" | "rise" | "fall" | "still"; // illustrated stills: the camera move (default push)
  focus?: { x: number; y: number }; // 0-1: the point the camera moves toward (default centre)
  flicker?: boolean; // a faint light flicker (streetlights, neon, a TV)
  rain?: boolean; // light rain streaks over the still
  muted?: boolean; // default true unless it is the talking clip
  headline?: string;
  highlight?: string;
};

export type CompareShot = ShotBase & {
  type: "compare";
  title?: string;
  left: { label: string; items: string[]; color?: "accent" | "danger" | "good" | "muted" };
  right: { label: string; items: string[]; color?: "accent" | "danger" | "good" | "muted" };
};
export type ChatShot = ShotBase & {
  type: "chat";
  title?: string; // contact name in the header
  messages: { from: "me" | "them"; text: string; at?: number }[]; // at = seconds after the shot starts
};
export type KineticShot = ShotBase & {
  type: "kinetic";
  text: string; // words pop in one by one
  highlight?: string; // exact word or phrase drawn in the accent colour
  per_word?: number; // seconds between words (default 0.18)
};

import type { SceneShot, CastMember } from "./scene/Scene";
export type { SceneShot, CastMember };
export type Shot = SceneShot | TitleShot | NumberShot | BarsShot | ListShot | TimelineShot | QuoteShot | MediaShot | CompareShot | ChatShot | KineticShot;

export type Overlay = {
  at: number;
  end?: number;
  type: "textover" | "stamp" | "headline" | "lowerthird" | "titlecard" | "choice" | "cameo" | "meter" | "routes" | "bubble";
  x?: number; tail?: number; // bubble: position of the balloon, tail position 0-1
  lanes?: { label: string; ending: string; type?: "got_away" | "caught"; steps: { part: number; key: string; label: string; pct?: number | null; best?: boolean; turning?: boolean }[] }[]; // routes: route reveal
  value?: number; // meter: 0-100 now
  from?: number; // meter: value at the end of last episode
  options?: { key: string; label: string }[]; // choice: the A/B options
  style?: "poster"; // titlecard/choice: the illustrated-series look (kicker, PART + big numeral, accent rule)
  kicker?: string; // titlecard poster: the small letter-spaced line above (e.g. the season title)
  size?: number; // titlecard poster: scale (default 1; about 0.6 on a 1280x720 thumbnail)
  align?: "left" | "right"; // titlecard poster: which side the title block sits
  number?: string; // titlecard poster: the part number drawn huge in the accent colour
  handles?: string[]; // cameo: buyer handles shown in-world
  text: string;
  highlight?: string;
  sub?: string;
  y?: number;
  color?: "accent" | "danger" | "good";
};

export type Spec = {
  sounds?: { src: string; at: number; volume?: number; bed?: boolean }[]; // sound effects / extra voice takes, placed by time; bed: true = background (sirens, crowd), ducked under the voice
  cast?: Record<string, CastMember>; // scene shots: the series cast (colour + outfit per character id)
  duration: number; // seconds
  width?: number;
  height?: number;
  fps?: number;
  theme?: Partial<Theme>;
  audio?: string; // narration / voice file
  audio_volume?: number;
  music?: string; // optional bed under the voice
  music_volume?: number;
  ambience?: string; // optional room tone / rain / city loop under everything
  ambience_volume?: number; // default 0.08
  duck?: number; // music and ambience drop to this share of their volume while someone speaks (default 0.6)
  grain?: boolean; // subtle film grain over the picture (illustrated parts)
  words?: Word[]; // per-word timings for burned-in captions
  captions?: { enabled?: boolean; words_per_chunk?: number; y?: number; case?: "sentence" | "upper" };
  shots: Shot[];
  overlays?: Overlay[];
  watermark?: string; // e.g. @handle
  ai_label?: boolean; // small "AI-generated" tag (off by default; platforms label via their own toggle)
};
