# Bricks progress

- **Phase:** 1 — Playable single-player
- **Milestone:** 1.1 — Project foundation and interface
- **Status:** Foundation implemented; visual browser review pending

## Completed
- Initial React + TypeScript + Vite scaffold.
- First-launch username onboarding with local persistence.
- Responsive dark-first main menu, original text/block mark, personal-name settings, and multiplayer Coming Soon state.
- Full master specification saved in `BRICKS_SPEC.md`.

## Tests
- `npm ci --no-audit --no-fund` — dependencies installed (npm cache redirected to `/tmp`).
- `npm run build` — passed (TypeScript and Vite production bundle).
- `npm run lint` — passed (Oxlint).
- `npm run dev -- --host 0.0.0.0` — started; local HTTP request returned the app HTML.
- GitHub Pages preparation: `npm run lint` and `npm run build` passed; production HTML, favicon, JavaScript, and CSS returned HTTP 200 when hosted under `/bricks/` locally.

## GitHub Pages preview
- Owner approved GitHub Pages as temporary hosting for Milestone 1.1.
- Relative build asset URLs and `.github/workflows/pages.yml` added. Pushes to `main` build and deploy using GitHub Actions.
- Repository Pages source must be set to **GitHub Actions**. Deployment is not yet verified.
- GitHub API access is blocked by the current outbound network policy (`api.github.com`: CONNECT 403). Existing HTTPS Git access works; upload is being checked separately.

## Known limitations
- Gameplay, high scores, input/audio settings, mobile controls, and gamepad support are not implemented; they belong to later Phase 1 milestones.

## Next
- Milestone 1.1 review. Core gameplay (Milestone 1.2) requires the specified model recommendation and review checkpoint.

## Recommended model
- GPT-6 Luna, Low/Medium for Milestone 1.1.
