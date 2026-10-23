#!/usr/bin/env node
// Build the static website for a story channel from its settings.
//   node scripts/build-site.mjs <slug> [--out channels/<slug>/site]
// Writes index.html, site.json (what the site says), state.json (the live part: vote, files, case board,
// next drop; refreshed by scripts/site-state.mjs), terms.html, refunds.html, privacy.html and thanks.html.
// Deploy the folder anywhere static: Cloudflare Pages, Netlify, GitHub Pages (docs/WEBSITE.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const slug = args[0];
if (!slug) { console.error("usage: build-site.mjs <slug> [--out dir]"); process.exit(2); }
const oi = args.indexOf("--out");
const out = path.resolve(oi > 0 ? args[oi + 1] : path.join(ROOT, "channels", slug, "site"));
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, "channels", slug, "settings.json"), "utf8"));
const site = settings.site || {};
const story = settings.story || {};
const name = settings.name;
const accent = settings.brand?.accent || "#FFD23F";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const today = new Date().toISOString().slice(0, 10);
fs.mkdirSync(out, { recursive: true });

const siteJson = {
  name,
  kicker: site.kicker || "An interactive series · you decide",
  headline: site.headline || story.title || name, // *word* is drawn in the accent colour
  lede: site.lede || story.premise_short || settings.tagline || "",
  profile_url: site.profile_url || "",
  cadence: site.cadence || "every weeknight",
  contact_email: site.contact_email || "",
  list_action: site.list_action || "", // a form endpoint from your email tool (Buttondown, ConvertKit, Mailchimp…)
  pass: site.pass ?? {
    includes: ["Your @ inside a scene in an upcoming part", "On the case board for good", "The playbook: how the series is made"],
    tiers: [], // [{ price: "$15", link: "https://buy.stripe.com/…", until: "2026-11-01T21:00:00+11:00" }, { price: "$19", link: "…" }]
  },
  business: site.business ?? { price: "From $150", blurb: "Your shopfront or sign appears in a scene. Apply first; pay only if accepted.", apply_url: "" },
  partners: site.partners ?? { blurb: "Sponsor a part. Always labelled." },
  faq: site.faq || [
    { q: "Is it real?", a: "No. It's a fictional story, animated and voiced with the help of AI. Any resemblance to real people or cases is not intended." },
    { q: "How do I vote?", a: "Comment your letter (A, B or C) on the latest part, or vote in the story poll. When the vote closes, the most votes decide what happens next." },
    { q: "When do new parts drop?", a: `New parts drop ${site.cadence || "every weeknight"}. Follow so you don't miss one.` },
    { q: "How does the cameo pass work?", a: "After checkout you give us your Instagram or TikTok handle. It appears inside a scene in an upcoming part (a witness list, a phone screen, a crew roster), never as a suspect or a victim. We can't promise which part or how many views it gets." },
    { q: "Can I get a refund?", a: "Yes, if we haven't featured your handle within 30 days of purchase. See the refunds page." },
  ],
  disclaimer: site.disclaimer || `${name} is a work of fiction made with AI-assisted animation and voices.`,
  ticker_extra: site.ticker_extra || "",
};
fs.writeFileSync(path.join(out, "site.json"), JSON.stringify(siteJson, null, 2));
if (!fs.existsSync(path.join(out, "state.json"))) fs.writeFileSync(path.join(out, "state.json"), JSON.stringify({ updated_at: new Date().toISOString(), parts: [], board: [] }, null, 2));

const fill = (t, vars) => t.replace(/__([A-Z_]+)__/g, (m, k) => (vars[k] ?? m));
const vars = { TITLE: esc(name), NAME: esc(name), DESCRIPTION: esc(siteJson.lede), HEADLINE: esc(siteJson.headline).replace(/\*/g, ""), LEDE: esc(siteJson.lede), ACCENT: accent, DATE: today };
fs.writeFileSync(path.join(out, "index.html"), fill(fs.readFileSync(path.join(ROOT, "site/template/index.html"), "utf8"), vars));

const owner = site.legal_name || "the creator of " + name;
const contact = site.contact_email ? `<a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a>` : "the contact address on our profile";
const legal = {
  terms: ["Terms", `
<p>${esc(name)} is a fictional, interactive story series run by ${esc(owner)}. By using this site or buying a pass you agree to these terms.</p>
<h2>The story</h2><p>The story is fiction, made with AI-assisted animation and voices. Votes shape what happens next, but we decide how each part is written and may steer the story to keep it safe and watchable.</p>
<h2>Cameo passes</h2><p>A pass puts the handle you give us inside a scene in an upcoming part and on the case board. We choose the part and the placement. Your handle is never shown as a suspect, a criminal or a victim. We can decline a handle that is offensive, impersonates someone, or belongs to someone else; if we do, we refund you.</p>
<h2>Business cameos</h2><p>Businesses apply first. If accepted, the business appears as a shopfront, sign or prop and is never shown endorsing or reviewing anything. Placement is labelled as paid where the platforms require it.</p>
<h2>No guarantees</h2><p>We can't promise views, reach or a date for any part. Platforms can change or remove content.</p>
<h2>Contact</h2><p>${contact}</p>`],
  refunds: ["Refunds", `
<p>If your handle hasn't appeared in a part within 30 days of purchase, ask and we'll refund you in full. You can also ask for a refund before your handle has appeared. Once it has appeared, the pass has been delivered.</p>
<p>To ask, email ${contact} with your order email. Refunds go back to the original payment method through Stripe.</p>`],
  privacy: ["Privacy", `
<p>We collect only what we need: your email and the handle you give us at checkout (to deliver the pass), and your email if you join the list. Payments are processed by Stripe; we never see your card. We don't sell your data.</p>
<p>Your handle appears publicly in the story and on the case board, because that is what the pass is. Ask us to remove it at any time: ${contact}.</p>`],
  thanks: ["You're in", `
<p>Thanks. Your handle is in the queue and will appear inside a scene in an upcoming part. Follow ${esc(name)} so you see it land.</p>`],
};
const lt = fs.readFileSync(path.join(ROOT, "site/template/legal.html"), "utf8");
for (const [file, [title, body]] of Object.entries(legal)) fs.writeFileSync(path.join(out, `${file}.html`), fill(lt, { ...vars, PAGE_TITLE: title, BODY: body }));
console.log(`SITE ${path.relative(ROOT, out)} (index, site.json, state.json, terms, refunds, privacy, thanks)`);
if (!siteJson.pass.tiers?.length) console.log("  no Stripe payment link yet: add settings.site.pass.tiers (docs/WEBSITE.md) and rebuild");
