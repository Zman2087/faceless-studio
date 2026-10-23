# Scheduled tasks

`/new-channel` creates these for you. If it couldn't (no scheduling tool in that environment),
do it from the Claude app or Claude Code on the web with this repo attached:

> Schedule the agents in `channels/<slug>/agents/schedule.json`: one recurring scheduled task per
> entry, using its name and cron, with the full contents of its prompt_file as the prompt. Enable the
> Higgsfield connector (and ElevenLabs if I use it) for each.

| agent | default (your timezone) | spends credits |
|---|---|---|
| 1 Planner | Sundays 6:52 pm | no |
| 2 Writer | daily 5:47 am | no |
| 3 Checker | daily 7:41 am | no |
| 4 Producer | daily 9:43 am | **yes** (gated by `settings.budget`) |
| 5 QA + captions | daily 3:47 pm | no (virality predictor may use a few) |
| 6 Strategist | 1st of the month 10:13 am | no |
| 0 Showrunner (story series only, replaces the Planner) | daily 4:47 am | no (reads Stripe sales read-only) |
| 7 Series Developer (story series only) | Wednesdays 11:19 am | no |

Change times in `agents/schedule.json` before rendering, or ask Claude to update a task.

## Approval
Each task's runs either go ahead automatically or stop when an action needs approval. Unattended
runs need **automatic approval** (task settings → "Automatically approve", if your organisation allows it).

## Pausing
The studio page's **Pause agents** button sets `paused: true`; every agent checks it first and stops
without writing or spending. **Resume** turns them back on.

## Re-rendering after you change a template
```bash
node scripts/render-agents.mjs <slug> --tracker <url> --repo <url>
```
then ask Claude to "update the scheduled tasks for <slug> from schedule.json".
