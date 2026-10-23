---
name: new-channel
description: Set up a new short-video channel end to end in this repo — faceless by default (narrated stories, explainers, text-on-screen) or with an AI character on camera — interview the owner, set the look and narrator voice (plus character sheet, face anchor and location for on-camera channels), publish the studio tracker, seed it, fill the six agents and create their scheduled tasks, then pitch the first content plan. Use when someone runs /new-channel, has just cloned or set up this repo, says "make my first channel", "start a faceless channel", "create a new character/account", or asks to set up the pipeline.
---

# New channel — from zero to a scheduled pipeline

You are setting up one channel so that six scheduled agents (planner → writer → checker →
producer → QA → strategist) can run it every day, with a tracker the owner posts from. Work in
plain words; the owner may not be technical. Keep momentum: ask, then build.

The repo layout you work with:
- `channels/_template/` → copied to `channels/<slug>/` (`settings.json` is the single source of truth the agents read via the tracker; `character.md` is the human version)
- `scripts/new-channel.mjs --answers answers.json` scaffolds the folder
- `tracker/tracker.html` is the studio page (an Artifact with the `db` + `user` capabilities)
- `agents/templates/*.md` + `scripts/render-agents.mjs` → `channels/<slug>/agents/*.md` + `schedule.json`
- `remotion/` renders the finished videos (`remotion/SPEC.md`)
- skills: `content-engine` (ideas → scripts), `video-script` (beats → spec), `animated-video` (faceless scenes), `video-edit` (finishing), `asset-library` (b-roll, music, licences), `digital-product` (monetising later); on-camera channels also `charsheet-soul` (character cards) and `ugc-character-video` (clip prompts)

## Step 0 — Preflight (silent, fast)

1. Run `node scripts/doctor.mjs --quiet`. If it fails on Node or ffmpeg, tell the owner the one command to fix it and carry on with the interview (nothing below needs a render yet).
2. Check the connectors: Higgsfield is required (characters, voice, video, the render sandbox). ElevenLabs is optional (voice). If a tool search finds no `mcp__higgsfield__*` tools, say: "Connect Higgsfield first: in Claude Code run `/mcp` and authenticate `higgsfield` (it's in this repo's .mcp.json); in the Claude app, Settings → Connectors → Add custom connector → `https://mcp.higgsfield.ai/mcp`." Then continue the interview while they do it.
3. If `$ARGUMENTS` names an existing `channels/<slug>/`, read its `settings.json`/`answers.json` and skip the questions already answered.

## Step 1 — The interview (one round, then build)

Open with one line: "Let's set up your first channel. Seven quick questions — skip any and I'll suggest something."
Ask these in ONE message (use AskUserQuestion for the multiple-choice ones if available; free text for the rest):

1. **Niche** — what will the channel post about? (offer 4 examples that work faceless: text-message stories, money mistakes explained, strange history in 30 seconds, workplace confessions)
2. **Faceless or on camera?** Faceless (recommended, the default): nobody on camera — narrated stories, explainers and text-on-screen videos built from animated scenes and b-roll; cheapest and fastest. On camera: a fictional AI person talking or being interviewed (Higgsfield character clips; more credits).
3. **Name and narrator**: the channel's name and who's telling the stories, in one line (a point of view beats a fake expert — a niche that implies credentials the owner doesn't have, like doctor or financial adviser, is risky and gets flagged). On camera: the character's name, age and vibe.
4. **How does it sound?** e.g. dry and deadpan / warm and conspiratorial / chaotic Gen-Z.
5. **Look**: a colour or mood for the scenes (e.g. dark with a neon green accent). On camera: also where we see them (one main location).
6. **Script approval**: should scripts wait for your OK before anything is generated (`approval_mode: "owner"`), or run fully automatic?
7. **Budget**: Higgsfield credits per month they're happy to spend (default 2,000) and posts per week (default 5).

Never ask a second round. Fill anything missing yourself and say what you chose.

## Step 2 — Research and shape the character (no credits)

- 3–5 WebSearches on the niche: top creators (incl. AI ones), hooks and formats working now, audience pain points. Pick 3 content pillars and 3–5 competitor YouTube handles for `trend_scout.competitors`.
- Write the answers to `channels/answers-<slug>.json` with the keys from `scripts/new-channel.mjs` (NAME, HANDLE, NICHE, AGE, CHARACTER_SUMMARY, BACKSTORY, AUDIENCE, WRITING_VOICE, VOICE_DELIVERY, IDENTITY_ANCHORS, MAIN_LOCATION, OUTFIT_1, PILLAR_1..3, ACCENT, TIMEZONE) and run `node scripts/new-channel.mjs --answers channels/answers-<slug>.json`.
- Then edit `channels/<slug>/settings.json` directly: `format`, `approval_mode`, `cadence.per_week`, `budget`, `pillars[].desc`, `hook_formulas` tuned to the niche, `trend_scout.queries` (3–5 real search phrases) and `competitors`, `hashtags.niche`, profile bios (respect `bio_limit`).
- Show the owner a 6-line summary of the character and the pillars. Continue unless they object.

## Step 3 — Look and voice (spends a few credits: say roughly how many first)

**Faceless channels (the default)** — no character images:
1. **Brand** — set `settings.brand` from the look answer (bg, accent, font; check the accent reads on the bg) and render one 6-second sample in Remotion (`kinetic` hook → `chat` or `compare` → `title`, see `animated-video`) so the owner sees the style before anything is spent. Look at the preview strip first.
2. **Voice** — the narrator voice, as in step 4 below.
3. **Library** — add 5–10 reusable b-roll clips or backgrounds that fit the niche to the asset library (free stock with a clear licence, or a few Higgsfield generations — say the credits first).
Then skip to step 5 below (write ids into `settings.json`); `format` is `"faceless"`.

**On-camera channels (`format: "character"`)** — follow `.claude/skills/charsheet-soul/SKILL.md` exactly (two-pass pipeline):
1. **Face anchor** — Soul Cinema tight portrait prompt from the identity anchors (generate with Higgsfield; show it; one retry if the owner dislikes it). This image is never regenerated.
2. **Character sheet** — the 3-panel Soul 2.0 card fitted to the locked face, same anchors verbatim, in the signature outfit.
3. **Location still** — the main location, empty, no text, no brands (generate_image).
4. **Voice** — Higgsfield: `list_voices` and pick 2–3 presets matching `VOICE_DELIVERY`; generate the same 2-line sample with each and let the owner pick (or `create_voice` for a designed one). ElevenLabs (if connected and the owner prefers it): `creative_list_voices`/`creative_design_voice`, then also pick a Higgsfield fallback voice.
5. Write every job id / media URL / voice id into `settings.json` (`character.face_anchor`, `character.sheet`, `character.location_stills[0]`, `voice`), and the final identity anchors into `character.anchors` and `character.md`. Then start the character's asset library: `node scripts/assets.mjs seed <slug>` (see the `asset-library` skill).

If Higgsfield isn't connected yet, write the prompts into `channels/<slug>/prompts.md`, tell the owner, and continue — the agents will stop at their gates until the sheet exists.

## Story series (format "story") — replaces Steps 2-3
1. Settings: `format: "story"`, a `story` block (title, premise, pov, tone, look, cast, locations, stakes, canon [], season, position, vote, cameo). Copy the shape from `docs/STORY-SERIES.md`.
2. **Write the whole season as a branching map** in `channels/<slug>/story-map.json` (same schema as the docs example): 20-35 nodes, 2-3 options each, two stakes that pull every path to an ending, 6-10 endings split between got_away and caught, a `pressure` per part and a `max_parts` cap. Run `node scripts/story-map-check.mjs channels/<slug>/story-map.json` and fix until it says MAP OK with no warnings; aim for a roughly even got-away/caught split and a 4-11 part range. Show the owner the readable map (publish `tracker/story-map.html` with the map inlined, see the docs) before generating anything.
3. Look: one character sheet per cast member and one still per location (charsheet-soul), all in `story.look`. Voice: one narrator.
4. In Step 4 also write the map to the tracker as `story/map` (the full JSON) and create the empty `cameos` collection. Step 5 renders the Showrunner instead of the Planner automatically.

## Step 4 — The tracker (studio page)

1. Load the `artifact-design` and `artifact-capabilities` skills if your environment lists them.
2. Publish `tracker/tracker.html` as a new Artifact titled "<Name> Studio" with capabilities `{"db": {}, "user": {}}` and icon `video`. (Do not change its layout; it already themes itself from `settings.name`.)
3. Seed it with ArtifactData (one batch): `settings/channel` = the full `settings.json` object; `runs/planner|writer|checker|producer|qa|strategist` = `{agent: "<Name>", entries: []}`.
4. Save the tracker URL into `settings.json` as `tracker_url`.

## Step 5 — The agents

1. The producer clones this repo inside the Higgsfield sandbox, so the repo must be reachable there: `git remote get-url origin`. If there is no remote or it's private, tell the owner: "Push this repo to GitHub as **public** (it contains no keys or personal data) so the video producer can use the Remotion engine." Use the URL they give.
2. `node scripts/render-agents.mjs <slug> --tracker <tracker url> --repo <repo url>`.
3. Create the six scheduled tasks from `channels/<slug>/agents/schedule.json`: for each entry, create a recurring scheduled task with that `name`, `cron_expression`, and the full contents of `prompt_file` as its prompt (initiation: human_request). They need the Higgsfield connector (and ElevenLabs if chosen) available in their sessions. Before creating them, tell the owner in one line which ones spend credits (only the producer) and the monthly cap from settings.budget. If no scheduling tool exists in this environment, say so plainly and point them to `docs/SCHEDULING.md` (create them from the Claude app with "schedule the agents in channels/<slug>/agents/schedule.json").
4. Report which approval setting each task got (the tool result says) and that the owner can pause everything from the tracker's "Pause agents" button.

## Step 6 — First content plan (the payoff)

Run the content-engine skill Phase 1 for this character: 8 ranked, research-backed ideas. Write the owner's top picks (or your top 5 if they're away) into the tracker as `posts/p-001…` with the planner's fields (number, title, pillar, series, format, hook, hold, angle, location, outfit, length_s, status "planned", created_at, created_by "onboarding") so the writer picks them up on its next run.

## Finish

One short message: the channel (the sample render for faceless, the face anchor image for on camera), the tracker link card, the six scheduled tasks and when the first video will land, and the one thing the owner does daily (open the tracker → "Ready to post" → download → paste captions → turn on the AI label). Offer one next step: "Want me to make the first video right now instead of waiting for tomorrow's run?" (that runs the `make-post` skill).

## Rules
- Never put API keys, emails or personal details in the repo. `settings.json` holds only character data and public job/voice ids.
- The narrator or character is fictional. Never base it on a real, identifiable person without their consent, and never give it real credentials.
- Spending credits: announce the rough cost before each generation step and stay under the owner's budget.
