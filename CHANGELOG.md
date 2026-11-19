# Changelog

All notable changes to Bricks are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The project does
not publish version numbers yet; entries are grouped by deployment.

## [Unreleased]

### Added (2026-11-19)
- F-028: 2 Players can run on Cloudflare (network-kit rooms in the EU) next to Firebase: a *Server* switch on the 2 Players screen (Firebase first), six-character room codes, invite links and lobbies made on network-kit's admin page, *Rejoin Last Room*, Score Duel and Battle with results, rematch and pause on a lost connection. Received data is checked in the browser. The privacy text in Settings mentions the Cloudflare rooms.
- F-036: both 2 Players versions measure the connection the same way; the result screen shows a line and Settings → Connection compares the latest matches.

### Added (2026-11-18)
- F-034: Settings has Drop / Hard Drop / Both instead of the Hard Drop switch (default Both); the choice applies to touch buttons, swipe, keyboard and controller, and with one drop button the three buttons form one row centred beside the rotate buttons.
- F-035: new browser tab and home screen icon: the logo's B tile in orange, tilted as in the logo.
- F-033: a fullscreen button next to Settings on the main menu; the choice is remembered and restored at the first tap next time. The game can be added to the home screen and then opens as an app without browser bars.

### Fixed (2026-11-18)
- F-037: danger music now ends as soon as the top six rows are empty again, as in NES Tetris, instead of staying until the stack is below the top nine rows.
- B-022: the home screen icon fills the phone's icon shape (maskable icons) instead of a small square in a white shape.
- B-023: tapped buttons no longer keep the hover outline on phones; hover effects only apply with a mouse.

### Changed (2026-11-18)
- B-020: the main menu logo fits narrow phones, so the menu can no longer be nudged sideways.
- B-021: the Score Duel reconnect test keeps dropping until Game over and explains what it saw if it fails.
- F-032: the logo on the phone game screen is a little smaller and centred vertically on the Pause button.
- B-019: more room (32 px) between the counterclockwise rotate button and the right arrow in the Split layout.
- F-030: text in the game can no longer be selected or copied, and phones show no text menu on long press; text fields stay editable (the admin page is unchanged).
- F-031: on phones the logo on the 1 Player game screen is larger and the touch controls fill the free space below the board; the board keeps its size. The *Button size* setting is removed.

### Added (2026-11-15)
- T-006: a *Privacy* section at the bottom of Settings says what is saved on the device and what Google Firebase, Cloudflare and GitHub Pages receive.

### Fixed (2026-11-15)
- B-018: pressing buttons and touch controls on phones no longer shows the browser's blue tap highlight.

### Changed (2026-11-15)
- T-007: review of text, names and assets found no "Tetris" name or logo in the game; the Retro level palettes are original. A change of the Modern piece colors was made and reverted at the owner's request (parked as F-027).

### Changed (repository, 2026-11-15)
- Adapted to the shared agent rules v1.7 (no change needed).
- Boomers planning moved to https://github.com/BadBagel47/boomers and the shared room server plan to https://github.com/BadBagel47/network-kit ; F-007 now covers moving 2 Players there later.

### Changed (repository, 2026-11-13)
- Adapted to the shared agent rules v1.6: the branch-archive workflow now uses the shared template, which never archives or deletes the default branch.

### Changed (repository, 2026-11-12)
- Adapted to the shared agent rules v1.3: Bricks project rules now live in `AGENTS.md`, `HANDOFF.md` holds current state and decisions, older handoff history moved to `PROGRESS.md`, eleven old branches archived as `archive/*` tags.

### Added (2026-11-12)
- F-025: the logo on the 1 Player game screen is centred and a little larger; the board and controls keep their positions.
- F-023: touch rotation both ways: *Rotate buttons* One/Two (Two by default: ↺ beside ↻), *Layout* Row/Split (two-thumb layout with round rotate buttons) and a live preview in Settings. In Swipe mode a tap on the left half rotates ↺, on the right half ↻.
- F-024: block colors *Retro* (NES style, formerly "Change by level"), *Tones* (new: every piece filled in shades of the level's colors) and *Modern* (fixed colors, formerly "Classic").
- F-022: game effects: cleared rows flash and shrink away, the blocks above fall into place, hard drops bump the board and level-ups pulse the Level box. Setting *Game effects* (Display), also on your own board in 2 Players.
- F-021: interface animations: screens cross-fade, segmented controls and High Scores tabs slide, switches spring, dialogs pop in, lists and menu buttons fade in. Setting *Interface animations* (Display).

Deployed to the Worker preview (`feature/operating-controls`, merge `89b856c`);
not yet on the public GitHub Pages site.

### Changed (run 5, 2026-11-12)
- F-015: new match result screen: outcome headline, two player cards, Battle comparison (survived, rows sent, cancelled), head-to-head record with the last four matches, top 3 and Rematch/Main Menu kept at the bottom.
- F-016: 1 Player game over with large final score, record badge, Level/Lines/Best and a top 5 with the new entry highlighted.
- F-019: High Scores shown as card rows; the player's own multiplayer entries are marked "(you)".
- F-017: pause dialog shows score, level and lines, has Music and Sound effects switches, Restart and Main menu.
- F-018: name entry centred under the logo with a character counter.
- F-020: consistent 1 px outlines on panels, chips, tab bars and secondary buttons; the room code is a chip in the match bar.
- B-009: top bars sit at the same edge on game and match screens; the match Back button has the standard size.

### Fixed (run 5, 2026-11-12)
- B-017: the start page no longer scrolls on phones (pages follow the visible screen height).
- B-016: pieces in the block color preview are centred; on phones the Score/Level/Lines row spans the full width again.
- B-011: top bars line up with the content on wide screens; phones use one edge on every screen.
- B-012: focus outlines only after Tab, never on headings or dialogs.
- B-014: Space can no longer restart from the game-over dialog.
- B-015: menu buttons have larger text; the best score is no longer on the 1 Player button.
- B-004: opponent board updates more often and more evenly (writes spaced from their start, early arrivals retried).
- B-005: focus outlines only appear after keyboard navigation.
- B-006: pressing Space right at game over no longer starts a new game.
- B-007: games without points are no longer saved as high scores.
- B-008: Next and Hold pieces are centred exactly.
- B-010: the admin page no longer shifts sideways when switching tabs.

### Changed (run 4)
- F-010: match screen: the Battle debug line is hidden (kept for screen readers and tests), the opponent's name appears once (score row), level and lines moved to the side column, larger own board.
- F-011: 2 Players start screen with *Host a game* and *Join a game* cards; the room code is typed into letter tiles; "Playing as" in the top bar.

### Changed (run 3)
- F-012: High Scores has tabs (1 Player / Score Duel / Battle); empty tabs offer a Play button; top three ranks are highlighted.
- F-013: Settings, High Scores and 2 Players share a top bar with a back icon and the page title (replaces the "Back to menu" pill).
- F-014: on the main menu, "Playing as" opens the name settings and the 1 Player button shows the best local score.
- T-004: repository adapted to the shared agent rules v1.0: `AGENTS.md` is now a reference, project rules moved to `HANDOFF.md` (renamed from `HANDOVER.md`), backlog uses High/Medium/Low and a Done table.

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
