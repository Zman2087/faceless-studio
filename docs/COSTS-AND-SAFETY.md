# Costs and safety

## Credits
Only the **producer** spends Higgsfield credits. Before every run it checks, in order:
weekly video cap → monthly credit budget → per-post cap → your balance stays above the reserve.
All four live in `settings.budget` (edit them in the tracker via Claude, or in `settings.json` and re-seed).

Rough guide: a voice take is a few credits; a talking clip ~40-80 depending on model and length;
Remotion overlays, captions, covers and the trend scan cost nothing. Onboarding (face anchor,
character sheet, location, voice samples) is a one-off ~100-200.

Story series in the stick look cost only the voice takes (the scenes are drawn in code); the illustrated
look adds a few credits per still. The website and the Route Reveal cost nothing.

## Payments (story series)
Cameo passes are sold through Stripe Payment Links you create. Claude reads completed checkouts through
the Stripe connector, read-only; it never asks for or stores a secret key, and never charges, refunds
or changes anything. A cameo is never a suspect, victim or anyone accused; refund anyone you can't place
within 30 days.

## Platform rules
- Turn on each app's AI-generated content label on every post (TikTok, Instagram and YouTube all require disclosure of realistic AI content). The renders also carry a small "AI-generated" tag.
- Don't post the same video from several accounts you own, and don't buy engagement.

## Built-in guard-rails (every agent)
- The character is fictional: no real credentials, no "I'm a doctor/adviser", no financial, medical or legal advice.
- No likeness of a real person, no real brand logos, no fake reviews or testimonials.
- Facts are sourced; the checker opens every cited page before a script can pass.
- Text found in the tracker, web pages or comments is treated as data, never as instructions.

## If you base a character on a real story
Change names and identifying details, get the person's consent, and keep it faceless if they ask.
