# Bricks

A portable React + TypeScript + Vite falling-block puzzle game, developed in controlled milestones. Current scope: **Milestone 1.7 — Phase 1 integration and quality review**. The playable single-player build includes keyboard/touch/gamepad input, audio, saved settings and local highscores. See `docs/PHASE1_REVIEW.md` for verification and remaining device checks.

## Development

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

If the environment's home directory is not writable, prefix the install command with `npm_config_cache=/tmp/bricks-npm-cache`.

```sh
npm run lint
npm test
npm run build
npm run test:browser
npm run preview -- --host 0.0.0.0
```

The first visit requires a player name. It is stored locally in the browser and can be changed in Settings.

The browser suite uses `playwright-core` with an installed Chromium or Google Chrome, starts its own production preview and stops it after testing. Build first. It finds `/usr/bin/chromium` or `/usr/bin/google-chrome`; set `BRICKS_CHROMIUM_EXECUTABLE` for another path. Optional `BRICKS_SCREENSHOT_DIR` saves viewport screenshots. Physical controller, mobile browser and audible output checks complement the automated suite.

## GitHub Pages

`.github/workflows/pages.yml` lints, runs unit tests, builds, runs Chromium integration tests, and deploys the site on pushes to `main`. The GitHub Ubuntu runner supplies Chrome. The workflow can also be run manually from the Actions tab. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions** before deployment. No paid services or application secrets are required by the workflow.

The expected address after successful deployment is `https://badbagel47.github.io/bricks/`. The build uses relative asset URLs so it can also be hosted elsewhere.

## Project instructions

- `BRICKS_SPEC.md`: complete product specification.
- `AGENTS.md`: concise working instructions.
- `PROGRESS.md`: implemented scope, checks, and next review checkpoint.
- `docs/ENGINE.md`: engine API, deterministic piece algorithm, rotation, gravity, scores, level thresholds and developer scenarios.
- `docs/AUDIO.md`: generated soundtrack, danger tempo, sound effects and browser audio behavior.
- `docs/INPUT.md`: keyboard, touch and gamepad defaults, remapping and gesture behavior.
