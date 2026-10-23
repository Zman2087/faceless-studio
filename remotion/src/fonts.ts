// Fonts are bundled (no network needed at render time).
// Montserrat ships with the repo. To use your character's own font, drop a .woff2 into
// public/fonts/ and set theme.font = "My Font", theme.font_file = "fonts/my-font.woff2".
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import { continueRender, delayRender, staticFile } from "remotion";

const loaded = new Set<string>();
export const loadCustomFont = (family?: string, file?: string) => {
  if (!family || !file || loaded.has(family) || typeof FontFace === "undefined") return;
  loaded.add(family);
  const h = delayRender(`font ${family}`);
  const src = /^https?:/.test(file) ? file : staticFile(file);
  new FontFace(family, `url(${src})`).load()
    .then((f) => { (document as any).fonts.add(f); continueRender(h); })
    .catch(() => continueRender(h));
};
