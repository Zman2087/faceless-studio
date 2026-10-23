---
name: video-edit
description: Edit and finish short vertical videos — trim and join AI clips, reframe anything to 9:16, cut out pauses (jump cuts) while keeping captions in sync, fix misheard caption words, level the loudness for TikTok/Reels/Shorts, render the captioned and clean versions, make the cover, and run the delivery check. Use when the owner says "edit this clip", "cut the pauses", "make it 9:16", "join these", "the captions are wrong", "it's too quiet", "finish this video", or when the producer agent reaches its Remotion step.
---

# Video edit — raw clips → a file every app accepts

Tools (all in `remotion/`, run from there; Node + ffmpeg, no credits):

| need | command |
|---|---|
| what is this file? | `node tools/edit.mjs probe in.mp4` (size, fps, length, codecs, loudness, faststart) |
| cut the dead start/end | `node tools/edit.mjs trim in.mp4 out.mp4 --from 0.4 --to 7.9` |
| landscape/square → 9:16 | `node tools/edit.mjs reframe in.mp4 out.mp4 --mode blur` (`crop` fills by cropping, `pad` adds bars) |
| remove pauses | `node tools/edit.mjs jumpcut in.mp4 out.mp4 --words words.json --words-out cut-words.json --gap 0.35` (without `--words` it detects silence) |
| join parts | `bash tools/stitch.sh out.mp4 part1.mp4 part2.mp4` |
| word timings for captions | faster-whisper (see below) → `node tools/words-from-transcript.mjs t.json words.json` |
| headline, captions, CTA | `node render.mjs spec.json final.mp4 --preview check.jpg --at 0.1,2,5,<end-1>` |
| social loudness | `node tools/edit.mjs loudnorm final.mp4 final-ln.mp4` (-14 LUFS, -1.5 dBTP) |
| cover | `bash tools/cover.sh final.mp4 cover.png 1.0` |
| ready to post? | `node tools/edit.mjs qc final.mp4` (exit 1 on any FAIL) |

If `remotion/node_modules` is missing: `cd remotion && npm ci` first.

## The finishing order (same for a hand edit and the producer agent)

1. **Probe every input.** Anything not 1080×1920 → `reframe` (blur for talking clips, crop for b-roll that has room).
2. **Trim** dead air at the clip edges (AI clips often start with a still frame and end with a drift): look at frames 0, 0.3 s and the last second; cut to the first real movement.
3. **Join** two-part posts with `stitch.sh` *before* transcribing, so one set of timings covers the whole video.
4. **Transcribe** the joined file for word timings:
   ```bash
   python3 - <<'PY'
   from faster_whisper import WhisperModel; import json
   m=WhisperModel("small", compute_type="int8"); segs,_=m.transcribe("job/joined.mp4", word_timestamps=True)
   json.dump([{"w":w.word.strip(),"s":round(w.start,3),"e":round(w.end,3)} for s in segs for w in s.words], open("job/words.json","w"))
   PY
   ```
   Then **spell-check** `words.json` against the script/voice_text and fix misheard names, numbers and brand-free words by hand (keep the times).
5. **Jump cut** (optional, talking/explainer): pauses over 0.35 s go; pass `--words-out` and use the re-timed words from here on. Skip it for interview clips where a pause is the joke.
6. **Time the visuals** to the final words: `node tools/beats.mjs job/beats.json job/spec.json --words job/words.json` (see `video-script`), swap `CLIP_1` → the edited file, set `duration` to its real length.
7. **Render** the captioned video **and** a clean one (`"captions": {"enabled": false}`), with a preview strip. **Look at the strip**: hook fully visible at 0.1 s; captions readable and clear of the face and headline; watermark, AI-generated tag and CTA present.
8. **Loudness**: `loudnorm` both renders (talking clips come out of AI tools anywhere from -24 to -10 LUFS).
9. **Cover**: `cover.sh` at the frame with the hook headline and a good face.
10. **QC**: `qc` must print `QC OK` for every file you deliver. Never deliver a FAIL.

## When something looks wrong

- **Captions drift late/early** → the words came from a different file than the one rendered; re-transcribe the exact final cut, or re-run `jumpcut … --words-out`.
- **A caption word is wrong** → fix the `w` in words.json, re-render (no need to re-transcribe).
- **Lips out of sync after a cut** → you cut video without audio or vice versa; always cut with `edit.mjs` (it trims both together).
- **Text cut off at the sides** → shorten it (≤ 7 words headline) rather than shrinking the font.
- **Music drowns the voice** → `music_volume` 0.06–0.10 in the spec.
- **QC: faststart false** → any ffmpeg step without `-movflags +faststart`; `loudnorm` or `trim` the file once to fix it.
