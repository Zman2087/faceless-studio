---
name: make-post
description: Make one finished video for a channel in this repo right now, by hand instead of waiting for the scheduled agents — script in the character's voice, voice take, Higgsfield clip(s), Remotion hook headline + captions + CTA, cover and post captions. Use when the owner says "make a video now", "make the first post", "produce p-003", "make a video about X for <character>", or wants to test the pipeline end to end.
---

# Make one post now

This is the scheduled pipeline (writer → checker → producer → QA) run once, live, with the owner
watching. Same files, same rules: read `agents/templates/2-writer.md` … `5-qa.md` and follow
their steps, with these differences:

- **Which channel:** `$ARGUMENTS` or the only folder in `channels/` (ask once if several). Read `channels/<slug>/settings.json`; if it has a `tracker_url`, read the live `settings/channel` from the tracker instead (it may be newer).
- **Which post:** a post id from the tracker, or a topic the owner gives (create `posts/p-NNN` for it first).
- **Script:** write it (writer steps 3a-3i), then score it yourself against the checker's rubric and hard checks — and show the owner the script before spending credits. If `approval_mode` is "owner", wait for their OK.
- **Produce:** follow the producer's steps 3-6 (voice → clips → Remotion in the Higgsfield sandbox), announcing the credit estimate first. If the owner has the repo locally with Node + ffmpeg, you may instead render locally: download the clips with the Higgsfield tools, put them next to a spec, and run `cd remotion && node render.mjs <spec> out/final.mp4 --preview out/check.jpg` (look at the preview before delivering).
- **Edit and finish:** follow the `video-edit` skill's finishing order (beats re-timed to the voice, loudness, `qc` must pass); explainers use `animated-video`, b-roll comes from `asset-library`.
- **QA + captions:** QA steps 3a-3f; set the post to "ready" so it shows in the tracker's download kit.

Deliver: the video (link or file), the cover, and the three captions ready to paste — plus a one-line reminder to turn on each app's AI-generated label.
