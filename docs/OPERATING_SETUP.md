# Operating controls: private deployment setup

This is a staged implementation, not an already provisioned service. Keep the
existing Pages deployment running while completing these steps. No billing
upgrade or paid plan is authorized. The owner selected `system@trythis.one` and reports Mailjet DNS verification
complete through Cloudflare; actual delivery still requires a live test.

## Accounts and configuration

Use Cloudflare Workers Free with one D1 database and a Mailjet transactional sending account.
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

2. Use the verified `trythis.one` sender domain in Mailjet and use the **actual records it
   generates** to verify it. The owner reports the DNS records are already verified; do not repeat or
   replace existing records unnecessarily. Preserve existing apex MX/SPF;
   do not add conflicting SPF records. Correct DNS does not guarantee inbox
   placement. Use a sending-only key restricted to this sender where available.

3. Create a dedicated service account in the existing Firebase project. Give it
   the necessary Realtime Database data permissions, not Project Owner/Editor.
   A database administrator role includes more than the operating paths: IAM
   does not provide the path isolation used by RTDB rules here. Test the actual
   principal's permissions before rollout. If organization policy forbids keys,
   first consider a supported keyless credential broker. A policy change is an
   owner decision; use a project-scoped exception only when explicitly authorized,
   and restore the inherited restriction after creating the necessary key.

   The Worker uses a privately stored service-account key to obtain short-lived
   OAuth tokens. Every normal REST request includes a restricted publisher
   `auth_variable_override`; the tested rules allow that identity to access only
   the operating records and specified room/reservation paths. The **underlying
   credential remains powerful** and must be protected. Never place it in Pages,
   frontend code, repository variables or an administrator's browser.

   **Observed Bricks setup, for reuse:** Google blocked key creation with the
   legacy constraint `iam.disableServiceAccountKeyCreation`. The distinct managed
   constraint `iam.managed.disableServiceAccountKeyCreation` was not enforced;
   checking it alone did not explain the legacy block. The project owner account
   could see the legacy policy through the service-account key creation error's
   **View policy** link, but could not edit it. The organization admin needed
   access to the project and Organization Policy Administrator privileges; the
   owner chose a temporary exception for project `bricks` only. On the legacy
   policy page, **Manage policy → Override parent's policy → Add a rule →
   Enforcement Off → Done → Set policy** permitted the owner to create a JSON
   key. The owner then reports restoring **Inherit parent's policy**. Verify the
   effective legacy status is Enforced afterward; re-enforcing blocks future key
   creation, not existing keys. Never use or copy Bricks' service-account key,
   HMAC secret, allowlist or database for another project. Evaluate keyless
   federation independently; it was not validated for this Worker.

   Cloudflare D1 Console's long mobile paste was truncated in this setup. If
   using the dashboard, execute the schema in smaller complete statements and
   verify all six tables **and indexes**; six table names alone do not prove the
   full schema. Keep the selected data jurisdiction in mind. A separate account
   or browser profile can help when Google silently switches logged-in users.

4. Set Worker secrets interactively, without placing values in command arguments:

   ```sh
   npx wrangler secret put SUBJECT_SECRET --config wrangler.operating.jsonc
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --config wrangler.operating.jsonc
   npx wrangler secret put FIREBASE_API_KEY --config wrangler.operating.jsonc
   npx wrangler secret put MAILJET_API_KEY --config wrangler.operating.jsonc
   npx wrangler secret put MAILJET_SECRET_KEY --config wrangler.operating.jsonc
   npx wrangler secret put MAIL_FROM --config wrangler.operating.jsonc
   ```

   `SUBJECT_SECRET` must be randomly generated with at least 32 characters; use
   the same value for this project's private setup CLI. `FIREBASE_SERVICE_ACCOUNT`
   is the complete private JSON credential. `FIREBASE_API_KEY` is the existing
   public Web App API key, used to verify anonymous player tokens in this project.
   `MAIL_FROM` must be `system@trythis.one` (plain email address). Store both Mailjet
   keys using the private Worker secrets interface; never send them in chat.
   Authentication links last 1 hour; administrator sessions last 8 hours.
   The owner reports Mailjet Free at 200/day and 6,000/month. Set
   `DAILY_MAIL_LIMIT` to 90 (or lower): at most 2,790 attempts in a 31-day
   month from this project. Account sharing requires summing all projects'
   limits and other mail traffic; do not infer separate budgets per API key.

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

Runtime lesson from the first live check: Cloudflare Workers does not implement
Fetch `redirect: 'error'`. It throws before sending the request. All Worker-side
Google, Firebase and Mailjet requests must use `redirect: 'manual'` and reject
non-success status codes (including 3xx), never follow credentials to a redirected
host. Node-only adapter tests did not expose this incompatibility; the regression
test in `tests/operating-runtime.test.ts` bundles the actual adapters and exercises
all four in workerd, including redirect refusals. Source:
https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/workers/runtime-apis/request.mdx

For this repository, `.github/workflows/pages.yml` includes an optional preview
Worker deployment job. Store a dedicated Cloudflare token as GitHub repository
**Actions secret** `CLOUDFLARE_API_TOKEN`, limited to the intended account, with
Workers Scripts Edit and D1 Edit for deployment. Any additional account-read
permission must be justified by an actual API denial. It is not a frontend/Vite
variable and must never enter chat. A push on `feature/operating-controls` whose
message contains `[deploy operating]` triggers deployment only after all checks
pass; it extracts the checked `github-pages` artifact instead of rebuilding with
different Firebase values. Normal feature pushes do not deploy the Worker.
This does not initialize Firebase or provision administrators. Keep those steps
in the order below. Worker secrets already entered through the dashboard remain
server-side; ordinary variables (including MAIL_FROM) are declared in Wrangler.

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
