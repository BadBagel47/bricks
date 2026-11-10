# Changelog

All notable changes to Bricks are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The project does
not publish version numbers yet; entries are grouped by deployment.

## [Unreleased]

Deployed to the Worker preview (`feature/operating-controls`, merge `89b856c`);
not yet on the public GitHub Pages site.

### Fixed
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
