---
name: animated-video
description: Make animated, motion-graphics short videos in Remotion — faceless explainers, kinetic-type hooks, text-message stories, comparisons, charts and counters, or animated scenes cut between AI character clips. Use when the owner asks for an "animated video", "motion graphics", "explainer", "faceless video", "kinetic text", "text-message story", "make the numbers animate", or when a post's format is "story" or "explainer" (every faceless channel). Also covers adding a new scene type to the engine when the built-in ones can't show an idea.
---

# Animated video

Everything here renders in `remotion/` for zero credits. Two levels — always try level 1 first:

1. **Compose built-in scenes** in a spec (minutes, no code).
2. **Add a new scene type** to the engine when an idea genuinely needs one (code, tested, then reusable by every agent).

Before rendering locally: if `remotion/node_modules` is missing, run `cd remotion && npm ci`
(the first render also downloads Remotion's headless Chrome, ~170 MB, once).

## Level 1 — the scene kit

| scene (`shots[].type`) | best for | key fields |
|---|---|---|
| `kinetic` | the hook, a punchline | `text`, `highlight`, `per_word` (0.18) — words pop in one by one |
| `title` | a single bold line | `text` ≤ 6 words, `highlight` |
| `number` | one striking figure | `value`, `prefix`, `suffix`, `decimals`, `caption`, `color` — counts up |
| `bars` | how things compare in size | `title`, `unit`, `items[{label,value,color}]` |
| `compare` | them vs you, myth vs fact, before/after | `title`, `left{label,items,color}`, `right{…}` |
| `list` | "3 things", do/don't | `items`, `style` tick/cross/number |
| `timeline` | how it happened | `items[{year,text}]` |
| `chat` | a story told in texts | `title` (contact), `messages[{from: me/them, text, at}]` |
| `quote` | a sourced line | `text`, `by` |
| `media` | b-roll, a photo, the AI clip | `src`, `kenburns`, `headline`, `fit` |

Every scene takes `label` (kicker), `stamp` (rubber-stamp number), `bg` (dimmed photo/video behind
it, with `credit`) and `transition` (`fade` default, `cut`, `slide`, `zoom`, `wipe`). Overlays
(`headline`, `textover`, `lowerthird`, `stamp`) sit on top of any scene. Full reference: `remotion/SPEC.md`.
A worked example of every new scene: `remotion/examples/animated.json`.

### Recipes
- **Faceless explainer (20–40 s)**: `kinetic` hook → `number` → `bars`/`compare` → `list` → `title` payoff that echoes the hook. Voice-over as `audio`, captions from `words`, a quiet `music` bed at 0.08–0.12.
- **Text-message story**: `kinetic` hook ("She replied at 3am") → one `chat` shot per exchange (`at` spaced 0.8–1.4 s, timed to the narration) → `title` twist. Keep each bubble ≤ 10 words.
- **Animated insert in a talking video**: CLIP_1 … `number` or `compare` for 2–3 s on the beat that says it (`transition: "zoom"`) … back to CLIP_1 with `start` set to where the clip should resume.
- **Myth vs fact**: `compare` with `left.color: "danger"`, `right.color: "good"`, then a `stamp` "FALSE" on the next `title`.

Plan the beats with `video-script` (`tools/beats.mjs` times scenes to the voice), then:
```bash
cd remotion
node render.mjs job/spec.json --validate
node render.mjs job/spec.json job/final.mp4 --preview job/check.jpg --at 0.1,<each scene's middle>,<end-1>
```
**Always look at the preview strip** before delivering: hook fully drawn at 0.1 s, nothing clipped
off the edges, no text overlapping, the accent colour readable, the AI-generated tag and watermark there.

### Style rules
- Brand from `settings.brand` (spec `theme`): one accent colour, used for the one thing that matters in each scene.
- ≤ 7 words per headline, ≤ 12 per textover, ≤ 4 items per list/compare column (the phone screen is small).
- A scene stays up at least 1.5 s per line of text in it.
- Numbers must match `citations`; never animate a figure you didn't source.
- No brand logos, no real people's photos, no screenshots of real chats.

## Level 2 — a new scene type

Only when no combination above can show the idea (e.g. a map route, a progress ring, a split-screen reaction).

1. `src/types.ts`: add `XShot = ShotBase & { type: "x"; … }` and add it to the `Shot` union.
2. `src/shots/Shots.tsx`: write the component next to the others — animate with `spring`/`interpolate` from `useCurrentFrame()` (never CSS animations or `Math.random`: renders must be deterministic), use `t.font`, `t.accent`, `tone(t, color)`, size for 1080×1920, then add one `if (s.type === "x") body = …` line in `ShotView`. If it's on screen at 0 s (`base === 0`) draw it fully with no entrance.
3. `render.mjs`: add `"x"` to `types` and validation for its required fields (the checker agent relies on these messages).
4. `SPEC.md` + the table above: document it. Add it to `examples/animated.json`.
5. Test: `npx tsc --noEmit -p .`, `node render.mjs examples/animated.json out/animated.mp4 --preview out/animated.jpg --at …` and look at it.
