# Bricks

A portable React + TypeScript + Vite falling-block puzzle game with single-player,
multiplayer Score Duel/Battle, results, rematches and bounded recovery.

**Continuing development? Start with [HANDOFF.md](HANDOFF.md).** Current operating
controls work is on `feature/operating-controls`, including the live Worker preview;
it is not merged to main. [PROGRESS.md](PROGRESS.md) records verified checkpoints,
and [OPERATING_SETUP.md](docs/OPERATING_SETUP.md) explains private setup and reuse.
Public Pages operating-control activation remains pending.

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

The public address is `https://bricks.trythis.one` (custom domain on GitHub Pages; the old `https://badbagel47.github.io/bricks/` address redirects once the domain is configured). The build uses relative asset URLs so it can also be hosted elsewhere. Domain setup, verification and maintenance are in `docs/DEPLOYMENT.md`.

## Project instructions

- `BRICKS_SPEC.md`: complete product specification.
- `AGENTS.md`: reference to the shared agent rules (project rules are in `HANDOFF.md`).
- `HANDOFF.md`: start here — current checkpoint, documentation map and goals.
- `docs/BACKLOG.md`: open features, bugs and tasks with IDs.
- `PROGRESS.md`: implemented scope, checks, and next review checkpoint.
- `CHANGELOG.md`: released changes (Keep a Changelog).
- `docs/adr/`: architecture decision records.
- `docs/ENGINE.md`: engine API, deterministic piece algorithm, rotation, gravity, scores, level thresholds and developer scenarios.
- `docs/AUDIO.md`: generated soundtrack, danger tempo, sound effects and browser audio behavior.
- `docs/INPUT.md`: keyboard, touch and gamepad defaults, remapping and gesture behavior.
