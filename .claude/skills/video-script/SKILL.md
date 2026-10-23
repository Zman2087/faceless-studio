---
name: video-script
description: Turn a finished script into a shot-by-shot beat sheet and a render-ready Remotion spec — what is said, what is seen and what is on screen, beat by beat, timed to the voice. Use after content-engine has written the words, when the writer agent builds post.remotion_spec, or when the owner says "storyboard this", "make a shot list", "plan the visuals", "turn this script into a video", "time the text to the voice".
---

# Video script — words → beats → spec

`content-engine` decides **what the character says**. This skill decides **what the viewer sees
while they say it**, and produces the spec `remotion/render.mjs` renders. Output is always a
`beats.json` + the `spec.json` made from it, validated.

## 1. Split the script into beats

A beat = one spoken sentence or clause that carries one idea (usually 1.5–4 s, 4–10 words).
Write each as `{ "say": "<exact words, as in voice_text>" }`. Never paraphrase: the timer matches
these words against the transcript.

Typical shapes (pick by format, `settings.format` or the post's format):

| format | beat 1 (0 s, the hook) | middle | last beat |
|---|---|---|---|
| talking / interview | `media` CLIP_1, hook headline | same clip; `textover` for the key number or line; cut to CLIP_2 for part 2 | lowerthird CTA |
| textover (silent b-roll) | `media` b-roll + `textover` hook | one `textover` per beat, new b-roll every 2–3 beats | payoff textover + CTA |
| story / explainer (faceless) | `kinetic`, `chat` or `title` hook | `number`, `bars`, `compare`, `list`, `timeline`, `chat`, `quote`, b-roll `media` | `title` payoff that loops to the hook |

## 2. Give every beat its picture

Rules that keep retention up:
- **Frame 0 is the hook**: beat 1 has a shot and the hook text (`hook.text` ≤ 7 words, `highlight` an exact substring). It is drawn fully at 0 s, no fade.
- **Change something every 2–3 s**: a new shot, a textover, a stamp, a number counting. Static > 4 s loses people.
- **Show the number when it's said**: a `number` shot on the beat that says it; `bars`/`compare` when two things are weighed; `list` for "three things"; `chat` for anything that happened in messages.
- **One idea on screen at a time**: ≤ 7 words for a headline, ≤ 12 for a textover.
- **Transitions are punctuation**: default `fade`; `cut` on a punchline, `zoom` on a reveal, `slide` for "next", `wipe` for before/after. Don't use more than three kinds in one video.
- **Talking clips keep the face clear**: overlays at `y` ≤ 420 or ≥ 1500; captions at 1280 sit under the chin.
- **B-roll comes from the library**: `node scripts/assets.mjs find <slug> --kind broll --tags <topic> --unused-days 30` (see `asset-library`); put any `credit` it prints on the shot.

Shot and overlay fields: `remotion/SPEC.md`. Animated scenes (chat, compare, kinetic, transitions): see `animated-video`.

## 3. Build and time the spec

```bash
cd remotion
node tools/beats.mjs job/beats.json job/spec.json                      # before the voice exists: estimated at 2.6 words/s
node tools/beats.mjs job/beats.json job/spec.json --words job/words.json  # after: timed to the real voice
node render.mjs job/spec.json --validate
```
Keep `beats.json` next to the media it references (paths are relative to the spec). The tool prints
a timing table — check that no beat is under 0.8 s and that the hook beat ends before ~3 s.
Placeholders `CLIP_1`/`CLIP_2` pass validation; the producer swaps in real clips.

For the scheduled writer: store the beats in `post.beats` and the spec in `post.remotion_spec`.
The producer re-runs `beats.mjs --words` once the voice exists, so captions and cuts land on the real words.

## 4. Check before handing on

- `SPEC OK`, and the timing table reads naturally out loud.
- Every factual number on screen matches `citations`.
- Render a preview strip if the repo is local: `node render.mjs job/spec.json - --preview job/check.jpg --preview-only --at 0.1,<mid>,<end-1>` and look at it.
