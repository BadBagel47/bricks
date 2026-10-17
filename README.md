# Bricks

A portable React + TypeScript + Vite falling-block puzzle game, developed in controlled milestones. Current scope: **Milestone 1.3 — playable single-player integration**. The site includes keyboard gameplay, a next-piece preview, score/level/line HUD, pause and game-over screens, and configurable keyboard bindings.

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
npm run preview -- --host 0.0.0.0
```

The first visit requires a player name. It is stored locally in the browser and can be changed in Settings.

## GitHub Pages

`.github/workflows/pages.yml` lints, tests, builds, and deploys the site on pushes to `main`. It can also be run manually from the Actions tab. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions** before deployment. No paid services or application secrets are required by the workflow.

The expected address after successful deployment is `https://badbagel47.github.io/bricks/`. The build uses relative asset URLs so it can also be hosted elsewhere.

## Project instructions

- `BRICKS_SPEC.md`: complete product specification.
- `AGENTS.md`: concise working instructions.
- `PROGRESS.md`: implemented scope, checks, and next review checkpoint.
- `docs/ENGINE.md`: engine API, deterministic piece algorithm, rotation, gravity, scores, level thresholds and developer scenarios.
