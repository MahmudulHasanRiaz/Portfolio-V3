# Marketplace copy of the public site

## Purpose

A separate copy of the public site (`apps/public`) for marketplaces and
marketplace clients. On marketplaces, sharing personal/contact information is
forbidden, so this copy exists to be linked from marketplace profiles and
shared with marketplace clients. It shows the same portfolio work, but it
must never expose a way to contact the owner directly, and it must never be
indexed by search engines.

## What it is

- A separate Astro app in this monorepo: `apps/marketplace`.
- It fetches the same published content from the same Hono public content
  API as `apps/public`, so content updates flow to both automatically.
- Initially it is the same site minus contact information. In future it MAY
  diverge (design changes, information hidden — e.g. as a public figure the
  profile design may change). Divergence is allowed, but only deliberately.

## What it must NEVER have

- No contact section, no email address, no phone number, no WhatsApp link.
- No social-media links, icons, or buttons.
- No "contact me" / "hire me" call-to-action, and no contact form.
- No search-engine indexing, ever. Every page hardcodes
  `<meta name="robots" content="noindex, nofollow">`. There is no sitemap.
- These are NOT controlled by the admin panel's search-indexing on/off
  switch. The marketplace copy is always noindex, regardless of that switch.
  Do not wire it to the switch. Do not add an override.

## Hosting

- Deployed as a separate Cloudflare Worker (e.g.
  `portfolio-v3-marketplace.riaaz.workers.dev`).
- The link used is the Cloudflare Worker link for now. A custom subdomain
  may be added later (the owner's decision, after verifying the marketplace).
- Cloudflare is the host now; it may change to another platform later.

## THE SYNC RULE (mandatory — for AI agents and human developers alike)

This rule is the reason this file exists. Follow it on every change.

**Whenever a UI change is made to the public site (`apps/public`), the same
change MUST also be made to the marketplace copy (`apps/marketplace`) at the
same time — unless the change conflicts with the marketplace copy's purpose.**

How to apply it, every time:

1. Before / while making a UI change to the public site, consider: would
   applying this same change to the marketplace copy cause a problem?
   A "problem" means the change would add contact information, add a way to
   contact the owner, enable search-engine indexing, or otherwise break the
   rules in "What it must NEVER have" above.
2. If there is NO problem, apply the change to BOTH apps in the same piece
   of work. Do not leave the marketplace copy behind. This covers style
   changes, design changes, layout changes, new components (sliders,
   sections, cards, galleries), and any other visible change — if it is done
   on the public site, it is done on the marketplace copy too.
3. If there IS a problem (the change would conflict with the marketplace
   copy's purpose), do NOT apply that change to the marketplace copy, and
   note the exception explicitly in the change / PR description so the next
   person understands why the two apps differ on that point.

This is not optional and not "when convenient". It is a standing rule:
**public-site UI change = marketplace-site UI change, same time, every
case, unless it conflicts with the marketplace purpose.**

## Working on the marketplace copy

- Build and deploy it the same way as `apps/public` (Astro on Cloudflare
  Workers); it is a separate worker with its own name.
- When adding a page, section, or component to the public site, add its
  marketplace counterpart in the same change (see the sync rule above).
- When in doubt whether a change belongs on the marketplace copy, ask the
  owner. Do not silently skip the marketplace copy, and do not silently add
  contact information or indexing to it.
