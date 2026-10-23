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
| `audio` / `audio_volume` | path/URL, 0-1 | narration or the character's voice. Leave it out for a talking clip whose own audio you keep (`muted: false`). |
| `music` / `music_volume` | path, 0-1 | optional bed (default 0.12) |
| `words` | `[{w,s,e}]` | per-word timings → burned-in captions. Make it with `tools/words-from-transcript.mjs` from an ElevenLabs Scribe or Whisper transcript. |
| `captions` | object | `enabled` (true), `words_per_chunk` (3), `y` (1280; 1660 when the spec has `scene` shots, below the ground line), `case` (`sentence`/`upper`) |
| `sounds` | `[{src, at, volume, bed}]` | sound effects or extra voice takes placed by time (`at` in seconds, `volume` 0-1, default 1): footsteps, a door, a hit. `bed: true` puts a background sound (sirens, crowd, wind) into the ducked music/ambience bed so it always sits under the narrator |
| `cast` | `{id: {color, outfit, name}}` | the series cast for `scene` shots: each character's accent colour and outfit (see Scene shots), so every shot draws them the same |
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
| `scene` | `set`, `time`, `camera`, `actors`, `props`, `fx`, … (below) | a drawn, animated stick-figure scene: story series parts |

## Scene shots (`type: "scene"`)

A set, a stick-figure cast that walks, runs and reacts, props, weather and light, under a moving
camera, all drawn in code (zero credits). The canvas is 1080 × 1920 with the ground line at y 1500;
`x` values run 0-1080 across the frame.

| field | notes |
|---|---|
| `set` | required: `lane`, `street`, `docks`, `station`, `interview`, `kitchen`, `road`, `rooftop`, `office`, `blank` |
| `time` | `night` (default), `dawn`, `day`: the palette for the whole shot |
| `text` | words for the set's own signs, boards and screens (the station board takes two lines split with a pipe) |
| `lit` | indexes of windows to light (on the lane, `[0]` is the lit window) |
| `camera` | `zoom: [from, to]` (default 1.04 → 1.09, a slow push), `x: [from, to]` and `y: [from, to]` (the point the camera centres on; default 540, 1190), `ease`: `inout` (default), `in`, `out`, `linear`. The move runs over the whole shot |
| `actors` | the cast in this shot (below) |
| `props` | objects in the set (below) |
| `fx` | any of `rain`, `fog`, `sirens`, `siren_rise` (a red-blue wash that builds over 6 s from its `fx_at`; scale it with the shot's `siren_level`, 0-1), `flicker`, `heartbeat`, `flash`, `letterbox`, `spotlight`, `dark`, `shake`, `streaks` (motion lines behind anyone moving; runners always get them) |
| `fx_at` | `{fx name: seconds}`: when an effect starts (default the start of the shot); `flash` fires once at that time |
| `spot` | index of the actor the `spotlight` follows (default 0) |
| `relative` | `true`: every time inside the shot (`then[].at`, `move.at`/`dur`, `enter_at`, `exit_at`, prop `at`, `fx_at`) is a fraction 0-1 of the shot's length, so it survives retiming to the real voice. The writer always uses this |
| `label`, `stamp`, `credit`, `transition` | as for every shot |
| `start_offset`, `shot_len` | set by `tools/render-long.mjs` when a shot spans two chunks (seconds already played, full length); never write them yourself |

**Actors**

| field | notes |
|---|---|
| `x` | required, 0-1080 |
| `cast` | an id from the spec's `cast` (the checker rejects unknown ids); or give `color` / `outfit` directly |
| `y`, `scale`, `facing` | feet position (default 1540), size (1), `right` (default) or `left` |
| `pose` | `stand` (default), `walk`, `run`, `crouch`, `kneel`, `point`, `phone`, `hold`, `handsup`, `sit`, `look_down`, `reach`, `shrug`, `lean`, `slumped`, `slumped_reach`, `kneel_reach` (kneeling, reaching forward), `kneel_hold` (kneeling, looking at what's in the hand), `pickup` (reaching to the ground), `frozen` (standing, both hands out a little: holding two things), `hand_mouth`, `look_up` |
| `expression` | `neutral` (default), `scared`, `angry`, `calm`, `shock`, `sad`, `smirk` |
| `item` | in the lead hand: `phone`, `knife`, `bag`, `envelope`, `badge`, `torch`, `mug`, `suitcase`, `none` |
| `item2` | in the other hand (same list), e.g. a phone in one hand and a knife in the other |
| `then` | `[{at, pose, expression?, item?, item2?, facing?}]`: changes during the shot, eased in |
| `move` | `{to, at, dur, gait}`: walk (`gait: "walk"`, default) or run (`"run"`) from `x` to `to`, starting at `at` (0) for `dur` (2 s, or 0.5 when relative); the figure faces the way it moves |
| `enter_at`, `exit_at` | fade in at / disappear at |
| `outfit` | costume accents, merged over the cast entry: `hood`, `cap`, `coat`, `tie`, `scrubs`, `glasses`, `gloves`, `lanyard` (booleans), `hair` (`short`, `bob`, `bun`, `long`, `silver`, `none`), `headphones` (`neck` or `on`), `pants` and `shoes` (colours: jeans and sneakers). Keep a character's look in the spec's `cast` so it's identical in every shot; override per shot only for real changes (headphones on, then round the neck) |
| `label` | a small name tag above the head |
| `glow` | a soft light on the figure |

**Props**: `type` (`ute`, `car`, `police`, `truck`, `boat`, `bin`, `drain`, `door`, `sign`, `screen`,
`phone`, `tape`, `chair`, `knife`, `bag`, `window`), `x`, `y` (default on the ground; `screen`/`phone` are
centred on `y`, default 600), `scale`, `flip`, `at` (appears at), `text` (a door number, a sign, a
number plate, the tape's words; on `screen` and `phone` the text types itself in). `window` is a
window that stays dark until `at`, then snaps on with a silhouette behind the glass: `w`, `h`, `skew`
(degrees, to sit on a wall in perspective; the lane's right-hand window is `x` 875, `y` 712, `w` 170,
`h` 236, `skew` -25), `figure` (`bun`, `short`, `none`), `gesture` (`hand_mouth`, `point`, `still`).

Short-form rules for story parts: the hook frame is the first frame (no fade from black); a new
framing every 2-3 s (a new shot per beat, or a punch-in via `camera.zoom`); keep faces above y 1500
on screen so captions (y 1660 in scene-led specs) never cover them; end on a framing that matches the
first shot so the video loops.

```json
{ "type": "scene", "at": 0, "set": "lane", "time": "night", "relative": true,
  "camera": { "zoom": [1.0, 1.25], "x": [540, 620] },
  "actors": [ { "cast": "you", "x": 300, "pose": "stand", "expression": "scared",
                "then": [{ "at": 0.5, "pose": "phone" }], "move": { "to": 800, "at": 0.7, "dur": 0.3, "gait": "run" } } ],
  "props": [ { "type": "police", "x": 900, "at": 0.6, "text": "POLICE" } ],
  "fx": ["rain", "sirens"], "fx_at": { "sirens": 0.6 } }
```

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
| `choice` | `text` (≤ 70 chars), `options[{key, label ≤ 40}]` (2-3), `sub` (e.g. "Comment A or B") | the end-of-episode vote card ("YOU DECIDE"); captions hide while it's up |
| `cameo` | `text` (what the list is, in-world), `handles[]` (1-8, each `@` + up to 30 letters, digits, `.` or `_`), `y` (380) | paid cameo handles shown as part of the scene (a witness list, a contacts screen) |
| `bubble` | `text` (the line), `sub` (the speaker's name), `x` (centre, 540), `y` (top, 420), `tail` (0-1 along the bottom, 0.5), `color` (name colour) | a character speaking in their own voice: a comic speech balloon. A line in capitals with "!" is drawn as a shout. `tools/beats.mjs` makes these from beats whose `speaker` isn't the narrator |
| `meter` | `text` (label), `from`, `value` (0-100), `color` | a running stake (SUSPICION 62% ▲42). Story series never use it: the mechanics stay hidden |
| `routes` | `text` (headline), `sub` (legend), `lanes[{label, ending, type, steps[{part, key, label, pct, best, turning}]}]` (1-2 lanes, ≤ 12 steps) | the season's Route Reveal board: the audience's route next to the perfect run; made by `scripts/story-route-compare.mjs --spec` |

## Tools

- `tools/words-from-transcript.mjs in.json words.json` — ElevenLabs/Whisper transcript → words.json (drops `[pause]`-style tags)
- `tools/beats.mjs beats.json spec.json [--words words.json]` — beat sheet (said + seen, beat by beat) → spec timed to the voice (see the video-script skill). Story parts add `cast`, `cast_names`, `titlecard {text, sub}` (title card at 0), `choice {text, options, sub, hold}` (vote card, held 3.5 s after the last word) and, per beat, `speaker` (a non-narrator speaker becomes a `bubble`, placed by `bubble {x, y, tail, color}`), `cameo {text, handles}` and `sound [{src, offset, volume}]` (→ `sounds`)
- `tools/voice-track.mjs takes.json voice.mp3 [--gap 0.25]` — join the narrator's takes and the characters' lines in script order (`[{file, speaker, gap?}]`), loudness-matched, ready to transcribe
- `tools/render-long.mjs spec.json out.mp4 [--chunk 25] [--only N]` — render a 90-150 s part in chunks split at shot boundaries (overlays, words and sounds re-timed into each), stitch them and lay the full audio back
- `tools/edit.mjs probe|trim|reframe|jumpcut|loudnorm|qc …` — clip editing and the delivery check (see the video-edit skill)
- `tools/stitch.sh out.mp4 a.mp4 b.mp4 …` — join blocks
- `tools/cover.sh video.mp4 cover.png 1.2` — 1080×1920 cover frame

## Examples

`examples/explainer.json` (faceless 10 s block), `examples/talking-clip.json` (an AI clip with a
hook headline, captions and a follow CTA), `examples/animated.json` (kinetic, chat, compare and
transitions), `examples/story-scene.json` (a stick-figure story part: scene shots, speech bubbles, A/B/C choice card), `examples/route-reveal.json` (the season-end Route Reveal board) and `examples/beats.json` (a beat sheet for `tools/beats.mjs`). `npm test` renders them with stand-in media.

## Illustrated story parts

Story series can use AI stills instead of drawn scenes (`settings.story.look: "illustrated"`); the
motion and all text stay in Remotion, so a part costs only its stills.

| field | where | notes |
|---|---|---|
| `move` | `media` shot | camera move over a still: `push` (default), `pull`, `pan_left`, `pan_right`, `rise`, `fall`, `still` |
| `focus` | `media` shot | `{x, y}` 0-1: the point the move heads for (default the centre) |
| `flicker`, `rain` | `media` shot | a faint light flicker; light rain streaks over the still |
| `style: "poster"` | `titlecard` overlay | the series title look: `kicker` (small letter-spaced line, e.g. the season title), `number` (the part number, huge, accent colour), `text` (the part title), `sub`, `y`, `size` (0.6 on a 1280×720 thumbnail), `align` (`left`/`right`) |
| `style: "poster"` | `choice` overlay | the matching vote card: "YOU DECIDE", the question, A/B/C tiles, the footer `sub` |
| `grain` | top level | subtle film grain over the whole picture (also good on stick-figure parts) |
| `ambience`, `ambience_volume` | top level | a rain or city loop under everything (default volume 0.08) |
| `duck` | top level | music and ambience dip to this share of their volume while anyone speaks (default 0.6) |

Both looks use the same sound bed: free ffmpeg-made rain/city ambience and a low drone (see the
producer agent), music about 26 dB and ambience about 28 dB under the voice, and timed `sounds` for
stings, whooshes, footsteps and sirens. The poster `titlecard` and `choice` styles work on stick-figure
parts too.
