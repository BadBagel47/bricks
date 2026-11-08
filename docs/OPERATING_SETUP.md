# Operating controls: private deployment setup

This is a staged implementation, not an already provisioned service. Keep the
existing Pages deployment running while completing these steps. No billing
upgrade or paid plan is authorized. Domain selection remains open; `l8p.one` is
only a tentative sender domain.

## Accounts and configuration

Use Cloudflare Workers Free with one D1 database and a Resend sending account.
Confirm the current allowance in each account before deployment; do not enable
an automatic paid upgrade. Use a separate D1 database, HMAC secret and provider
key for each project. If provider accounts are shared, ensure the **sum** of all
projects' mail caps fits the provider allowance.

Keep administrator emails, allowlist exports and credentials out of Git, GitHub
variables, workflow logs, Vite variables and chat. The email provider and intended
recipient necessarily see individual messages; the complete allowlist stays
private. Worker observability is disabled in the template; do not enable body,
Cookie or Authorization logging. Disable email click tracking/link rewriting for
these authentication messages where the provider supports that setting.

The public game stays on GitHub Pages. The Worker serves `/admin/` and its own
`/play/` copy of the game. This keeps administrator sessions first-party; it does
not require moving the public game or domain DNS to Cloudflare.

1. Create the D1 database using the installed, lockfile-pinned Wrangler:

   ```sh
   npx wrangler login
   npx wrangler d1 create bricks-operating --config wrangler.operating.jsonc
   ```

   Put its database ID and the actual HTTPS Worker origin into the configuration
   template. These identifiers are not administrator credentials. Apply schema:

   ```sh
   npx wrangler d1 execute bricks-operating --config wrangler.operating.jsonc --remote --file modules/access-control/schema.sql
   ```

2. Select a sender domain/subdomain in Resend and use the **actual records it
   generates** to verify it. A subdomain such as `spel.l8p.one` is an example,
   not an instruction to edit that domain now. Preserve existing apex MX/SPF;
   do not add conflicting SPF records. Correct DNS does not guarantee inbox
   placement. Use a sending-only key restricted to this sender where available.

3. Create a dedicated service account in the existing Firebase project. Give it
   the necessary Realtime Database data permissions, not Project Owner/Editor.
   A database administrator role includes more than the operating paths: IAM
   does not provide the path isolation used by RTDB rules here. Test the actual
   principal's permissions before rollout. If organization policy forbids keys,
   stop this setup and configure a supported credential broker instead; do not
   weaken organization policy.

   The Worker uses a privately stored service-account key to obtain short-lived
   OAuth tokens. Every normal REST request includes a restricted publisher
   `auth_variable_override`; the tested rules allow that identity to access only
   the operating records and specified room/reservation paths. The **underlying
   credential remains powerful** and must be protected. Never place it in Pages,
   frontend code, repository variables or an administrator's browser.

4. Set Worker secrets interactively, without placing values in command arguments:

   ```sh
   npx wrangler secret put SUBJECT_SECRET --config wrangler.operating.jsonc
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --config wrangler.operating.jsonc
   npx wrangler secret put FIREBASE_API_KEY --config wrangler.operating.jsonc
   npx wrangler secret put RESEND_API_KEY --config wrangler.operating.jsonc
   npx wrangler secret put MAIL_FROM --config wrangler.operating.jsonc
   ```

   `SUBJECT_SECRET` must be randomly generated with at least 32 characters; use
   the same value for this project's private setup CLI. `FIREBASE_SERVICE_ACCOUNT`
   is the complete private JSON credential. `FIREBASE_API_KEY` is the existing
   public Web App API key, used to verify anonymous player tokens in this project.
   `MAIL_FROM` is the verified sender, not an administrator allowlist entry.
   Keep `DAILY_MAIL_LIMIT` at 20 or reduce it to fit the verified provider budget.

## Private setup CLI

Use Node 24 and a local file named `.operating.local`, which is ignored by Git.
Restrict its permissions to your user. Supply these fields privately:

- `PROJECT`, matching Worker `PROJECT` (`bricks`).
- `SUBJECT_SECRET`, matching the Worker secret.
- `FIREBASE_DATABASE_ORIGIN`, matching the exact project database origin.
- `FIREBASE_SERVICE_ACCOUNT`, either the private JSON object or its JSON string.
- For allow/deny: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_ID` and a private
  `CLOUDFLARE_API_TOKEN` permitted to edit this account's D1 database.

An alternative file path can be selected with `BRICKS_OPERATING_CONFIG_FILE`.
Do not share or commit the file. The CLI prompts for a single email locally;
addresses are HMAC-transformed before storage. Never put an email in a command
argument or send the private file here.

```sh
node scripts/operating-admin.mjs init
node scripts/operating-admin.mjs allow
node scripts/operating-admin.mjs deny
```

`init` creates **public singleplayer and multiplayer On** only when no operating
record exists. It retains and validates existing settings. This one fixed-path
bootstrap intentionally uses administrative OAuth access without the normal
rules override, so it can run **before** new admission rules are installed.

`allow` and `deny` require the new rules and private D1 schema. They close the
subject first, revoke old sessions, and then optionally enable it again. Enabling
requires a fresh sign-in link. A failed operation prints no identifying error
payload; retry the same operation after correcting private setup. Do not assume
success until the command reports it.

Changing the HMAC key requires reprovisioning subjects in both stores and
revoking existing access; it is not an ordinary key rotation with seamless login.

## Checked rollout order

1. Complete local checks and the focused Terra High review. Build the Worker
   game assets with the **same five public Firebase Web App values** used by
   GitHub Pages; otherwise `/play/` cannot connect to multiplayer. No private
   Worker secret may use a `VITE_` prefix. Verify the actual Firebase/API-key
   configuration allows the Worker game origin and the server-side identity
   lookup; do not assume the existing Pages hostname settings cover both.
2. Run `init` against the intended database. Read back both modes and confirm
   they are On. Do not install admission rules against a missing policy.
3. Publish the checked `firebase/database.rules.json`. Existing public clients
   remain usable because the policy is explicitly open; ongoing ready matches
   retain their existing participant-scoped permissions.
4. Deploy the Worker with its D1 binding and secrets. Initially set `GAME_URL` to
   the Worker's own `/play/` URL for private preview. Its game uses the same-origin
   API automatically. Do not distribute private invites to the older Pages build.
5. Run the private allow command for the intended administrators. Verify actual
   mail receipt with the owner, one-use confirmation, logout/revocation, D1
   behavior and real Firebase publication. This environment has not performed
   those live tests or sent mail.
6. Set GitHub Actions repository variable `VITE_OPERATING_ORIGIN` to the Worker
   HTTPS origin (no trailing slash). Merge/publish the reviewed client only after
   those checks pass. Once Pages has deployed, set Worker `GAME_URL` back to
   `https://badbagel47.github.io/bricks/` for normal invitations.
7. Test one public round and one private two-player session, including closure
   during play. Leave both public modes On unless the owner deliberately changes
   them. Inspect actual Firebase, Worker, D1 and mail usage; do not infer billed
   traffic from payload byte estimates alone.

Relevant deployment commands after setup:

```sh
npm run lint
npm test
npm run build
npm run test:browser
npm run test:operating
npm run test:firebase
npx wrangler deploy --config wrangler.operating.jsonc --dry-run
npx wrangler deploy --config wrangler.operating.jsonc
```

The last command publishes an external service; this guide does not mean that
publication has happened. In the managed environment set scoped
`XDG_CONFIG_HOME=/tmp/bricks-wrangler-config` and `WRANGLER_SEND_METRICS=false`
for local Wrangler checks. With the emulator JAR cached, unset proxy variables
only for local Firebase emulator tests as documented in the handover.

For rollback, restore the previous **tested operating-aware** client/rules and
retain the stored policy. Restoring pre-control rules removes enforcement and
can expose private rooms through their codes. Do not erase `privateRooms` markers
or reset policy to On as a generic recovery action. If the backend is unavailable,
new controlled starts fail closed while active games can finish.
