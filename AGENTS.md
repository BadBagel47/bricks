# Agent instructions

Follow the shared agent rules at
https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md
(repo `BadBagel47/agent-rules`; fetch it via GitHub if the link cannot be read).
Read them at the start of every session.

- Current state, decisions and next steps: [HANDOFF.md](HANDOFF.md).
- Backlog (features, bugs, tasks, proposed runs): [docs/BACKLOG.md](docs/BACKLOG.md).
- Product requirements: [BRICKS_SPEC.md](BRICKS_SPEC.md).

## Project rules (Bricks)

These add to the shared agent rules. Owner decisions behind them are recorded under *Decisions* in `HANDOFF.md`.

### Product
- [BRICKS_SPEC.md](BRICKS_SPEC.md) is the product source of truth (section 5.0 is the approved visual design).
- Bricks is a hobby game for casual play with friends. Prioritize Firebase Spark quota efficiency and simple operation; advanced anti-cheat or server-authoritative competition is not a priority. Keep normal identity and database authorization protections. No paid service or billing upgrade without owner approval.
- Keep interface copy direct and functional. Keep the headline "Make room for one more."; no decorative subheadings, slogans, menu descriptions or footers. Necessary instructions, validation and availability status stay.
- Operating controls: separate public 1 Player and 2 Players On/Off/Until, administrators may play while public play is closed, and shared private room invitations bypass public closure but stay private while public play is on. Admitted games finish after closure; new starts and rematches are denied.
- Music: new music keeps a stable BPM and expresses danger through intensity, not tempo. Exception: *Bricks Theme* keeps its danger tempo rise (132 → 172 BPM). Music proposals and the shared test player live in `docs/music/`.

### Code
- Keep gameplay rules independent from React, rendering, input, audio, persistence and multiplayer. Prefer small, testable modules; avoid unnecessary dependencies or rewrites.
- Work in the existing checkout; do not create a worktree. Only one agent works in the repository at a time.

### Workstreams and publishing
- Music is composed in a separate "music studio" chat, which also integrates approved tracks into `src/audio/` and the docs (F-006). Other agents leave `src/audio/music.ts` and music behavior alone unless the owner asks.
- Publishing: push to `main` after every run (CI deploys https://bricks.trythis.one; temporary breakage is acceptable because the owner is the only tester). When `server/operating/` or `wrangler.operating.jsonc` changes, also merge `main` into `feature/operating-controls` with `[deploy operating]` in the merge message to deploy the admin Worker. Firebase rule changes are published by the owner before the client that depends on them.

### Documentation
- At the end of every run, update the backlog status, the *Unreleased* section of `CHANGELOG.md`, `PROGRESS.md` and the current state in `HANDOFF.md`; add an ADR in `docs/adr/` for any significant new decision.
- IDs are `F-` (feature), `B-` (bug) and `T-` (operational or owner task), see `docs/BACKLOG.md`.
