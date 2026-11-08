# Reusable access-control core

Independent of React, Firebase, Cloudflare and the mail provider. Staged on
`feature/operating-controls`; production setup and review remain outstanding.

- `magic-links.ts`: private project-scoped HMAC subjects, allowlist lookup,
  256-bit one-use tokens and 1-hour expiry.
- `sessions.ts`: hashed opaque 8-hour sessions, current allowlist checks,
  revocation and D1-compatible storage.
- `http.ts`: same-origin JSON/CSRF checks, bounded bodies, generic background
  login responses and secure host-only cookies. GET never redeems an email link.
- `d1-store.ts` / `schema.sql`: atomic redemption and durable source/recipient/
  aggregate mail limits. Default cap: 90 attempts/project/day, reducible.
- `operating.ts`: separately controlled public modes, explicitly open initial
  configuration, exact server-time deadlines and private membership checks.
- `policy.ts`: admission/draining primitives; application rules must enforce
  their equivalents using trusted records/time, not client assertions.

The concrete Bricks server/UI/mail/publication adapters live in `server/operating`.
The game integration and Firebase rules are Bricks-specific. See
[architecture and reuse](../../docs/OPERATING_CONTROLS.md) and
[private setup](../../docs/OPERATING_SETUP.md).

Use a separate database/HMAC secret/provider key per project. Never put real
emails, allowlist exports, credentials, cookies or raw tokens in Git, frontend
variables or logs. The email provider necessarily sees each recipient and link.
The recipient browser necessarily handles its own fragment key. Administrator
email-login keys and private-room invitations are different capabilities.

`npm test` includes core, SQL/HTTP, OAuth/mail contract and local workerd D1 tests.
`npm run test:operating` tests the admin UI and solo admission in real HTTPS
Chromium with test adapters. `npm run test:firebase` checks actual emulator rules
and multiple browser identities. These do not establish deployed D1 concurrency,
actual mail delivery or production IAM/RTDB behavior. Repeat those checks before
publishing a reuse package for a second project.
