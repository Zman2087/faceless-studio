---
name: asset-library
description: Keep and reuse a channel's media — b-roll, backgrounds, photos, music beds, sound effects, past AI clips, and (on-camera channels) the character sheet, face anchor and location stills — with the source, licence and credit line for each, and which posts used it, so videos reuse what's already paid for and never publish something unlicensed. Use when the owner says "save this clip", "find b-roll of…", "what music can we use", "is this OK to use", "add this to the library", when the writer or producer needs b-roll, or after onboarding to import the channel's stills.
---

# Asset library

One register per channel in `channels/<slug>/assets/library.json` (files in `assets/files/`),
plus `channels/_shared/` for things every channel can use. Channel folders are git-ignored
by default, so the library stays private. Everything goes through `scripts/assets.mjs`:

```bash
node scripts/assets.mjs seed  <slug>                                   # after onboarding: imports face anchor, sheet, location stills
node scripts/assets.mjs add   <slug> <file|url> --kind broll --tags kitchen,morning --licence pexels --source <page URL>
node scripts/assets.mjs find  <slug> --kind broll --tags kitchen --min-dur 3 --unused-days 30
node scripts/assets.mjs use   <slug> a-007 --post p-012
node scripts/assets.mjs check <slug>
```

## Kinds and tags
`clip` (AI character clips we generated), `broll`, `still` (character/location images), `photo`,
`music`, `sfx`, `voice` (approved voice takes), `font`, `logo-free-graphic`.
Tags: lowercase, concrete, searchable — the place (`kitchen`), the mood (`calm`), the subject
(`coffee`), the pillar key from settings. 2–5 per asset.

## Licences — the only rule that matters
| `--licence` | use it? | credit |
|---|---|---|
| `own` | yes — we generated it (Higgsfield, ElevenLabs) or the owner made it | no |
| `cc0`, `pexels`, `pixabay` | yes | no (still record `--source`) |
| `unsplash` | stills only | no |
| `cc-by` | yes | **required**: `--credit "Photo: Name, CC BY 4.0"` → put it in the shot's `credit` |
| `licensed` | yes — paid; put the order/licence ref in `--note` | as the licence says |
| `unknown` | **never published** — `find` hides it, `use` refuses it | — |

Never add: anything with a brand logo or a real person's face, screenshots of real chats or posts,
music ripped from TikTok/YouTube/Spotify, "free" sites that don't state a licence. When the owner
gives a file without a source, add it as `unknown` and ask where it came from.

## Where assets come from
1. **Ours first**: every Higgsfield clip and still the producer makes is `own`; good unused takes are free b-roll later (`--kind clip --job-id …`).
2. **Free stock** with a clear licence: Pexels / Pixabay video & photos, CC0 libraries. Save the page URL as `--source`.
3. **Music**: the app's own sound library when posting is safest (trending sounds are added in-app, not baked in). Baked-in beds only with `own`/`cc0`/`licensed`; keep them at `music_volume` 0.06–0.12.
4. **Generate** what's missing (Higgsfield `generate_image`/`generate_video`, announce credits first) and add it as `own`.

## How the pipeline uses it
- **Writer / video-script**: `find --unused-days 30` for b-roll so the feed doesn't repeat itself; least-used comes first.
- **Producer**: after a post is produced, `add` its clips (`--kind clip --licence own --job-id`) and `use` every asset that appeared in it.
- **Before delivering** any video that used non-`own` assets: `check` must print `CHECK OK`, and every `cc-by` asset's credit is on its shot.
- In the cloud sandbox the library isn't checked out: pass assets as their `url` (or upload the file with `media_upload` and use that URL).
