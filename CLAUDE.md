# Faceless Studio — instructions for Claude

This repo runs faceless short-video channels end to end: narrated stories, explainers and
text-on-screen videos (with an optional fictional AI character on camera), six scheduled agents that
plan, write, check, produce and caption a video every day, a studio tracker (an Artifact) the owner
posts from, and a Remotion engine that builds the scenes and adds the hook headline, captions and CTA
for zero credits.

## First run
If `channels/` contains no folder other than `_template/`, the person is new. Greet them in one
line and start the `new-channel` skill (`/new-channel`) — it interviews them about their first
channel and builds everything. Don't wait to be asked; this is the reason they cloned the repo.
If setup hasn't been run (`remotion/node_modules` missing), run `./setup.sh --no-onboard` first.

## Map
| path | what |
|---|---|
| `.claude/skills/new-channel` | onboarding: interview → look + voice → tracker → agents → first plan |
| `.claude/skills/make-post` | make one video now, by hand |
| `.claude/skills/charsheet-soul` | character sheets, face anchors (Higgsfield Soul) — on-camera channels only |
| `.claude/skills/ugc-character-video` | AI character video prompts (Seedance via Higgsfield): talking, interview, text-over, continuation — on-camera channels only |
| `.claude/skills/content-engine` | ideas → scripts in the character's voice |
| `.claude/skills/digital-product` | a low-ticket product to sell, when the account is ready |
| `.claude/skills/video-script` | script → beats → timed Remotion spec (`remotion/tools/beats.mjs`) |
| `.claude/skills/animated-video` | motion graphics: explainers, kinetic type, chat stories, compare, charts; new scene types |
| `.claude/skills/video-edit` | trim, reframe, jump cuts, captions, loudness, delivery QC (`remotion/tools/edit.mjs`) |
| `.claude/skills/asset-library` | reusable clips, b-roll, stills, music with licences (`scripts/assets.mjs`) |
| `agents/templates/` | the six scheduled-agent prompts (`{{PLACEHOLDERS}}` filled by `scripts/render-agents.mjs`) |
| `agents/schedule.json` | when each agent runs |
| `tracker/tracker.html` | the studio page; publish as an Artifact with `{"db":{},"user":{}}` |
| `channels/<slug>/settings.json` | the channel + rules; seeded into the tracker as `settings/channel` |
| `remotion/` | the render engine — spec format in `remotion/SPEC.md`, CLI `node remotion/render.mjs` |
| `scripts/` | `new-channel.mjs`, `render-agents.mjs`, `doctor.mjs`, `assets.mjs`, `story-map-check.mjs`, `build-story-map.mjs`, `package-skills.sh` |
| `agents/templates/7-showrunner.md` | series only: closes votes, follows the story map, places cameos |
| `tracker/story-map.html` | readable + playable story map page (`scripts/build-story-map.mjs`) |
| `docs/diagrams/` | Excalidraw sources (`.excalidraw`) and their SVG exports used in the docs |

## Pipeline (tracker statuses)
planned → scripted → (needs_rewrite ↺) → [awaiting_owner if approval_mode is "owner"] → approved →
producing → produced → ready → posted. Series channels add a vote on each posted part (`vote.counts`, closed by the Showrunner) and a `cameos` collection. `shelved` and `failed` are side exits. The owner can pause all
agents from the tracker.

## Rules
- Characters are fictional. No real person's likeness, no real credentials, no financial/medical/legal advice, no brand logos, no fake reviews. AI-generated labels on, always.
- Announce credit costs before generating; respect `settings.budget`.
- Never commit API keys, emails or personal data. Job ids and voice ids are fine.
- Rendering: Remotion needs Chrome. Locally it downloads its own; in cloud sandboxes `render.mjs` finds the pre-installed Playwright Chromium (or set `REMOTION_BROWSER`). Always look at the `--preview` strip before delivering a video.
