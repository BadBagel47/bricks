# 3. Operating controls on a Cloudflare Worker with D1

Date: 2026-11-10 (records a decision made 2026-11-08)

## Status
Accepted

## Context
The owner needs to open/close public play, play while closed and create private
invitations, with email-link admin login and no secrets in the browser.

## Decision
A Cloudflare Worker serves the admin UI, a first-party `/play/` copy of the game
and small APIs. D1 stores hashed admin subjects, links, sessions and invitations.
Policy lives in Firebase `operating/config`. Mail goes through Mailjet.

## Consequences
Free-tier hosting with strict CSP and first-party cookies. Setup and rollout are
documented in `docs/OPERATING_CONTROLS.md` and `docs/OPERATING_SETUP.md`.
Secrets stay outside Git.
