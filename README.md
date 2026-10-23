# Faceless Studio

Run faceless short-video channels on TikTok, Instagram Reels and YouTube Shorts with Claude doing
the work: narrated stories, explainers and text-on-screen videos with nobody on camera (or, if you
want one, a fictional AI character). You set a channel up once; six scheduled agents then plan,
write, fact-check, produce and caption a video every day, and you post it from a studio page in
about two minutes.

```
 you (once)            Claude agents (every day)                              you (2 min/day)
 ───────────           ─────────────────────────────────────────────────      ──────────────
 /new-channel  ──►  Planner ─► Writer ─► Checker ─► Producer ─► QA      ──► Studio page:
 niche, voice          weekly     scripts   scores     voice +      captions    download, paste
 look, tracker         trends     beats     >7 passes  scenes/clips virality    captions, post
                       analysis   specs     facts      + Remotion   cover       enter views
                                                       overlays                  ▲
                       Strategist (monthly): what's working, when to sell ───────┘
```

## What you need

| | why | cost |
|---|---|---|
| [Claude](https://claude.ai) (Pro or Max) with **Claude Code** or the desktop app | runs everything, hosts the scheduled agents and the studio page | subscription |
| [Higgsfield](https://higgsfield.ai) | voices, b-roll, optional AI character clips, the render sandbox | credits (a faceless video is mostly free Remotion scenes; ~60 per AI clip; you set a monthly cap) |
| [ElevenLabs](https://elevenlabs.io) *(optional)* | alternative voices | your plan |
| Node 20+, ffmpeg, git | local setup and test renders | free |

## Setup (5 minutes)

```bash
git clone https://github.com/Zman2087/faceless-studio.git
cd faceless-studio
./setup.sh
```

`setup.sh` checks your tools, installs the Remotion engine, downloads the Remotion skills
([remotion-dev/skills](https://github.com/remotion-dev/skills)),
packages every skill as a zip for the Claude app, renders two test videos, and then **starts Claude
with `/new-channel`**, which asks about your first channel.

Connect Higgsfield when Claude asks:
- **Claude Code:** type `/mcp` and authenticate `higgsfield` (and `elevenlabs` if you want it) — they're already in `.mcp.json`.
- **Claude app:** Settings → Connectors → Add custom connector → `https://mcp.higgsfield.ai/mcp`.

> Using only the Claude app (no terminal)? Upload the zips in `dist/skills/` under Settings →
> Capabilities → Skills, attach this repo, and say "run /new-channel".

## What `/new-channel` does

1. Asks 7 questions in one go: niche, faceless or on camera, the channel's name and narrator, how it sounds, its look, whether scripts wait for your OK, budget.
2. Researches the niche (top creators, hooks working now) and picks three content pillars.
3. Sets the **look** (brand colours, scene style, b-roll) and lets you pick a **narrator voice** from samples. On-camera channels also get a **face anchor**, a **3-panel character sheet** and a **location** (Higgsfield Soul). *(Tells you the credit cost first.)*
4. Publishes your **studio page** (a private Claude Artifact) and seeds it with the channel.
5. Fills the six agent prompts and creates the **scheduled tasks**.
6. Pitches 8 ranked first-video ideas and queues your picks.

The first finished video lands after the next producer run (or say **"make the first video now"**).

## Interactive story series
Pick "series" as the format and you get a choose-what-happens story instead of a host: every part
ends on an A/B/C choice viewers vote on in the comments, a **Showrunner** agent follows a pre-written
branching map (every path ends with the hero getting away or getting caught), and paid **cameo
passes** put buyers' handles inside scenes. See [docs/STORY-SERIES.md](docs/STORY-SERIES.md).

## Your daily routine
Open the studio page → **Ready to post** → download the video and cover → copy each app's caption →
post → turn on the app's **AI-generated** label → tap **Mark as posted**. Once a week, type the view
counts in; the planner uses them to choose what comes next. See [docs/DAILY.md](docs/DAILY.md).

## How it works

![How the kit fits together](docs/diagrams/architecture.svg)

More: [architecture](docs/ARCHITECTURE.md) · [a post's life](docs/diagrams/post-statuses.svg) · [how one video is made](docs/diagrams/video-production.svg)

## Inside the repo

| path | |
|---|---|
| `.claude/skills/` | `new-channel`, `make-post`, `charsheet-soul`, `ugc-character-video`, `content-engine`, `digital-product`, `video-script`, `animated-video`, `video-edit`, `asset-library` (+ Remotion skills after setup) |
| `agents/` | the six agent prompt templates and their schedule |
| `tracker/tracker.html` | the studio page |
| `channels/_template/` | what a character is made of (`settings.json`, `character.md`) |
| `remotion/` | the video engine: JSON spec → MP4 ([SPEC.md](remotion/SPEC.md)) |
| `scripts/` | scaffolding, agent rendering, `assets.mjs` asset library, `doctor.mjs` health check |
| `docs/` | [interactive story series](docs/STORY-SERIES.md), [architecture](docs/ARCHITECTURE.md), [scheduling](docs/SCHEDULING.md), [daily routine](docs/DAILY.md), [costs & safety](docs/COSTS-AND-SAFETY.md) |

Health check any time: `node scripts/doctor.mjs`.

## Keep this repo public
The video producer clones this repo inside Higgsfield's cloud sandbox to use the Remotion engine, so
your fork needs to be public (it holds no keys; your characters are git-ignored by default).
