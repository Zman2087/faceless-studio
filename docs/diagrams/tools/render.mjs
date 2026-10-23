#!/usr/bin/env node
// Diagrams for this repo are Excalidraw files with an SVG export next to them (never ASCII art).
//
//   node render.mjs ../my-flow.diagram.json   sketch → ../my-flow.excalidraw + ../my-flow.svg
//   node render.mjs ../architecture.excalidraw      re-export an edited .excalidraw → .svg
//   node render.mjs --all                          every *.diagram.json and *.excalidraw in docs/diagrams
//
// A sketch (*.diagram.json) is quick to write by hand or by Claude:
// { "title": "…", "groups": [{ "x","y","w","h","label" }],
//   "nodes":  [{ "id","x","y","w","h","text","color": "yellow|blue|green|orange|purple|grey|teal|red|white" }],
//   "arrows": [{ "from","to","label","dashed","color": "red|grey" }], "notes": [{ "x","y","text","size" }] }
// Setup once: cd docs/diagrams/tools && npm install   (uses a Chromium from Playwright or CHROME=/path)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIAGRAMS = path.resolve(HERE, "..");
const CACHE = path.join(HERE, ".cache");
const args = process.argv.slice(2);
let files = args.filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
if (args.includes("--all")) files = fs.readdirSync(DIAGRAMS).filter((f) => f.endsWith(".diagram.json") || (f.endsWith(".excalidraw") && !fs.existsSync(path.join(DIAGRAMS, f.replace(/\.excalidraw$/, ".diagram.json"))))).map((f) => path.join(DIAGRAMS, f));
if (!files.length) { console.error("usage: render.mjs <file.diagram.json|file.excalidraw>… | --all"); process.exit(2); }

// ---------- bundle Excalidraw's exporter for the browser (once) ----------
fs.mkdirSync(CACHE, { recursive: true });
const bundle = path.join(CACHE, "excalidraw.js");
if (!fs.existsSync(bundle)) {
  fs.writeFileSync(path.join(CACHE, "entry.js"), `import { exportToSvg, convertToExcalidrawElements } from "@excalidraw/excalidraw";\nwindow.exportToSvg = exportToSvg; window.convertToExcalidrawElements = convertToExcalidrawElements;\n`);
  execFileSync(path.join(HERE, "node_modules/.bin/esbuild"), [path.join(CACHE, "entry.js"), "--bundle", "--format=iife", `--outfile=${bundle}`, "--loader:.css=empty", "--loader:.ttf=file", "--loader:.woff2=file", "--asset-names=assets/[name]", "--define:process.env.NODE_ENV=\"production\"", "--log-level=error"], { cwd: HERE, stdio: "inherit" });
}

// ---------- serve Excalidraw's fonts locally so the SVGs embed them (no network needed) ----------
const fontRoot = path.join(HERE, "node_modules/@excalidraw/excalidraw/dist/prod");
const srv = http.createServer((q, r) => {
  const f = path.join(fontRoot, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(fontRoot) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "access-control-allow-origin": "*", "content-type": f.endsWith(".woff2") ? "font/woff2" : "application/octet-stream" });
  fs.createReadStream(f).pipe(r);
}).listen(0);
await new Promise((ok) => srv.on("listening", ok));

const { chromium } = await import("playwright-core");
const pw = ["/opt/pw-browsers", "/ms-playwright", path.join(process.env.HOME || "", ".cache/ms-playwright")].filter(fs.existsSync)
  .flatMap((r) => fs.readdirSync(r).filter((d) => /^chromium-\d/.test(d)).flatMap((d) => [`${r}/${d}/chrome-linux64/chrome`, `${r}/${d}/chrome-linux/chrome`, `${r}/${d}/chrome-mac/Chromium.app/Contents/MacOS/Chromium`]));
const exe = [process.env.CHROME, ...pw, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) => p && fs.existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
await page.setContent(`<html><body><script>window.EXCALIDRAW_ASSET_PATH="http://127.0.0.1:${srv.address().port}/";</script></body></html>`);
await page.addScriptTag({ path: bundle });

// ---------- sketch → Excalidraw skeleton ----------
const COLORS = { yellow: "#ffec99", blue: "#a5d8ff", green: "#b2f2bb", orange: "#ffd8a8", purple: "#d0bfff", grey: "#e9ecef", teal: "#96f2d7", red: "#ffc9c9", white: "#ffffff" };
function skeleton(d) {
  const els = [];
  if (d.title) els.push({ type: "text", x: 40, y: 14, text: d.title, fontSize: 34 });
  for (const g of d.groups || []) {
    els.push({ type: "rectangle", x: g.x, y: g.y, width: g.w, height: g.h, strokeStyle: "dashed", strokeColor: "#868e96", backgroundColor: "#f8f9fa", fillStyle: "solid", roundness: { type: 3 } });
    if (g.label) els.push({ type: "text", x: g.x + 18, y: g.y + 12, text: g.label, fontSize: 22, strokeColor: "#495057" });
  }
  for (const n of d.nodes || []) els.push({ id: n.id, type: n.shape || "rectangle", x: n.x, y: n.y, width: n.w || 240, height: n.h || 72, backgroundColor: COLORS[n.color] || n.color || COLORS.blue, fillStyle: "solid", roundness: { type: 3 }, strokeStyle: n.dashed ? "dashed" : "solid", label: { text: n.text, fontSize: n.size || 18 } });
  for (const a of d.arrows || []) els.push({ type: "arrow", x: 0, y: 0, start: { id: a.from }, end: { id: a.to }, strokeStyle: a.dashed ? "dashed" : "solid", strokeColor: a.color === "red" ? "#e03131" : a.color === "grey" ? "#868e96" : "#1e1e1e", ...(a.label && { label: { text: a.label, fontSize: 15 } }) });
  for (const t of d.notes || []) els.push({ type: "text", x: t.x, y: t.y, text: t.text, fontSize: t.size || 16, strokeColor: t.color || "#495057" });
  return els;
}

for (const file of files) {
  const isSketch = file.endsWith(".diagram.json");
  const base = file.replace(/\.diagram\.json$|\.excalidraw$/, "");
  const src = JSON.parse(fs.readFileSync(file, "utf8"));
  const scene = isSketch
    ? { type: "excalidraw", version: 2, source: "https://excalidraw.com", elements: await page.evaluate((sk) => window.convertToExcalidrawElements(sk, { regenerateIds: false }), skeleton(src)), appState: { viewBackgroundColor: "#ffffff", gridSize: 20 }, files: {} }
    : src;
  if (isSketch) fs.writeFileSync(base + ".excalidraw", JSON.stringify(scene, null, 2));
  const svg = await page.evaluate(async (sc) => (await window.exportToSvg({ elements: sc.elements, appState: { ...sc.appState, exportBackground: true, exportEmbedScene: false }, files: sc.files || {}, exportPadding: 16 })).outerHTML, scene);
  fs.writeFileSync(base + ".svg", svg);
  console.log(`DIAGRAM ${path.relative(process.cwd(), base)}.svg${isSketch ? " (+ .excalidraw)" : ""}`);
}
await browser.close();
srv.close();
