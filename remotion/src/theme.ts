import { Theme } from "./types";

export const DEFAULT_THEME: Theme = {
  bg: "#0B1530",
  text: "#FFFFFF",
  muted: "#A9BCE0",
  accent: "#F2B544",
  danger: "#E5484D",
  good: "#3CCB7F",
  font: "Montserrat",
};

export const tone = (t: Theme, c?: string) =>
  c === "danger" ? t.danger : c === "good" ? t.good : c === "muted" ? t.muted : t.accent;

// Readable text on top of the accent colour.
export const onAccent = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#FFFFFF";
};
