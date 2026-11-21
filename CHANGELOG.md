# Changelog

All notable changes to Bricks are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The project does
not publish version numbers yet; entries are grouped by deployment.

## [Unreleased]

### Added (2026-11-21, F-057, F-058)
- F-057: Modern rule "Pieces above the board": when the top is full, a new piece can appear above the board instead of ending the game at once; a piece that locks above the board ends it. Also a Custom switch and in Cloudflare matches with Modern.
- F-058: Custom switch "Modern scoring" (off by default, 1 Player): T-spins, back-to-back and combos score as in modern games.

### Fixed (2026-11-21, B-040)
- B-040: tapping 2 Players on a page opened before a new version was published no longer turns the screen black: the page reloads once and opens 2 Players, or shows a short message with Try again and Main menu.

### Added (2026-11-21, F-061)
- F-061: own touch layout: Settings → Edit layout lets players drag and resize the two button groups and set the board's height on a copy of the 1 Player screen; Reset returns to the standard layout. Used in 1 Player when the device is upright.

### Removed (2026-11-21, F-059)
- F-059: the Row touch layout (one row of buttons) and its choice in Settings; everyone uses Split.

### Added (2026-11-21, F-056)
- F-056: Settings → Repeat delay (Short / Normal / Long) and Repeat speed (Slow / Normal / Fast) for held buttons on touch, keyboard and controller; Normal keeps the earlier timing.

### Fixed (2026-11-21, B-039, B-036, T-014)
- B-039: iPad in landscape and other wide touch screens without a mouse show the touch controls and the Pause button (Split in the bottom corners beside the board; Row and Swipe below it).
- B-036: the Battle help text says that clearing 2 or more lines at once sends garbage rows.
- T-014: the Cloudflare two-player tests check that Battle garbage rows reach the other player.

### Fixed (2026-11-20, B-037, B-038)
- B-037: the whole Hard Drop button reacts again (B-035 had given its lowest part to the arrows, which made it hard to press); the larger gap below it stays and belongs to the arrows.
- B-038: on iPad and other tablets in portrait the match boards grow to use the screen, and on tablets and wider screens the match top bar and score cards are as wide as the boards instead of the whole screen.

### Fixed (2026-11-20, B-035)
- B-035: Hard Drop is no longer pressed by mistake when aiming at the arrows below it (Split): more space between them, and the arrows also answer in the gap and on the lowest part of the Hard Drop button.

### Fixed (2026-11-20, second run A)
- B-030: the Cloudflare match top bar fits on phones: the room code without its label, tighter chips, and the connection status as its coloured dot; the countdown reads Connected instead of Synchronizing….
- B-033: 1 Player on short landscape phones with the Row layout no longer scrolls a few pixels; on the smallest (about 568 × 320) the Next and Hold boxes are only as tall as the pieces.

### Changed (2026-11-20, run A)
- F-060 (test): with Split and two rotate buttons the Hold button sits with the rotate buttons, which move further apart: below the orange rotate button (Bottom, default) or in the free top corner above the other one (Top), chosen in Settings → Hold button while both are tried; mirrored for left-handed. One placement is removed after the test.
- F-063: on phones in portrait the 1 Player top bar follows the columns below it: the logo is centred over the board (smaller where the board is narrow) and Pause is as wide as the side column.
- F-064: no fullscreen button on the start screen in the home-screen app, which is always fullscreen.

### Fixed (2026-11-20, run A)
- B-034: in 2 Players on smaller phones the side column no longer runs under the rotate buttons, so level and lines are visible again: the two later Next pieces sit side by side, the Next and Hold boxes are only as tall as the pieces, and on short phones the opponent's board is a little smaller.

### Changed (2026-11-20)
- F-062: the Block colors choice Modern is now called Vivid, so it is not confused with the Modern rules.

### Added (2026-11-20, run D)
- F-046, F-052 – F-055: Rules in Settings → 1 Player: Classic (as the NES game), Modern (the new default: 7-bag piece order, SRS wall kicks, lock delay, 3 next pieces, Hold and ghost piece) or Custom (the six rules as switches, starting from the preset chosen before). High scores show which rules they were played with; older scores count as Classic. Cloudflare matches have a Classic / Modern match setting instead of Hold Piece (Modern by default); Firebase matches stay Classic.

### Changed (2026-11-20, run D)
- Hold Piece (1 Player) and Ghost piece (Display) are no longer separate settings; they are part of the rules.

### Changed (2026-11-20, run C)
- F-050: a Hold touch button when Hold is on: in Split in the pad's free top corner (outer side), in Row last in the row (the seven Row buttons may be drawn down to 36 px on narrow phones); also in the Settings preview. The Hold box can still be tapped.
- F-048, F-049: the Game effects and Interface animations settings are gone; effects and animations are always on, except when the system asks for reduced motion.
- F-051: clearer borders around dark buttons, cards and fields.
- F-047: animations where things appeared abruptly: the QR code, notices, the opponent joining the lobby, the room code tiles, the tiles of a typed code, touch-control options and preview in Settings, Start Match becoming available, the 2 Players result screen and the return to the lobby.

### Fixed (2026-11-20, run C)
- B-032: touch buttons answer in the empty space around them (gaps, the corners of the round rotate buttons, towards the screen edges); on a 390 px phone the reacting share of the control strip went from 35 % to 89 % (Split) and from 45 % to 90 % (Row).

### Changed (2026-11-19, run B)
- F-045: on the start screen the logo and the menu buttons are equally wide: narrower buttons on phones, a larger logo on tablets in portrait.
- F-044: Copy Invite Link has the outlined style of Copy Code and QR Code; orange is kept for Start Match and selected options.
- F-043: switching between Firebase and Cloudflare on the 2 Players screen cross-fades like other screen changes.

### Fixed (2026-11-19, run B)
- B-031: the invitation QR code's white box stays square (it could be taller than wide on iPad).

### Changed (2026-11-19, run A)
- B-029: a Cloudflare match counts down with large bricks under "First brick in": each second a new brick with the remaining seconds drops onto a pile, in the logo's colours and tilts, over the dimmed match screen.
- F-041: Split is the default touch layout and comes first in Settings; earlier saved Row choices move to Split once. On short landscape screens the Split buttons sit in the bottom corners beside the board; in a landscape match the pad sits above the rotate buttons.
- F-040: in the Row layout, a gap separates left/right from the other buttons (also in the Settings preview).
- F-042: the invitation QR code closes when the second player joins.
- B-026: tablets in portrait stack the logo, headline and menu buttons as on phones.
- B-027: the room buttons in the 2 Players lobby wrap centred, so the QR Code button no longer sits alone at the left.

### Fixed (2026-11-19, run A)
- B-028: when one player leaves a Cloudflare match, the other player's game stops (board frozen, music off) instead of running on behind the note.

### Added (2026-11-19)
- F-039: a QR Code button next to Copy Invite Link in the 2 Players lobby (Firebase and Cloudflare) shows the invite link as a QR code.
- T-012: network-kit 0.17.0 (quota protection, quieter notices on untouched pages); network-kit's default room caps are kept.
- T-011: network-kit's update workflow proposes new network-kit fix versions as a tested branch with an issue.
- F-038: reloading the page during a Cloudflare match continues the match instead of ending it.
- F-028: 2 Players can run on Cloudflare (network-kit rooms in the EU) next to Firebase: a *Server* switch on the 2 Players screen (Firebase first), six-character room codes, invite links and lobbies made on network-kit's admin page, *Rejoin Last Room*, Score Duel and Battle with results, rematch and pause on a lost connection. Received data is checked in the browser. The privacy text in Settings mentions the Cloudflare rooms.
- F-036: both 2 Players versions measure the connection the same way; the result screen shows a line and Settings → Connection compares the latest matches.

### Added (2026-11-18)
- F-034: Settings has Drop / Hard Drop / Both instead of the Hard Drop switch (default Both); the choice applies to touch buttons, swipe, keyboard and controller, and with one drop button the three buttons form one row centred beside the rotate buttons.
- F-035: new browser tab and home screen icon: the logo's B tile in orange, tilted as in the logo.
- F-033: a fullscreen button next to Settings on the main menu; the choice is remembered and restored at the first tap next time. The game can be added to the home screen and then opens as an app without browser bars.

### Fixed (2026-11-19)
- B-025: network-kit 0.15.1: with a game link in the browser, the check whether 2 Players is open and the admin page's notices work again (they were refused by the browser and read as open).

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
