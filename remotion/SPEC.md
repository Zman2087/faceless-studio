# Video spec reference

Every video the agents make is a JSON **spec** rendered by `render.mjs`. One spec can be a single
10-second block, a whole Short, or a Higgsfield talking clip with captions and text on top.

```bash
node render.mjs spec.json out.mp4                         # render
node render.mjs spec.json out.mp4 --preview strip.jpg --at 0.2,3,6,9   # + contact sheet to check
node render.mjs spec.json --validate                      # check only (the script checker uses this)
node render.mjs spec.json out.mp4 --words words.json      # add per-word captions from a file
```

Local paths in a spec are relative to the spec file. URLs (https) work too.

## Top level

| field | type | notes |
|---|---|---|
| `duration` | seconds | required |
| `width` / `height` / `fps` | numbers | default 1080 × 1920 @ 30 (9:16) |
| `theme` | object | `bg`, `text`, `muted`, `accent`, `danger`, `good`, `font`, `font_file`. Comes from the channel's `settings.brand`. |
| `audio` | path/URL | narration or the character's voice. Leave it out for a talking clip whose own audio you keep (`muted: false`). |
| `music` / `music_volume` | path, 0-1 | optional bed (default 0.12) |
| `words` | `[{w,s,e}]` | per-word timings → burned-in captions. Make it with `tools/words-from-transcript.mjs` from an ElevenLabs Scribe or Whisper transcript. |
| `captions` | object | `enabled` (true), `words_per_chunk` (3), `y` (1280), `case` (`sentence`/`upper`) |
| `shots` | array | the picture, in time order; `shots[0].at` must be `0` |
| `overlays` | array | text on top of whatever shot is showing, each with `at` and optional `end` |
| `watermark` | string | e.g. `@handle`, top right |
| `ai_label` | bool | small "AI-generated" tag top left (default **on** — keep it on) |

## Shots

Every shot has `at` (seconds from the start of the spec; strictly increasing) and may have:
`label` (small kicker), `stamp` `{text ≤ 7 chars, at (s after the shot starts), color: accent|danger|good, y}`,
`bg` (photo/video behind a card shot, dimmed), `credit` (licence line, bottom left),
`transition` (how the shot comes in: `fade` default, `cut`, `slide`, `zoom`, `wipe`; ignored on shot 0).

| type | fields | use |
|---|---|---|
| `media` | `src`, `start`, `fit` (cover/contain), `kenburns`, `muted` (default true), `headline`, `highlight` | the Higgsfield clip, b-roll, a photo |
| `title` | `text` (≤ 6 words), `highlight` (exact substring) | a bold line with one phrase in the accent pill |
| `number` | `value`, `prefix`, `suffix`, `decimals`, `caption`, `color` | counts up from 0 |
| `bars` | `title`, `unit`, `items[{label,value,color}]` | comparisons |
| `list` | `title`, `items[]`, `style` (tick/cross/number) | ticked or crossed lists |
| `timeline` | `title`, `items[{year,text}]` | dates |
| `quote` | `text`, `by` | a line someone actually said (sourced) |
| `compare` | `title`, `left{label,items[],color}`, `right{…}` | them vs you, myth vs fact, before/after |
| `chat` | `title`, `messages[{from: me/them, text, at}]` | a text-message thread; `at` = s after the shot starts |
| `kinetic` | `text`, `highlight`, `per_word` (0.18) | big words popping in one by one (drawn fully if it's shot 0) |

**House rule — the first second:** most people scroll with the sound off. Whatever is on screen
at 0 s (shot 0 + any overlay with `at: 0`) is drawn fully, with no fade-in: put the hook there.

## Overlays

| type | fields | looks like |
|---|---|---|
| `headline` | `text`, `highlight`, `y` | big bold line with an accent pill |
| `textover` | `text`, `y` | white TikTok-style text box (silent b-roll) |
| `lowerthird` | `text`, `sub`, `color`, `y` | name/CTA tag bottom left |
| `stamp` | `text` ≤ 7 chars, `color`, `y` | rotated rubber-stamp number |
| `titlecard` | `text` (lines split with a pipe character; line 2 in the accent colour), `sub` (e.g. "Part 3"), `y` | the series' recurring thumbnail title — use it at `at: 0` |
| `choice` | `text` (≤ 70 chars), `options[{key, label ≤ 40}]` (2-3), `sub` (e.g. "Comment A or B") | the end-of-episode vote card; captions hide while it's up |
| `cameo` | `text` (what the list is, in-world), `handles[]` (1-8, `@handle`) | paid cameo handles shown as part of the scene (a witness list, a contacts screen) |
| `meter` | `text` (label), `from`, `value` (0-100), `color` | a stake carried across episodes (SUSPICION 62% ▲42) |
| `routes` | `text` (headline), `sub` (legend), `lanes[{label, ending, type, steps[{part, key, label, pct, best, turning}]}]` (1-2 lanes, ≤ 12 steps) | the season's Route Reveal board: the audience's route next to the perfect run; made by `scripts/story-route-compare.mjs --spec` |

## Tools

- `tools/words-from-transcript.mjs in.json words.json` — ElevenLabs/Whisper transcript → words.json (drops `[pause]`-style tags)
- `tools/beats.mjs beats.json spec.json [--words words.json]` — beat sheet (said + seen, beat by beat) → spec timed to the voice (see the video-script skill)
- `tools/edit.mjs probe|trim|reframe|jumpcut|loudnorm|qc …` — clip editing and the delivery check (see the video-edit skill)
- `tools/stitch.sh out.mp4 a.mp4 b.mp4 …` — join blocks
- `tools/cover.sh video.mp4 cover.png 1.2` — 1080×1920 cover frame

## Examples

`examples/explainer.json` (faceless 10 s block), `examples/talking-clip.json` (an AI clip with a
hook headline, captions and a follow CTA), `examples/animated.json` (kinetic, chat, compare and
transitions), `examples/story-scene.json` (a stick-figure story part: scene shots, speech bubbles, A/B/C choice card), `examples/route-reveal.json` (the season-end Route Reveal board) and `examples/beats.json` (a beat sheet for `tools/beats.mjs`). `npm test` renders them with stand-in media.
