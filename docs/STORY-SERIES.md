# Interactive story series

A story told in short parts. Every part ends on a choice, viewers vote A/B/C in the comments, and
the next part follows the winning vote. Paid **cameo passes** put a buyer's @ inside a scene.
Proven by [PlotShift Studios](https://plotshiftstudios.com/) (5 parts, 1.3M → 241k views, 46.9k
followers) and [Saveo House](https://saveohouse.com/) (daily parts, live vote %, paid case-board names).

## How it runs

```
 ~7 pm   you post Part n (download kit in the tracker)       viewers comment A / B / C
 ~3 am   you type the vote counts into the tracker            (30 seconds, before the Showrunner runs)
  4:47   Showrunner   closes the vote, writes canon, moves the meters, plans Part n+1, places cameos
  5:47   Writer       scripts the part (second person, recap with the real %, ends on the choice)
  7:41   Checker      scores it; approval_mode "owner" means it waits for your OK
  9:43   Producer     narration + scene stills + 3-5 s animated clips + Remotion title card, meter, cameos, vote card
 15:47   QA           virality check + captions ("Comment A, B or C. Votes close 4 am.")
```

## The story map
The whole season is written up front as a branching map (`channels/<slug>/story-map.json`):
scenes with 2-3 options each, two meters (e.g. Suspicion and Proof) and a set of endings split
between **got away** and **caught**. The Showrunner never improvises plot: it applies the map's rules
to the winning vote and turns the scene it lands on into the next part. Every part adds a little
pressure, so every path ends; `max_parts` caps the season.

```bash
node scripts/story-map-check.mjs channels/<slug>/story-map.json   # every path, every ending, part counts
node scripts/build-story-map.mjs <slug>                              # readable + playable map page to publish
```

Tracker documents: `settings/channel` (with `format: "series"` and a `story` block: cast, look,
stakes, canon, position, vote, cameo), `story/map` (the map JSON), `posts/p-NNN` (one per part, format `"part"`, with
`choice`, `cameos`, `vote.counts`), `cameos/c-*` (queued → scheduled → featured).

## Cameo passes
- Sell on Gumroad (or Stripe Payment Links) with a required custom field "Your Instagram/TikTok handle".
- When a sale lands, add the handle in the tracker under **Cameo passes**. The Showrunner places up to `story.cameo.per_part` per part, oldest first, in that part's in-world slot (a witness list, a contacts screen, a crew roster).
- A cameo is never a suspect, killer, victim or anyone accused. Business cameos appear as a shopfront or sign, never as an endorsement.
- Don't promise views or a date; promise "an upcoming part". Refund anyone you can't place within 30 days.

## Content rules (built into the agents)
Fiction only and not resembling a real case; violence implied, never shown; choices are decisions,
never methods; AI-generated label on every post.
