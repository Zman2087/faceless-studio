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

Tracker documents: `settings/channel` (with `format: "story"` and a `story` block: cast, look,
stakes, canon, position, vote, cameo), `story/map` (the map JSON), `posts/p-NNN` (one per part, with
`choice`, `cameos`, `vote.counts`), `cameos/c-*` (queued → scheduled → featured).

## The Route Reveal (end of season)
After the finale and its season-two vote, the Showrunner plans one bonus episode comparing the
route the audience voted for with the **perfect run** (the shortest route to the best ending in
`ending_rank`). It names the **turning point** (the first vote that took a better ending off the
table, with the real vote share), the **close calls** (votes the audience won by under 60% that
weren't the best move) and how many votes matched the best move from where the audience was.

```bash
node scripts/story-route-compare.mjs channels/<slug>/story-map.json \
  --route "S1:A,R1:A,D1:A,D2:C,DEAL1:A" --pct "S1:A=58,R1:A=64,D1:A=71,D2:C=52,DEAL1:A=67" --spec reveal.json
```
The Showrunner runs the same thing from `settings.story.canon` (`--canon`), and `--spec` writes the
Remotion spec with the side-by-side route board. The map page shows the perfect run, and playing
it to an ending shows the same comparison.

## Cameo passes
- Sell on Gumroad (or Stripe Payment Links) with a required custom field "Your Instagram/TikTok handle".
- When a sale lands, add the handle in the tracker under **Cameo passes**. The Showrunner places up to `story.cameo.per_part` per part, oldest first, in that part's in-world slot (a witness list, a contacts screen, a crew roster).
- A cameo is never a suspect, killer, victim or anyone accused. Business cameos appear as a shopfront or sign, never as an endorsement.
- Don't promise views or a date; promise "an upcoming part". Refund anyone you can't place within 30 days.

## Content rules (built into the agents)
Fiction only and not resembling a real case; violence implied, never shown; choices are decisions,
never methods; AI-generated label on every post.
