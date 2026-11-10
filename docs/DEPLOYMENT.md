# Public deployment (Phase 4)

Owner decision 2026-11-10: Bricks is published at **https://bricks.trythis.one**
using GitHub Pages with a custom domain, for now. This replaces the
specification's Firebase Hosting step until the owner decides otherwise.
Firebase (Anonymous Auth and Realtime Database, project `bricks-8f56b`) is still
used for identity and all multiplayer communication; only the static files are
served by GitHub Pages.

## How it is served

- `.github/workflows/pages.yml` lints, tests (unit, Firebase emulator, browser),
  builds and deploys `dist/` on pushes to `main`.
- The build uses relative asset URLs (`base: './'` in `vite.config.ts`), so the
  same artifact works at the domain root and under `/bricks/`.
- Invite links are derived from the current page URL (`inviteURL(code,
  location.href)`), so they automatically use `bricks.trythis.one`.
- Deployment uses a GitHub Actions workflow, so GitHub ignores a `CNAME` file in
  the artifact. The custom domain is configured in repository settings only.

## One-time owner setup

1. **DNS** at the provider for `trythis.one`: add
   `CNAME bricks → badbagel47.github.io` (no path, no `/bricks`).
2. **GitHub** → repository **Settings → Pages → Custom domain**: enter
   `bricks.trythis.one` and save. Wait for the DNS check, then enable
   **Enforce HTTPS** once the certificate is issued (can take up to about an
   hour). Verifying the domain under the GitHub account's
   **Settings → Pages → Verified domains** protects it from takeover.
3. **Firebase console** → Authentication → Settings → **Authorized domains**:
   add `bricks.trythis.one`.
4. **Google Cloud console** → APIs & Services → Credentials: if the Web API key
   has HTTP-referrer restrictions, add `https://bricks.trythis.one/*`. If it has
   no referrer restrictions, nothing is needed.

No repository variables change: the public Firebase Web App values stay as they
are. No paid service is activated.

## Effect of the origin change

Browsers isolate storage per origin. After moving from
`badbagel47.github.io` to `bricks.trythis.one`:

- Player name, settings, solo highscores and local match history saved on the
  old address are not visible on the new one.
- The Firebase anonymous identity is stored per origin, so returning players get
  a new UID. Rooms reserved by the old UID cannot be reopened as host from the
  new address. Codes stay reserved (no expiry is implemented).
- GitHub redirects `https://badbagel47.github.io/bricks/` to the custom domain
  once it is configured, so old invite links still open the game but follow the
  rules above.

No migration is implemented; this is accepted for the preview period.

## Phase 4 verification checklist

Record each item as observed, with date and device. The cloud agent environment
cannot reach the live site (proxy 403), so these require the owner or an
environment that allows the domain.

- [ ] `https://bricks.trythis.one` loads over HTTPS with a valid certificate;
      `http://` redirects to `https://`.
- [ ] Desktop and mobile usability (keyboard, touch controls, layout).
- [ ] Copied invite link uses `bricks.trythis.one/?room=CODE` and joins.
- [ ] Room reopening by the host from the new address.
- [ ] Unknown room code shows the room-not-found error.
- [ ] Anonymous sign-in succeeds (no `auth/unauthorized-domain` or
      `API_KEY_*` error).
- [ ] A full Score Duel and a full Battle complete with results and local
      rankings.
- [ ] Rematch, and reconnection after a brief network interruption.
- [ ] Firebase console usage (connections, downloads, storage) stays well within
      Spark limits; see `FIREBASE_QUOTA.md`.

## Maintenance

- Releases: merge reviewed work to `main`; the site is live only after the
  Pages workflow succeeds. Use `?v=<commit>` to bypass caches when checking.
- Rules: `firebase/database.rules.json` is published by the owner from the
  tested commit before the matching client reaches `main` (see
  `MULTIPLAYER.md` and `FIREBASE_ACCESS.md`).
- Domain: keep the DNS record and GitHub custom-domain setting together;
  removing the setting while the CNAME remains allows subdomain takeover unless
  the domain is verified.
- Monitoring: check Firebase usage and Auth/Database errors periodically, and
  before any wider announcement. Abuse and trust limits are in
  `PHASE3_REVIEW.md`.
- Switching later to Firebase Hosting requires a deploy identity (see
  `FIREBASE_ACCESS.md`) and is a separate owner decision.
