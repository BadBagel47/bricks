# Changelog

All notable changes to Bricks are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The project does
not publish version numbers yet; entries are grouped by deployment.

## [Unreleased]

Deployed to the Worker preview (`feature/operating-controls`, merge `89b856c`);
not yet on the public GitHub Pages site.

### Changed (run 2)
- F-002: lobby rebuilt per the sketch: room-code tiles with *Copy Invite Link* /
  *Copy Code*, player cards (Host/Guest, connection status), mode summary with a
  one-line rule explanation and compact rows (starting level, Hold, guest
  approval); the editor uses a segmented Score Duel / Battle choice.
- F-004: match screen per the sketch: leave button, mode and connection chips,
  room code, score row with the signed difference, own board with Battle
  incoming-garbage meter, side column with the opponent board, Next, Hold and
  an incoming badge; landscape uses a right-hand column. 1 Player: icon pause
  button and two-digit level.

### Added (run 2)
- F-005: multiplayer sounds: countdown tick/go, garbage sent/incoming/rise,
  victory and defeat.

### Documentation
- Phase 4 deployment plan for bricks.trythis.one merged from a parallel session
  (`docs/DEPLOYMENT.md`); owner steps tracked as T-003.

### Added (music)
- F-009: shared owner music test player (`docs/music/player.html`, built by
  `npm run music:player`) in the game's style: the current game theme plays
  through the game's own voices next to the proposals Night Shift, Stackline,
  Troika and the previous music, with timeline, danger, level, volume, BPM and
  ranking. Music proposals from `main` merged into this branch.

### Changed (audio internals)
- Web Audio voices moved from `BricksAudio` into `src/audio/web-voices.ts`
  (`VoicePool`) so the game and the test player sound identical; music notes
  carry a channel tag for visualization. No audible change.

### Deployment
- Public release on https://bricks.trythis.one from `main` (T-002, T-003):
  visual refresh, runs 1–2, B-002, B-003, F-009 and operating controls. Agents
  now publish by pushing to `main`.

### Fixed
- B-003: the opponent board updates about five times per second instead of
  twice, so it lags less and moves more evenly (client and rules: 200 ms).
- B-002: in Score Duel both devices now start gravity from the shared match
  start, so the first pieces fall together.
- B-001: Revoke is offered only for active, unexpired invitations.

### Added
- Generated soundtrack: original 16-bar four-channel theme with danger tempo and
  hysteresis; 22 named sound effects (`docs/AUDIO.md`).
- Personal Settings: *Block colors* (Change by level / Classic) and *Ghost piece*
  (off by default).
- Tappable Hold box for touch play.
- Documentation: `docs/BACKLOG.md`, `CHANGELOG.md`, `docs/adr/`, `CLAUDE.md`.

### Changed
- F-001: admin page rebuilt per the sketch: *Public access* / *Private invitations*
  tabs, segmented On / Off / Timer per mode with status badges, invitation rows
  with Active / Expired / Revoked badges and a Play/Refresh/Sign out bar.
- F-003: Settings rebuilt per the sketch: sections Personal, Display, 1 Player,
  Audio, Keyboard, Controller; segmented Touch controls (Buttons / Swipe) and
  Block colors, live color preview, Starting Level stepper, grouped rows.
  Heading is now "Settings".
- New visual design (spec section 5.0): navy theme, tile logo, five-button touch
  row, restyled menus, settings, lobby, match, results and admin page.
- Level palettes now use two colors per level in an NES-inspired style.

## Before this changelog

Phases 1–3 (single player, settings, audio v1, highscores, multiplayer with
Score Duel/Battle, results, rematch and recovery) and the operating controls are
recorded in `PROGRESS.md` and the Git history.
