# Bricks backlog

Planned features, fixes and operational tasks. This file is the single list of
work that is not done yet. `PROGRESS.md` records what was done; `CHANGELOG.md`
records released changes.

## Conventions

- **IDs:** `F-###` feature, `B-###` bug, `T-###` operational/owner task (Bricks keeps `T-` instead of the shared `D-`). IDs are never
  reused or renumbered. Reference them in commit messages, PRs and docs
  (for example `F-001: add admin tabs`).
- **Status:** `Idea` → `Proposed` → `Approved` → `In progress` → `Done`
  (or `Dropped`). Only the owner moves an item to `Approved`. Done items are moved to the *Done* table, not deleted.
- **Priority:** High, Medium, Low (shared agent-rules scale; converted from P1/P2/P3 on 2026-11-11: P1 = High, P2 = Medium, P3 = Low).
- **Runs:** collect approved items into one run. Start a run only after the
  owner's explicit go-ahead (for example "Kör"). Recommend a model and reasoning
  level per run before starting.
- When an item is done: set `Done`, add the commit or PR, and add a line to
  `CHANGELOG.md` under *Unreleased*.

## Open

| ID | Type | Title | Priority | Status | Suggested model |
| --- | --- | --- | --- | --- | --- |
| F-006 | Feature | More music tracks | Low | Idea | Standard |
| F-027 | Feature | Modern block colors: use a piece-color assignment that differs from the Tetris guideline (I cyan, O yellow, T purple, S green, Z red, J blue, L orange), to stay clear of trade dress. Tried 2026-11-15 (I orange, O green, T red, S blue, Z purple, J yellow, L cyan) and reverted at the owner's request | Low | Parkerad 2026-11-15 | Standard |
| F-007 | Feature | Move Bricks 2 Players from Firebase to the shared room server in BadBagel47/network-kit (umbrella for T-008, F-028, T-009) | Medium | Proposed 2026-11-18; owner: may come sooner than planned | Strong |
| T-008 | Task | Owner decisions before the move: when to start (before network-kit runs in another game?), room code length (4 today, 6 is network-kit's default), 1 Player On/Off until network-kit F-057 exists, administrators playing while closed until network-kit F-058 exists | Medium | Waiting for the owner | — (owner) |
| F-028 | Feature | Build the move: a small Bricks game Worker with a network-kit room (host-run relay, EU rooms, Private only for invitation links); Score Duel and Battle snapshots and Battle rows as room messages; lobby, countdown with seed, reconnection, results and rematch on network-kit; connect to network-kit's admin page; update the privacy text in Settings; Firebase stays as fallback until the owner has played a real match | Medium | Proposed; needs T-008 | Strong |
| T-009 | Task | After F-028 is confirmed on two devices: retire Bricks' admin Worker (`feature/operating-controls`, D1) and the Firebase project, and remove the Firebase code | Low | Idea; deleting external services needs the owner's explicit yes | Standard |

## Done

| ID | Type | Title | Priority | Status | Suggested model |
| --- | --- | --- | --- | --- | --- |
| B-018 | Bug | Pressing buttons in the game shows a blue background (mobile tap highlight) | Medium | Done (2026-11-15, needs check on a phone) | Standard |
| T-006 | Task | Privacy notice in Settings (what is stored on the device, at Firebase and Cloudflare, and why) | Low | Done (2026-11-15) | Standard |
| T-007 | Task | Check the falling-block look against Tetris trademark/trade dress | Low | Done (2026-11-15): no "Tetris" text or assets found; Modern piece colors kept after owner decision (see F-027) | Standard |
| F-008 | Feature | Boomers (formerly Stones) | Low | Moved 2026-11-15 to BadBagel47/boomers (F-001, F-002, D-004 there) | Strong |
| F-026 | Feature | Boomers campaign | Low | Moved 2026-11-15 to BadBagel47/boomers (F-003 there, parked) | Standard |
| F-001 | Feature | Admin page with the sketch's structure and functions | High | Done (run 1, 2026-11-10) | Standard |
| F-002 | Feature | Lobby with the sketch's structure and functions | High | Done (run 2, 2026-11-10) | Strong |
| F-003 | Feature | Settings with the sketch's structure and functions | High | Done (run 1, 2026-11-10) | Standard |
| F-004 | Feature | Match and 1 Player screens per the sketch | High | Done (run 2, 2026-11-10) | Strong |
| F-005 | Feature | Wire multiplayer sound effects | High | Done (run 2, 2026-11-10) | Standard |
| B-001 | Bug | Admin offers Revoke for expired invitations | High | Done (run 1, 2026-11-10) | Standard |
| B-002 | Bug | Pieces start falling at slightly different moments on the two devices in a match | Medium | Done (2026-11-10) | Strong |
| B-003 | Bug | Opponent board lags and moves unevenly | Medium | Done (2026-11-11) | Standard |
| F-009 | Feature | Shared music test player in the game's style with the game theme and all proposals | Medium | Done (2026-11-11) | Strong |
| T-001 | Task | Owner check of a real private two-player match in the Worker preview | High | Done (2026-11-11, owner: works on bricks.trythis.one) | — (owner) |
| T-002 | Task | Controlled public Pages activation of operating controls | Medium | Done (2026-11-11), live checks pending | Strong |
| T-003 | Task | Phase 4: publish at bricks.trythis.one (owner DNS, Pages custom domain, Firebase authorized domains); see `docs/DEPLOYMENT.md` | Medium | Done (2026-11-11), live checks pending | — (owner) |
| T-005 | Task | Decide whether Bricks Theme keeps its danger tempo rise (owner stable-BPM rule) | Low | Done (2026-11-11): keeps the tempo rise | — (owner) |
| T-004 | Task | Adapt Bricks to the shared agent rules (BadBagel47/agent-rules): HANDOFF.md, AGENTS.md reference, ID/priority format; keep the main/Worker publishing exception | Medium | Done (2026-11-11) | Standard |
| F-012 | Feature | High Scores with tabs (1 Player / Score Duel / Battle), ranked rows and empty states with an action | Medium | Done (2026-11-11) | Standard |
| F-013 | Feature | Consistent top bar on all subpages: back icon + title (replaces the "Back to menu" pill) | Medium | Done (2026-11-11) | Standard |
| F-014 | Feature | Main menu: tap "Playing as" to change name; show best 1 Player score | Low | Done (2026-11-11) | Standard |
| F-010 | Feature | Match screen cleanup: hide the Battle debug line, show the opponent name once, larger board, level/lines in the side column | High | Done (2026-11-12) | Strong |
| F-011 | Feature | New 2 Players start screen: Host and Join cards, room code as letter tiles | High | Done (2026-11-12) | Strong |
| B-004 | Bug | Opponent board still lags behind after B-003 | Medium | Done (2026-11-12, needs two-device check) | Strong |
| F-015 | Feature | Match result screen redesign (mockups R1/R2): winner headline, two player cards, Battle comparison rows, head-to-head record, Rematch as the main action; replaces the wide tables | High | Done (2026-11-12) | Strong |
| F-016 | Feature | 1 Player game over redesign (R3): large final score, record badge, top 5 with the player's row highlighted | Medium | Done (2026-11-12) | Strong |
| F-019 | Feature | High Scores as card rows instead of wide tables, own entries marked (R6) | Medium | Done (2026-11-12) | Strong |
| F-017 | Feature | Pause dialog (R4): score line, Music/Sound effects switches, Restart and Main Menu | Low | Done (2026-11-12) | Standard |
| F-018 | Feature | Name entry (R5): centred logo and form, character counter | Low | Done (2026-11-12) | Standard |
| B-005 | Bug | Outlines appear around buttons/headings when screens and dialogs open | Medium | Done (2026-11-12) | Standard |
| B-006 | Bug | Pressing Space (hard drop) at game over immediately starts a new game via the focused Play Again button | Medium | Done (2026-11-12) | Standard |
| B-007 | Bug | Games ending with 0 points fill the 1 Player high score list | Low | Done (2026-11-12) | Standard |
| B-009 | Bug | Top bar not in a fixed place: the 1 Player game and match screens use a narrower edge margin (14 px vs 18 px) and the match back button is smaller than on other screens | Medium | Done (2026-11-12) | Standard |
| B-010 | Bug | Admin page content shifts sideways when switching between Public access and Private invitations (scrollbar appears/disappears on desktop) | Low | Done (2026-11-12) | Standard |
| F-020 | Feature | Consistent outlines: every panel, card, chip, tab bar and secondary button gets a 1 px outline; room code shown as a chip everywhere | Medium | Done (2026-11-12) | Standard |
| B-008 | Bug | Next/Hold previews are not truly centred: 3-wide pieces sit half a cell left, the I piece above centre | Low | Done (2026-11-12) | Standard |
| B-011 | Bug | Wide screens: top bar (name, Settings, logo) sat far outside the content below it | Medium | Done (2026-11-12) | Standard |
| B-012 | Bug | Focus outlines still appeared after pressing game keys, and around the menu headline | Medium | Done (2026-11-12) | Standard |
| B-013 | Bug | Best score in the yellow 1 Player button was hard to read | Low | Done (2026-11-12, replaced by B-015) | Standard |
| B-014 | Bug | Spamming Space at game over could still press Play Again | Medium | Done (2026-11-12) | Standard |
| B-015 | Feature | Main menu: remove the best score from the buttons, larger button text | Low | Done (2026-11-12) | Standard |
| F-021 | Feature | Interface animations: screen transitions, sliding segmented controls, springy switches, dialog pop-in, list fade-in; setting *Interface animations* | Medium | Done (2026-11-12) | Standard |
| F-022 | Feature | Game effects: line clears flash away and the rows above fall into place, hard-drop bump, level-up pulse; setting *Game effects* | Medium | Done (2026-11-12) | Strong |
| F-023 | Feature | Touch rotation both ways: optional second rotate button (counterclockwise), Row or Split layout, preview in Settings; Swipe: tap left half ↺, right half ↻ (mockups T1–T3) | Medium | Done (2026-11-12) | Standard |
| F-024 | Feature | Block colors: three modes – Retro (NES style by level, today's "Change by level"), Modern (fixed colors, today's "Classic") and new Tones (all filled, shades of the level's two colors) | Medium | Done (2026-11-12) | Standard |
| B-016 | Bug | Block color preview in Settings: the I piece sits at the top of its slot instead of centred | Low | Done (2026-11-12) | Standard |
| F-025 | Feature | 1 Player game screen: logo centred and a little larger, without moving anything else | Low | Done (2026-11-12) | Standard |
| B-017 | Bug | Start page can be scrolled on phones although everything fits | Medium | Done (2026-11-12) | Standard |

The approved High items come from the owner's request of 2026-11-10: use the
sketch's layout **and behavior**, not only its look. Design reference:
"Bricks – visuell skiss" (Claude design canvas, artboards 1–5 and A1–A3).

## Proposed runs (2026-11-15)

None. B-018 was done 2026-11-15.

Not proposed yet: F-028 (move 2 Players to network-kit; strong model, high level) waits for the owner's decisions in T-008. F-006 is made in the separate music studio chat.

Waiting for the owner: B-018 check on a phone; B-004 two-device check of the opponent board; check B-017 on a real phone; decide whether the privacy text in Settings is enough (not legal advice).

Parked: F-027 (alternative Modern piece colors).

## Details

### B-018 blue background on button press (2026-11-15)
- Owner: pressing buttons in the game shows a blue background.
- Likely cause: mobile browsers draw a tap highlight unless `-webkit-tap-highlight-color: transparent` is set. The music test player sets it (`src/music-player/style.css`); the game's CSS does not. Fix: set it globally for the game.

### B-017 start page scrolls on phones (2026-11-12)
- Cause: pages used `min-height: 100vh`; on phones that is the height with the address bar hidden, so the page was taller than the visible area.
- Fix: `100dvh` (dynamic viewport height) with `100vh` as fallback for body, `#root` and `.shell`. Emulated phones showed no overflow before or after; needs the owner's check on a real phone.

### T-006, T-007 laws and regulations review (2026-11-12)
- Storage on the device (name, settings, high scores, match results, Firebase sign-in) only serves functions the player asks for, which the Swedish Electronic Communications Act (LEK 9:28) generally exempts from consent; no analytics or ad cookies are used. A short privacy notice is still recommended because player names, anonymous IDs and IP addresses reach Google Firebase and Cloudflare (GDPR transparency). Not legal advice; see IMY (imy.se) and PTS (pts.se).
- Game mechanics are not protected, but the Tetris name and the exact original look are (trademark, trade dress). Bricks uses its own name, colors and sounds; keep "Tetris" and "NES" out of player-facing text.

### F-024 block color modes (2026-11-12)
- Owner: "Classic" is misleading since the level mode is the classic NES look; wants a third mode with modern filled pieces whose colors follow the level.
- Done: labels *Retro* / *Tones* / *Modern*; saved values stay `level` / `tones` / `classic` so existing settings keep working. Tones: seven shades per level, interpolated around the colour wheel between the level's two colours with varied lightness (no grey mid-tones). Comparison image shared in chat.

### F-021, F-022 animations and effects (2026-11-12)
- Owner request: nicer UI with animations on view changes and switches, and a setting for game effects such as a line-clear animation where the blocks above fall down.
- Both settings live in Settings → Display and default to on; `prefers-reduced-motion` shortens everything. The engine is unchanged: `src/ui/board-effects.ts` derives cleared rows and fall distances from the previous and next state and skips the fall when they do not match (for example a Battle clear mixed with incoming rows). The game screen is entered without a view transition so the first taps are never swallowed.

### B-011 – B-015 owner feedback on run 5 (2026-11-12)
- B-011: the menu top bar now spans the menu content width; on wide screens the game top bar spans exactly stats + board + Next; on phones every screen uses a 14 px edge (replaces the 18 px top-bar inset from B-009).
- B-012: focus rings only after Tab; headings and dialogs never show one.
- B-014: game over opens with focus on its heading, so Space does nothing there; Enter or a tap/click on Play Again restarts (after the 700 ms guard).
- B-015 (owner decision): best score removed from the 1 Player button; larger menu button text.

### B-004 – opponent board lag (2026-11-12)
- Cause: the publisher waited 200 ms after each write was acknowledged, so updates came every 200 ms plus a full network round trip (roughly 300–500 ms on phones), and a change made just after a check waited for the next one.
- Fix: writes are spaced 250 ms from the start of the previous write, changes are checked every 40 ms locally, and a write that arrives early is rolled back and retried instead of ending the match. No rule change. Battle attack sending still takes several round trips when rows are sent; revisit if the opponent board still feels slow in Battle.

### F-015 – F-019, B-005 – B-007 screen review 2026-11-12
- Owner request: review all screens; theme colours stay as they are. Mockups R1–R6 in the design canvas (https://claude.ai/artifact/Es5mgaHFDTha7LiSz9W9Zv, row "Förslag 2026-11-12").
- Owner: the high score list after a match needs a real review (F-015). Today it shows text lines, a 5-column table, a Battle table that overflows on phones and the full highscore table.
- B-005: owner sees outlines around objects as they appear. Likely cause: `:focus-visible` outline on elements focused automatically (Resume, Play Again, page headings). Fix: show the ring only after keyboard navigation.
- B-006: found in the review: the autofocused Play Again button takes Space presses meant as hard drops. Fix: short input guard or no autofocus on touch.
- B-007: found in the review: ten 0-point games filled the list.
- B-009: owner noted the back button and title move between screens (seen in the canvas mockups). In the game, Settings, High Scores, 2 Players and Lobby already share `SubpageBar` (18 px edge, 44 px button, title left-aligned next to Back). The 1 Player game (logo + pause) and the match bar (smaller back button) use 14 px edges. Fix: same edge and button size everywhere; the title stays left-aligned next to Back.
- B-010: owner noticed the content moving when switching admin tabs (in the canvas). Likely cause on the real page: the tabs have different heights, so the scrollbar toggles and the centred `main` moves. Fix: `scrollbar-gutter: stable` in `server/operating/admin-page.ts` (Worker deploy via `feature/operating-controls`).
- F-020: owner asked (2026-11-12) for consistent outlines, choosing the clearer variant (outlined), and the room code to look the same everywhere. Canvas mockups updated. In the game, add `1px solid var(--line-soft)` (surfaces) or `var(--line)` (buttons) to: `.secondary-card`, `.game-stats>div`, `.next-box`/`.hold-box` (now transparent), `.room-players>div`, `.segmented`, `.setting-group`, `.mode-summary`, `.match-rows`, `.preview-card`, `.match-chip`, `.match-leave` (use `.icon-back`), admin `.tabs` and `.list`. Room code in the match bar becomes a chip. Deliberately without outline: filled accent buttons, coloured status badges (Active, WINNER, Open/Closed), the thin incoming-rows meter, block tiles.
- B-008: owner noted uneven spacing in the Next queue mockup (fixed in the canvas). In the game, `previewCells` snaps pieces to a 4×4 grid, so odd widths/heights cannot centre; render each piece's own bounding box centred in a fixed slot.

### F-001 Admin page with the sketch's structure and functions
- Two tabs: *Public access* and *Private invitations*.
- Per mode (1 Player, 2 Players): segmented On / Off / Timer. The closing-time
  field is shown only for Timer.
- Status badge per mode: "Open", "Closed", "Open until HH:MM".
- Invitations as rows: room code, Active / Expired / Revoked badge, closing time,
  Revoke only for active ones. New-link box shows room code, link and Copy.
- Keep all API contracts, element IDs used by tests or update the tests with the
  change, CSP (`script-src 'self'`), mobile width without horizontal overflow.
- Acceptance: `npm test`, `npm run test:operating` pass; manual check on a phone.

### F-002 Lobby with the sketch's structure and functions
- Large room-code tiles with *Copy link* and *Copy code*.
- Player cards: name, Host/Guest, connection status.
- Score Duel / Battle as a segmented choice with a one-line rule explanation.
- Compact match-settings rows: starting level, Hold, guest approval.
- Keep host-draft / Apply / Cancel / approval semantics and all labels used by
  `tests/firebase.rooms.mjs`, or update those tests in the same change.
- Acceptance: full Firebase emulator suite passes in CI.

### F-003 Settings with the sketch's structure and functions
- Segmented choices where the sketch has them (block colors, touch controls).
- Live block-color preview; stepper buttons for the starting level.
- Sections: Personal, Display, 1 Player, Audio, Keyboard, Controller.
- Keep accessible labels used by `tests/browser.integration.mjs`.

### F-004 Match and 1 Player screens per the sketch
- Match header: both names and scores with the signed difference between them;
  mode and connection chips.
- Battle: incoming-garbage meter beside the player's board.
- Stats row as in the sketch; layouts must still pass all fit tests
  (320×667, 390×844, 844×390, 800×600, 1280×800).

### F-005 Wire multiplayer sound effects
- Effects already exist in `src/audio/effects.ts`: `countdownTick`,
  `countdownGo`, `garbageSent`, `garbageIncoming`, `garbageRise`, `victory`,
  `defeat`. Trigger them from match events via `BricksAudio.cue()`.

### B-001 Admin offers Revoke for expired invitations
- Observed in the admin UI code: Revoke is shown when `state === 'active'`
  even if `expiresAt` has passed. Show it only for active, unexpired invitations.

### B-002 Match start not simultaneous on both devices
- Owner observation 2026-11-10: with both devices on the same network, pieces
  begin to fall first on one screen and then on the other (same pieces, offset
  timing).
- Likely cause: each client starts its countdown/gravity locally from its own
  clock offset (`.info/serverTimeOffset`). Investigate a shared server start
  timestamp that both clients wait for, and measure the real offset in a test.
- Not a sequence bug (same seed); treat as start-timing polish. Must not weaken
  recovery/resume timing.
- Resolution: Score Duel advanced gravity from each client's own mount time
  (when the "ready" write arrived; the host sees it first). A fresh round now
  catches up from the shared countdown end (`startCatchUp`, capped at 3 s);
  Battle already used the shared frame clock. Restored games are unchanged.

### B-003 Opponent board lags and moves unevenly
- Owner observation 2026-11-11: on both devices the opponent's piece appears a
  little later and does not fall at an even pace.
- Cause: board snapshots are shared at most twice per second per player
  (`SnapshotGate`, 500 ms; ADR 0002) to save Spark quota, so the mirror trails
  by up to ~0.5 s plus network and moves in jumps.
- Proposal: lower the interval to about 200 ms (≈5 updates/s). Estimated cost is
  roughly 10 MB download per match hour, far inside the Spark 10 GB/month
  limit for casual play. Update ADR 0002 and the quota notes; keep
  changed-only publishing.
- Implemented 2026-11-11: `SNAPSHOT_INTERVAL_MS = 200` in the client; rules for
  `gameSnapshots`, `recoveryCheckpoints` and `battleAttacks` lowered from 500 to
  200 ms. Rollout order: the owner publishes the new rules first (old clients stay
  valid), then the client is deployed. Old rules reject the new client's writes.

### B-004 Opponent board still lags
- Owner observation 2026-11-11 on bricks.trythis.one: after B-003 (200 ms
  snapshots) the opponent's board still lags. Investigate measured end-to-end
  delay (write ack time, Firebase delivery) before changing rates again;
  consider showing the opponent's falling piece locally between snapshots.

### F-010 – F-014 UX review 2026-11-11
- From an agent review of all screens. Mockups P1–P3 in the design canvas
  (https://claude.ai/artifact/Es5mgaHFDTha7LiSz9W9Zv, row "Förslag 2026-11-11").
- F-010/F-011 touch multiplayer screens and their emulator tests; keep the
  labels the tests use or update the tests.

### T-001 Owner check of a real private two-player match
- Steps are in `HANDOFF.md` → *Next session: finish the playable preview*.

### T-002 Controlled public Pages activation
- 2026-11-11: owner set `VITE_OPERATING_ORIGIN`, DNS, Pages custom domain and Firebase authorized domain; `main` now carries the visual refresh and operating controls; Worker `GAME_URL` = https://bricks.trythis.one/. Owner tests live (one public round, one private match).
- Follow `docs/OPERATING_SETUP.md`. Never just merge to `main` and assume rollout.

### F-006 More music tracks
- Owner liked the new theme and wants more tracks later (e.g. per level range or
  for menus/results). Same four-channel style; see `docs/AUDIO.md`.

### F-007 Move Bricks 2 Players to network-kit
- 2026-11-18: owner put the move in the backlog and said it may come sooner than planned. Split into T-008 (decisions), F-028 (build) and T-009 (retire Firebase and the admin Worker).
- The shared room server plan that used to live here (2026-11-13 – 2026-11-14) moved on 2026-11-15 to https://github.com/BadBagel47/network-kit (its F-001 – F-005). Earlier text is in git history.
- Check 2026-11-17 against network-kit v0.2.3 (its D-012 games pass): Bricks fits a host-run room used as a relay (each browser runs its own game from the room's seed; snapshots and Battle rows go as messages to the other player), with owner/host as today's code owner and lobby host, `ownerLeave: 'pass'`, no late join, countdown with seed, rematch as a new round, invitation keys in the link, EU-only rooms. Missing in network-kit before Bricks can move: F-029 (rooms created by an admin invitation that nobody in the room created; needed for private links) and F-003 (shared admin page, with the open/closed check also at round start and rematch). Not yet proven: Cloudflare free-plan figures (D-011 there; Bricks sends about 4 snapshots per player per second) and real phones (D-025 there); first real user Critical ST8 is not finished. Stays in Bricks: reopening a previous room with the same code, settings approval, results and history, four-letter codes. Recommendation: keep waiting.
- Update 2026-11-18 (network-kit v0.7.0): F-029 (rooms from an invitation) and F-003 (admin page; Off also refuses new rounds and rematches, running games finish) are done; Cloudflare free figures checked (D-011) and the phone/iPad test done (D-025). Still not used by a real game; Bricks waits until it is (owner decision). Owner decision: use network-kit's admin page and sign-in, retire Bricks' admin Worker. Network-kit's answers (2026-11-18): separate 1 Player On/Off/Until is not supported yet, recorded there as F-057 (modes per game and a room-less status check); administrators playing while closed is not supported, recorded there as F-058 (needs a design). Bricks' public Off with private links still working maps to network-kit's *Private only*. Building F-057/F-058 is the owner's call in network-kit. Since network-kit v0.8.0 room codes are 6 characters by default; Bricks uses 4 today (decide when moving). Rough estimate (not measured): a match uses about 1,400 of 100,000 daily Durable Object requests per hour; room time (awake during the whole match) allows roughly 29 match hours a day, shared with the other games. Bricks-side work when moving: 2 Players transport, a small game Worker for rooms, the privacy text in Settings, then remove Firebase.
- What stays here: moving Bricks Score Duel and Battle from Firebase to network-kit once it is proven with Boomers. Bricks then keeps its own rules (snapshots, Battle garbage) as its plug-in and reuses network-kit for rooms, codes, invitations, reconnection and the admin page.

### F-008 Boomers (moved)
- Moved on 2026-11-15 to https://github.com/BadBagel47/boomers (F-001 solo endless mode, F-002 online play, D-004 design proposal). Earlier text is in git history.

### F-026 Boomers campaign (moved)
- Moved on 2026-11-15 to https://github.com/BadBagel47/boomers (F-003 there, parked).
