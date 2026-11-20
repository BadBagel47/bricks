## Open

| ID | Type | Title | Priority | Status | Suggested model |
| --- | --- | --- | --- | --- | --- |
| B-039 | Bug | iPad in landscape (and other touch screens wider than 900 px): no touch controls are shown, in 1 Player or in matches, so the game can only be played with a keyboard or controller there (found 2026-11-20 while measuring B-038: the touch controls are only shown up to 900 px width) | High | Proposed (2026-11-20) | Standard |
| B-036 | Bug | Battle help text in the lobby says "Clearing lines sends garbage rows", but a single-line clear sends nothing (2 lines → 1 row, 3 → 2, 4 → 4). Found 2026-11-20 when the owner asked how Battle works | Low | Proposed (2026-11-20) | Economical |
| T-014 | Task | Cloudflare Battle end-to-end test: check that garbage rows really reach the other player (today only the Firebase test and the unit tests check it; the Cloudflare test checks survival, pause and leaving). Found 2026-11-20 when the owner asked | Medium | Proposed (2026-11-20) | Standard |
| F-056 | Feature | Adjustable key repeat for held buttons (DAS delay and repeat rate; today fixed 160 ms and 48 ms). A control setting, not a rule | Low | Proposed (2026-11-20) | Standard |
| F-057 | Feature | Pieces appear in hidden rows above the board, as in modern games (fewer losses at the very top) | Low | Parked (2026-11-20) | Standard |
| F-058 | Feature | Modern scoring: T-spins, combos and back-to-back, and their garbage in Battle. Rewards advanced play and changes 2 Players, so kept out of Modern for now | Low | Parked (2026-11-20) | Standard |
| F-059 | Feature | Possibly remove the Row touch layout (one row of buttons) and keep only Split | Low | Proposed (2026-11-20, owner) | Standard |
| F-060 | Feature | Hold button placement (Split). Owner (2026-11-20, with screenshots): try two placements on the phone, both with more space between the rotate buttons than today: (1) Hold at the bottom, to the right of the left rotate button and centred under the orange (right) rotate button; (2) sketch B: Hold in the free top corner of the rotate area, above the left rotate button and to the left of the orange one. Both mirrored for left-handed. Both are to be made switchable for the test; the loser is removed afterwards. Do not invent new placements | Low | Built for the test (2026-11-20): Settings → Hold button, Bottom (default) / Top; shown with Split, two rotate buttons and Hold on; with one rotate button or Row, Hold stays where it was. Waits for the owner's choice on the phone, then the other placement is removed | Standard |
| F-061 | Feature | A setting to arrange the touch controls on the screen yourself, and to set the height of the playing field | Medium | Proposed (2026-11-20, owner) | Standard |
| F-006 | Feature | More music tracks | Low | Idea | Standard |
| F-027 | Feature | Vivid (formerly Modern) block colors: use a piece-color assignment that differs from the Tetris guideline (I cyan, O yellow, T purple, S green, Z red, J blue, L orange), to stay clear of trade dress. Tried 2026-11-15 (I orange, O green, T red, S blue, Z purple, J yellow, L cyan) and reverted at the owner's request | Low | Parkerad 2026-11-15 | Standard |
| F-007 | Feature | Move Bricks 2 Players from Firebase to the shared room server in BadBagel47/network-kit (umbrella for T-008, F-028, T-009) | Medium | Proposed 2026-11-18; owner: may come sooner than planned | Strong |
| T-009 | Task | After F-028 is confirmed on two devices: retire Bricks' admin Worker (`feature/operating-controls`, D1) and the Firebase project, and remove the Firebase code | Low | Idea; deleting external services needs the owner's explicit yes | Standard |

## Done

| ID | Type | Title | Priority | Status | Suggested model |
| --- | --- | --- | --- | --- | --- |
| B-037 | Bug | After B-035 Hard Drop seems hard to activate (owner, 2026-11-20, on the phone). B-035 gave the arrows below the lowest 30 % of the Hard Drop button and moved Hard Drop's own touch area to an invisible layer (the button itself ignores touches) so that its lower part could go to the arrows. Likely causes: a press on the lower third of the button now soft-drops, and the phone's own touch correction (which picks the button the finger overlaps most) may not count the invisible layer as Hard Drop. Neither can be tested here without a real phone | High | Done (2026-11-20): the whole Hard Drop button reacts again, as a normal button; the larger gap from B-035 stays and the arrows below own all of it. Real taps checked low and high on the button (both hard-drop). Needs the owner's thumb | Standard |
| B-038 | Bug | iPad in portrait: in matches the top bar and the score cards span the whole screen (about 790 px on an 820 px iPad) while the boards below are only about 460 px wide, so the top looks very wide; the boards also stay small (own board capped at 300 px) with a large empty area around them (owner photo 2026-11-20). Cause: on screens up to 900 px wide the match screen uses the phone layout, full width | Medium | Done (2026-11-20): on tablets in portrait the boards grow as far as the height allows (own board 434 px instead of 300 px on an 820 × 1180 iPad); on tablets and wider screens the top bar and score cards are exactly as wide as the boards (with the Battle meter too), centred. Phones keep the full-width bar. Needs a look on the iPad | Standard |
| B-035 | Bug | Split touch controls: Hard Drop is pressed by mistake when aiming at the buttons below it (left, soft drop, right); the owner sees it react although most of the thumb is lower (2026-11-20). Found: the Hard Drop touch area reaches only 4 px into the 8 px gap, so the drawn layout is as intended; the action fires at the very first contact, and a thumb coming from below first touches with its tip, which the phone reports higher than where the thumb ends up | High | Done (2026-11-20): the gap below Hard Drop grows from 8 px to a quarter button (14 px on a 390 px phone); the row below also answers in the gap and on the lowest 30 % of the Hard Drop button; Hard Drop answers above that and still acts at once. Real taps checked: low on the button moves the piece down one row, higher up hard-drops. Needs the owner's thumb | Standard |
| B-030 | Bug | Cloudflare 2 Players on a phone: the match top bar is wider than the screen, so the Room button is cut off at the right edge; the connection chip also says "Synchronizing…" for the whole start countdown | Low | Done (2026-11-20): on phones up to 480 px the room code shows without its label, the chips are tighter and the connection chip is its coloured dot (text kept for screen readers and as a tooltip; with room to spare, since fonts differ between phones). The countdown reads Connected. Measured with no sideways overflow at 320, 360, 375, 390, 412 and 480 px | Standard |
| B-033 | Bug | Landscape phones about 667 × 375 with the Row layout: the 1 Player screen is about 5 px taller than the screen and scrolls a little (seen 2026-11-20; also with Classic, so older than the rules) | Low | Done (2026-11-20): Row buttons in short landscape take the height left below the board; at about 568 × 320 the Next and Hold boxes are only as tall as the pieces. No scrolling measured at 568 × 320, 640 × 360, 667 × 375, 740 × 360, 812 × 375, 844 × 390 and 896 × 414 (Row and Split) | Standard |
| B-034 | Bug | 2 Players on smaller phones (about 375 × 667): with the Modern rules' three next pieces, the side column (opponent board, Next, Hold, level and lines) reaches 44 px into the touch controls, so the rotate buttons cover level and lines (found 2026-11-20 while drafting F-060; since run D) | High | Done (2026-11-20): in matches on phones in portrait the two later Next pieces sit side by side and the Next and Hold boxes are as tall as the pieces need; on short phones (about 320 × 568) the opponent's board is a little smaller. Measured clear of the controls at 320 × 568, 360 × 640, 375 × 667, 390 × 844 and 412 × 915 | Standard |
| F-063 | Feature | Phones: the board and its side column do not fill the full width, so the Pause button in the corner makes the layout look lopsided (owner, 2026-11-20; moving Pause in is not wanted either). Proposal: the top bar follows the columns below, the logo centred over the board and Pause over the side column, as wide as it | Low | Done (2026-11-20): logo centred over the board, smaller where the board is narrow (Q1 with recommendation), Pause as wide as the side column | Standard |
| F-064 | Feature | Remove the fullscreen button on the start screen when the game runs as an installed app (home-screen app), which is always fullscreen | Low | Done (2026-11-20): hidden when the page opens as the home-screen app; needs a check on the phone | Standard |
| T-010 | Task | network-kit feedback (from F-028/F-038): (1) the first deploy of a new game Worker failed with Cloudflare's "This Worker does not exist" right after the upload and passed on a re-run: the deploy guide or workflow template could retry once; (2) a guide section on continuing a game after a page reload (identity per device, room code kept in the address, the game's own state in the tab, everyone sends their current state again on `peer back`) would help other games | Low | Done (2026-11-19): sent with the owner's yes; recorded as network-kit F-112 (retry on error 10007) and network-kit F-113 (guide section on continuing after a reload) | — (owner) |
| T-013 | Task | network-kit feedback (from T-012): right after `wrangler deploy` the old Worker version still answered for a short while, so a deploy check that only looks for `codeLength` (as network-kit's demo workflow does) can pass on the old version; Bricks' check now waits until `/rooms` answers with the vendored VERSION. The deploy guide or template could do the same | Low | Done (2026-11-19): sent with the owner's yes; recorded as network-kit B-119 | — (owner) |
| B-026 | Bug | iPad in portrait (about 810 px wide): the start screen puts the logo and the menu buttons side by side; they should stack as on phones | Medium | Done (2026-11-19) | Standard |
| B-027 | Bug | Phone: in the 2 Players lobby the QR Code button wraps to its own row and sits to the left; it should be centred | Low | Done (2026-11-19) | Standard |
| F-040 | Feature | Touch controls in the Row layout (game and Settings preview): a gap between left/right and the other buttons | Low | Done (2026-11-19) | Standard |
| F-041 | Feature | Settings → Layout: Split first (left of Row) and Split as the default | Low | Done (2026-11-19) | Standard |
| B-028 | Bug | Cloudflare 2 Players: when one player returns to the lobby, the other's game keeps running (pieces keep falling, music plays) behind the "opponent left" note; the abandoned game should stop. Cause: the game loop in `NetLiveGame` does not stop when the match is abandoned, only the controls do | High | Done (2026-11-19) | Standard |
| F-042 | Feature | Invitation QR code (both versions): close it automatically when the lobby is full | Low | Done (2026-11-19) | Standard |
| B-029 | Bug | Cloudflare 2 Players: the game screen appears several seconds before the pieces start falling. Cause: the game view opens at the start of the room's 5 s countdown (`countdownMs: 5000`) with only a small "Starting in N…" line, while Firebase counts down in the lobby and opens the game when play starts | Medium | Done (2026-11-19) | Standard |
| B-031 | Bug | iPad: the invitation QR code has a larger white area below the code. Likely cause: the SVG is sized with `height: 100%` inside a box sized by `aspect-ratio`, which Safari can resolve taller than wide; the code is drawn at the top of the SVG and its white background fills the rest | Low | Done (2026-11-19) | Standard |
| F-043 | Feature | 2 Players: switching between Firebase and Cloudflare cross-fades like other screen changes (Interface animations) | Low | Done (2026-11-19) | Standard |
| F-044 | Feature | 2 Players lobby: Copy Invite Link is filled orange like a selected option; consider the outlined style of Copy Code and QR Code, keeping orange for Start Match and selected options | Low | Done (2026-11-19) | Standard |
| F-045 | Feature | Start screen: on phones the menu buttons are as wide as the logo; on tablets in portrait the logo is as wide as the menu buttons | Low | Done (2026-11-19) | Standard |
| F-046 | Feature | Rules: *Classic / Modern / Custom* (owner 2026-11-20; Modern the default). Classic = every modern rule off (as NES); Modern = all on. Settings → 1 Player shows only the choice; the individual rules appear only with Custom. Rules: 7-bag (piece order), wall kicks with SRS rotation (F-052), lock delay (F-053), 3 next pieces (F-054), Hold, Ghost piece (F-055). High scores are marked Classic, Modern or Custom. 2 Players: the host chooses Classic or Modern (Cloudflare; Firebase stays Classic) | Medium | Done (2026-11-20) | Standard |
| F-047 | Feature | Interface animations where they are missing today (audit 2026-11-19: QR code, notices, the opponent joining, room code tiles, code entry, Settings options that appear, the 2 Players result screen and the return to the lobby) | Low | Done (2026-11-20) | Standard |
| F-048 | Feature | Remove the Game effects setting; the effects are always on (reduced motion still turns the line-clear animation off) | Low | Done (2026-11-20) | Standard |
| F-049 | Feature | Remove the Interface animations setting; animations are on except for players whose system asks for reduced motion | Low | Done (2026-11-20) | Standard |
| F-050 | Feature | A Hold touch button (tapping the Hold box is a long reach) | Medium | Done (2026-11-20) | Standard |
| F-051 | Feature | Clearer borders around dark buttons and cards (`--line` a little lighter) | Low | Done (2026-11-20) | Standard |
| B-032 | Bug | Touch buttons miss taps: only the drawn button shapes react, so taps in the gaps between buttons and in the corners around the round rotate buttons do nothing (measured on a 390 × 844 phone: 35 % of the control strip reacts in Split, 45 % in Row). Each button should own the empty space nearest to it | High | Done (2026-11-20) | Standard |
| F-052 | Feature | Wall kicks with the modern rotation system (SRS): a rotation that does not fit tries the standard kick positions before giving up. Part of the Rules (F-046) | Medium | Done (2026-11-20) | Standard |
| F-053 | Feature | Lock delay: a landed piece locks after about 0.5 s; moving or rotating restarts the wait, at most about 15 times. Part of the Rules (F-046) | Medium | Done (2026-11-20) | Standard |
| F-054 | Feature | Show the next 3 pieces instead of 1. Part of the Rules (F-046) | Medium | Done (2026-11-20) | Standard |
| F-055 | Feature | Hold and Ghost piece move into the Rules (F-046): on in Modern, off in Classic, own switches in Custom | Medium | Done (2026-11-20) | Standard |
| F-062 | Feature | Block colors: the third choice is called Vivid instead of Modern, so it is not confused with the Modern rules | Low | Done (2026-11-20, owner: "Döp om till vivid") | Standard |
| T-008 | Task | Owner decisions before the move | Medium | Done (2026-11-18): start before another game is fully proven, after network-kit F-057/network-kit F-058 and more testing; 6-character codes; 1 Player On/Off and administrator play come from network-kit (network-kit F-057, network-kit F-058) | — (owner) |
| B-025 | Bug | With a game link in the browser, the page's status check and notices from network-kit were refused by the browser (CORS) because Bricks' page and room Worker are on different addresses (network-kit B-104, fixed in network-kit 0.15.1); the check then read as open and notices did not show. Fix: take network-kit 0.15.1 | Medium | Done (2026-11-19): network-kit 0.15.1 taken in; preflight with a game link allowed | Standard |
| T-012 | Task | Take network-kit 0.17.0 (Bricks has 0.15.1 since B-025): per network-kit no code changes are needed for 0.16–0.17; 0.16.0 protects the quota (network-kit F-098); does not close live rooms | Medium | Done (2026-11-19): network-kit 0.17.0 with its default room caps (owner) | Standard |
| F-039 | Feature | QR code for the invitation in the 2 Players lobby (owner 2026-11-19) | Medium | Done (2026-11-19): QR Code button next to Copy Invite Link in both versions; needs a scan with a phone | Standard |
| T-011 | Task | Install network-kit's update workflow (network-kit `templates/update-network-kit.yml`) in `.github/workflows/`: it proposes new network-kit fix versions by itself on a branch of its own, runs network-kit's smoke test and Bricks' tests, and opens an issue with the result; the agent then brings the branch in. Origin: network-kit, owner's decision there (network-kit Q13, 2026-11-19) | Medium | Done (2026-11-19): `.github/workflows/update-network-kit.yml` (network-kit's template, set for Bricks: smoke test with Bricks' room options; lint, unit, build, browser and Cloudflare tests); runs daily, first result shows when network-kit releases a fix | Standard |
| F-038 | Feature | Cloudflare 2 Players: restore a player's game after a page reload during a match (today the match ends without a result) | Medium | Done (2026-11-19): the game is kept in the tab and the address names the room, so a reload continues the match; needs a check on a phone | Strong |
| F-028 | Feature | Build the move: a small Bricks game Worker with a network-kit room (host-run relay, EU rooms, private rooms with invitation keys; public Off with working invitations needs network-kit F-059); Score Duel and Battle snapshots and Battle rows as room messages; lobby, countdown with seed, reconnection, results and rematch on network-kit; connect to network-kit's admin page; validate received boards, Battle rows and finishes in the receiving browser (format, value ranges, sequence order, no revival after Game Over, Battle totals only increase) and ignore what fails, replacing the content checks the Firebase rules do today; update the privacy text in Settings; Firebase stays as fallback until the owner has played a real match | Medium | Done (2026-11-19): Cloudflare 2 Players side by side with Firebase; needs a real match on two devices | Strong |
| F-036 | Feature | Compare connection performance between Firebase and network-kit (Cloudflare) 2 Players: how long a move takes to show on the other screen, how even the updates are, reconnect time | Medium | Done (2026-11-19): measured in both versions; result line and Settings → Connection | Strong |
| B-024 | Bug | Cloudflare end-to-end test sometimes lost the guest's match view | Low | Done (2026-11-19): same cause as B-021, a race in the test: the last player to finish goes straight to the result screen before "Game over" can be seen; the tests now accept either | Strong |
| F-037 | Feature | Danger music feels like it starts a little early (owner 2026-11-18): adjust when it starts and ends | Low | Done (2026-11-18): as in NES, no margin before normal music; needs the owner's ear | Standard |
| B-022 | Bug | Home screen app icon (F-035) shows as a small square: Android puts icons that are not marked as maskable, dark background included, shrunk inside a white shape | Medium | Done (2026-11-18; re-add the app to the home screen to see it) | Standard |
| B-023 | Bug | The fullscreen button (F-033) keeps an orange outline after a tap: phones keep the hover style on the last tapped element (sticky hover); the same can happen to other buttons that stay on screen, e.g. Hold | Low | Done (2026-11-18; needs check on a phone) | Standard |
| F-034 | Feature | Settings: replace the Hard Drop on/off switch with a three-way choice Drop / Hard Drop / Both | Medium | Done (2026-11-18; needs check on a phone) | Standard |
| F-035 | Feature | App icon and favicon: the B tile from the logo in the orange of the S tile (#F7964A) | Low | Done (2026-11-18; needs a look in the browser tab and on the home screen) | Standard |
| B-020 | Bug | Main menu at 320 px wide: the rotated last logo tile reaches 1 px past the screen edge, so the page can scroll sideways by 1 px (found 2026-11-18 while checking F-033; also on the live site before F-033) | Low | Done (2026-11-18) | Standard |
| B-021 | Bug | CI: the Firebase emulator test "Score Duel retains a finished player through reconnect…" timed out once waiting for the guest's Game over after reconnect (run for F-033, 2026-11-18); passed on re-run, so likely timing-dependent | Low | Done (2026-11-18): test made robust and gives diagnostics; cause not reproduced locally | Strong |
| F-033 | Feature | Fullscreen mode while playing | Medium | Done (2026-11-18; fullscreen not possible in iPhone's browser, there the home screen app is used; needs check on a phone) | Standard |
| F-032 | Feature | 1 Player game screen on phones: logo a little smaller (40 px tiles feel too big) and truly centred vertically on the Pause button (measured about 3 px low because of the tiles' stagger) | Low | Done (2026-11-18, needs check on a phone) | Standard |
| B-019 | Bug | Split touch layout after F-031: too little space between the counterclockwise rotate button and the right arrow (16 px) | Low | Done (2026-11-18, needs check on a phone) | Standard |
| F-030 | Feature | No selectable or copyable text anywhere in the game (owner 2026-11-18: the whole game, but not the admin page): every screen players see, including menus, game, lobby, results, high scores and settings; text fields stay editable and the read-only copy fallback field stays selectable; no long-press text menu on phones. The music test player (music studio workstream) is not included. (F-029 skipped to avoid confusion with network-kit F-029 in this file.) | Low | Done (2026-11-18, needs check on a phone) | Standard |
| F-031 | Feature | 1 Player game screen on phones: larger logo, and larger touch controls that use the empty space below and beside them, without making the board smaller; owner wants to see it in several screen sizes first | Medium | Done (2026-11-18, Button size slider removed; needs check on a phone) | Standard |
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

## Proposed runs (2026-11-20, after B-037 and B-038)

Prioritized for: visible faults first, then the touch controls.

- **A** – standard model, medium – Touch controls on iPad in landscape
  - B-039 – touch controls also on touch screens wider than 900 px (iPad in landscape), placed beside the board as on landscape phones
  - Question: recommended: show them whenever the device has a touch screen and no mouse, whatever its width; on a computer with a mouse they stay hidden as today
- **B** – economical model, low – Battle help text
  - B-036 – the lobby text says that clearing 2 or more lines sends garbage rows
- **C** – standard model, medium – Cloudflare Battle test
  - T-014 – the two-player test checks that garbage rows really reach the other player
- **D** – standard model, medium – Key repeat
  - F-056 – two settings for held buttons: how soon they repeat and how fast
  - Question: where? Recommended: Settings, next to the touch-control choices, defaults as today
- **E** – strong model, high – Own control layout
  - F-061 – arrange the touch controls yourself and set the playing field's height
  - F-059 – the Row layout possibly removed
  - Question: how far? Recommended: an edit mode where the button groups are dragged into place and resized, plus a board-height slider; Row removed once that exists

Waiting for the owner: F-060 (which Hold placement stays; both are in Settings → Hold button for the test).

Not proposed: F-006 (music studio chat); T-009 (retire Firebase and the old admin; waits for the owner's two-device check and explicit yes); adaptation item 1.1 (web basics, see HANDOFF).

Parked: F-027 (alternative Vivid piece colors), F-057 (pieces above the board), F-058 (modern scoring).

## Details

### B-038 match screen on iPad (2026-11-20)
- Measured with two local players: 820 × 1180 top bar and scores 14–806 px, boards 181–639 px; 810 × 1080 and 768 × 1024 the same pattern; iPad landscape 1180 × 820 bar 640 px wide over 473 px of boards. The own board stays at 300 px wide on tablets in portrait, leaving about 320 px of empty height above the touch controls.

### Battle rules as built (checked 2026-11-20, owner question)
- Clearing 2 lines at once sends 1 garbage row, 3 lines 2 rows, 4 lines 4 rows; a single line sends nothing; no combo or drop bonus (`penaltyRows` in `src/engine/battle.ts`).
- Your own clears first cancel garbage waiting for you, the oldest first; only the rest is sent.
- Waiting garbage is shown as a red meter beside your board and rises from the bottom when your next piece locks, all waiting rows at once. Each row is grey and full except one hole in a random column (each row its own hole; both players see the same holes).
- Rows that push blocks out of the top, or into the falling piece, end the game. The player who survives longer wins (shared match clock); the same moment is a draw. Points do not decide Battle. After a player is out, the survivor's clears send nothing more.
- Checked by the unit tests and the Firebase two-player test (rows arrive, are applied once, survive a reconnect); the Cloudflare two-player test does not yet check that rows arrive (T-014).

### B-035 Hard Drop pressed instead of the buttons below (2026-11-20)
- Owner: "Det är väldigt lätt att hard drop trycks istället för de andra styrknapparna. Jag kan till och med se att den trycker på den knappen fastän större delen av tummen är längre ner."
- Measured (390 × 844, 375 × 667, 412 × 915, Split): Hard Drop sits above Soft Drop with an 8 px gap; its touch area (B-032) reaches 4 px below the button, the lower buttons own the rest. So the layout behaves as built; the cause is how a thumb meets the screen: the action fires at the first contact (pointer down), and a thumb coming from below touches first with its tip, reported higher than its centre. Hard Drop cannot be undone, so a wrong press costs much more than a wrong move.
- Options: (1, recommended) more space between Hard Drop and the row below, with the lower buttons also owning the gap and the lowest part of the Hard Drop button; (2) Hard Drop acts when released over it (safer, slower); (3) move Hard Drop away from the arrows.

### B-030 match top bar and "Synchronizing…" (2026-11-20)
- The opponent's first board is sent once when the countdown starts (newest-only, unreliable) and again only when it changes, i.e. after the countdown; if that first one is lost, the chip read Synchronizing… for the whole countdown. The round only starts with both players in the room and a lost player pauses the match, so the countdown now reads Connected.

### F-060 Hold placements under test (2026-11-20)
- Built from the owner's description of the two screenshots: with Split and two rotate buttons, the rotate area is wider (2.65 instead of 2.3 button widths), so the two rotate buttons are further apart, and Hold (a button-wide, three-quarter-high key) joins it. *Bottom*: below the orange rotate button, centred under it, level with the bottom of the other rotate button. *Top*: the free top corner above the other rotate button, beside the orange one. Mirrored for left-handed. The pad no longer has Hold in its top corner in this case.
- Not changed: with one rotate button Hold stays in the pad's top corner, in Row it stays last in the row (no placement was described for those).
- Choice in Settings → Hold button (Bottom default, Top), shown when the preview has Hold (Split, two rotate buttons, Hold in the 1 Player rules); the game and matches use the same choice. After the owner's choice the other placement and the setting are removed.

### F-037 danger music timing (2026-11-18)
- Bricks today (`src/audio/tempo.ts`): danger starts when a locked block reaches the 6th row from the top of the 20-row board (stack 15 rows high) and ends only when the stack is below the top nine rows (11 rows high or lower); checked when a piece locks or lines clear, switched on the next beat.
- NES Tetris (1989), from community analysis of the game's code (meatfighter.com; not read directly here, the site is blocked in the agent's network): when a piece locks, the game checks the 6th row from the top; any block there gives fast music, an empty row gives normal music again. So the start is the same as Bricks; the NES has no extra margin before switching back, so its danger music ends sooner. NES tempo 150 → 225 BPM (vgmpf.com).
- Options for the owner: keep the NES start and drop the margin; start later (for example the 4th row from the top, stack 17 high), with or without the margin. Owner chose "as in NES" (2026-11-18): same start, normal music as soon as the top six rows are empty.

### B-021 Score Duel emulator test timed out once (2026-11-18)
- Root cause found 2026-11-19 (B-024): a race in the test, not a game bug. When the second player tops out and the opponent's final result is already known, the result screen replaces the match view at once, often before the test's check for "Game over" runs. Logging showed the guest's own Space presses ending its game at the expected moment and the result screen up. A first guess (key presses leaking between pages in one headless browser) was wrong: separate browsers failed the same way in CI. Fix: `finish()`/`topOut()` treat the result screen as finished too.
- The guest's 40 quick hard drops after the reconnect did not reach Game over within 12 s in one CI run; the same test passed on re-run and three times locally. Likely cause: inputs during a short pause right after the reconnect are ignored by design.
- Fix (test only): `finish()` waits for the pause note to be hidden and keeps dropping until Game over (bounded), and on failure reports the board status, duel status, pause note and focus. Local note: running `tests/firebase.rooms.mjs` alone with Node 22.23 here stops after 60 s for the whole file (also on unchanged main), so the full rooms file is checked in CI.

### F-033 fullscreen (2026-11-18)
- Owner decisions: button next to Settings on the main menu (icon only); the choice is remembered (`bricks.fullscreen.v1`) and restored at the first tap or key press after the page opens (browsers allow fullscreen only after a user gesture; a tap on the button itself is left to the button); the game can be added to the home screen as an app (`manifest.webmanifest`, `display: fullscreen`, icons from the favicon, Apple meta tags with a black status bar).
- iPhone's browser has no page fullscreen, so the button is hidden there; the home screen app is the iPhone route. Android browsers support both. Not verified on real devices; installability prompts depend on the browser (no service worker was added).

### F-031 larger logo and touch controls (2026-11-18)
- Owner screenshot (Brave on Android, about 412×720 CSS px, Split layout): small logo, empty space below and between the control groups.
- Prototype (local only, shown to the owner as a before/after sheet at 320×568, 375×667, 412×720, 412×800 and 430×860): board size unchanged at every size, no overflow. At 412×720 the arrow buttons go from 55 to 66 px and the main rotate button from 69 to 83 px; logo tiles from 28 to 40 px (28 px kept at 320 wide, where there is no room beside Pause). Row layout grows the same way.
- Open choice for the owner: the Settings *Button size* slider (44–72, default 56) currently caps the buttons; with the prototype the buttons fill the space on phones in portrait, so either remove the slider (recommended) or keep it with a higher range and the largest size as default.
- Built 2026-11-18 as prototyped (owner: "Kör A och B rek"); the slider is removed (Q1 recommendation). Row layout divides by the button count plus 0.3 so rows with a Hold button fit; short landscape keeps the 24 px logo and a 72 px cap; the match screen keeps its old 56 px size.
- Prototype CSS, appended to `src/App.css`:
```css
.game-topbar>.brand .brand-tile{--tile:max(28px,min(40px,calc((100vw - 28px - 2 * 60px) / 6.6)))}
@media(max-width:760px) and (orientation:portrait){
  .game-shell{--board-w:min(calc(100vw - 28px - 86px),300px,calc((100dvh - 270px)/2));--controls-h:calc(100dvh - 159px - 2 * var(--board-w))}
  .game-shell:has(.touch-split){--board-w:min(calc(100vw - 28px - 86px),300px,calc((100dvh - 270px - 56px)/2))}
  .game-shell .touch-controls{--touch-size:max(44px,min(84px,calc((100vw - 28px - 4 * clamp(5px, 2vw, 12px)) / 5.15),calc(var(--controls-h) / 1.15)))}
  .game-shell .touch-split{--touch-size:max(44px,min(84px,calc((100vw - 28px - 32px) / 5.3),calc((var(--controls-h) - 8px) / 2.1)))}
}
```

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
- 2026-11-19, F-028/F-036 done: `server/rooms/` (room Worker `bricks`, https://bricks.l8p1.workers.dev, EU rooms, admin game `bricks` mode `duo`), `vendor/network-kit/` (0.13.4, 0.15.1 since B-025, 0.17.0 since T-012), `src/net/` (protocol with receiver checks, lobby, live game), *Server* switch on the 2 Players screen (Firebase first), Cloudflare links `#room=CODE` and admin lobbies `#nk-lobby=…` open Cloudflare, *Rejoin Last Room* while network-kit keeps the room, connection measurements in both versions. Tested locally with the room Worker in workerd and two browsers (`npm run test:net`): Score Duel, Battle, invite link, settings approval, a lost connection, leaving, rematch, rejoin. See ADR 0008.
- 2026-11-18 (T-008): owner's answers: the move may start before network-kit is proven in another game (Vättigt works well), but only after network-kit has the missing support and more testing; network-kit builds separate 1 Player On/Off/Until (network-kit F-057) and administrators playing while closed (network-kit F-058).
- Readiness check 2026-11-19 (asked by network-kit for the owner): network-kit 0.13.4 has everything F-028 needs (owner's device test of the admin features passed); answered "ready". Bricks will likely use `identity: 'device'` so a returning player is the same participant after closing the tab, as with the Firebase UID today. Remaining: the owner's answers to the F-028 questions.
- Network-kit 0.13.0 (2026-11-18): network-kit F-059 is done: the admin page makes a lobby per game (1 hour to 7 days, a name and the game's page) with a host link and a guest link (`#nk-lobby=…`); `NetworkRoom.joinLobby(SERVER, { name, … })` joins it (host link as owner and host, guest link with a player key, guests wait for the host); works while 2 Players takes no new players, never after an emergency stop; replaces Bricks' private invitations. Relayed messages now carry `at` (server arrival time; network-kit F-063).
- Network-kit 0.12.0 (2026-11-18): the admin page is rebuilt for the phone in Swedish (a card per game with status, rooms, players, network-kit version, last deploy and errors; On / No new players / Timer per game and mode; emergency stop under a cover; 90-day log). For Bricks' move only network-kit F-059 (lobby with host and guest links) is still missing; it waits for the owner's go in network-kit.
- Network-kit 0.10.0/0.11.0 (owner's decision there, 2026-11-18): states per game and per mode (Bricks: 1 Player and 2 Players) are On, No new players (replaces Off) and a timer "on until <time>" that then becomes No new players or an emergency stop; players are warned ten minutes before. "Off until" and "Private only" are removed; the emergency stop is a button. Admin links became game links (made per game, usable by anyone given one, 1 hour to 90 days, revocable): with one a browser creates, joins and starts in both modes while the game takes no new players or Cloudflare limiting has closed it, and invitations from such a room get past No new players. Notices (`watchNotices(SERVER, { mode })`) show the admin page's messages on every game page, English only. network-kit F-059 becomes a lobby made on the admin page with a host link and a guest link (guests wait for the host), network-kit's next run B. When Bricks moves, the project rule in `AGENTS.md` about On/Off/Until and private invitations must be updated to these states (owner approval needed for the wording).
- Network-kit's answers 2026-11-18: v0.9.0 has network-kit F-057 (modes per game: Bricks uses game `bricks` with modes `solo` for 1 Player, checked by the page with `NetworkRoom.status(server, { mode: 'solo' })` before a new game, and `duo` for rooms; open when the admin page cannot be reached) and network-kit F-058 (personal admin links per device, 30 days, revocable; create, join and start while Off or over budget, not after an emergency stop). Admin-issued private invitations are recorded there as network-kit F-059, not built; the owner decides when. A per-participant kept state is not planned: Bricks keeps the guest's checkpoint in sessionStorage.
- Needs check 2026-11-18 (network-kit v0.8.0 against `docs/MULTIPLAYER.md`): covered by network-kit: two player seats in a host-run relay room, host handover in the lobby, `ownerLeave: 'pass'`, grace period and auto pause for dropped players, 5 s countdown with shared seed and start time, server time for Battle's frame clock, newest-only sends for board snapshots, reliable numbered sends for Battle rows and finishes, `start()` again for rematch, invitation keys in the link, Off refuses new starts and rematches while admitted games finish, EU rooms. Missing in network-kit: network-kit F-057, network-kit F-058 (in progress) and admin-issued private invitations with expiry, list and revoke (asked 2026-11-18). Moves into Bricks game code: settings approval and the host-editing wait (room data and messages), rematch consent, results and history, a stable local player id for head-to-head history (network-kit ids are per room), the guest's own engine checkpoint for reload (stored in its browser unless network-kit adds a per-participant kept state). Server-side snapshot validation from the Firebase rules goes away; the receiving browser does the same format checks instead (owner, 2026-11-18; part of F-028). This was never anti-cheat: a modified page can send well-formed false data today too. An optional server-side validation hook is recorded in network-kit as network-kit F-061 (Low); Bricks does not depend on it. Anti-cheat proposals sent to network-kit 2026-11-18 (owner decides there): (1) peer replay verification, where each player sends inputs with frame numbers and the opponent replays them from the shared seed and compares, mismatches are not counted (mostly Bricks-side work, recommended); (2) server receive time on relayed messages, to catch a slowed-down game; (3) server-run verification of both games (advised against: room CPU per input on the free plan). Recorded there as network-kit D-062 (peer replay: a guide section and maybe a helper), network-kit F-063 (server receive time) and network-kit F-064 (server-run verification, Low, costs noted; owner asked for it to be recorded). None stops bots or assisted play. Decide during F-028: what *Reopen Previous Room* becomes (network-kit rooms live 24 h after the last player left).
- 2026-11-18 (T-008): owner decided that room codes become 6 characters (network-kit's default) with the move; Bricks' four-letter codes and the reopen-previous-room code change with it.
- 2026-11-18: owner put the move in the backlog and said it may come sooner than planned. Split into T-008 (decisions), F-028 (build) and T-009 (retire Firebase and the admin Worker).
- The shared room server plan that used to live here (2026-11-13 – 2026-11-14) moved on 2026-11-15 to https://github.com/BadBagel47/network-kit (network-kit F-001 – network-kit F-005). Earlier text is in git history.
- Check 2026-11-17 against network-kit v0.2.3 (network-kit D-012 games pass): Bricks fits a host-run room used as a relay (each browser runs its own game from the room's seed; snapshots and Battle rows go as messages to the other player), with owner/host as today's code owner and lobby host, `ownerLeave: 'pass'`, no late join, countdown with seed, rematch as a new round, invitation keys in the link, EU-only rooms. Missing in network-kit before Bricks can move: network-kit F-029 (rooms created by an admin invitation that nobody in the room created; needed for private links) and network-kit F-003 (shared admin page, with the open/closed check also at round start and rematch). Not yet proven: Cloudflare free-plan figures (network-kit D-011 there; Bricks sends about 4 snapshots per player per second) and real phones (network-kit D-025 there); first real user Critical ST8 is not finished. Stays in Bricks: reopening a previous room with the same code, settings approval, results and history, four-letter codes. Recommendation: keep waiting.
- Update 2026-11-18 (network-kit v0.7.0): network-kit F-029 (rooms from an invitation) and network-kit F-003 (admin page; Off also refuses new rounds and rematches, running games finish) are done; Cloudflare free figures checked (network-kit D-011) and the phone/iPad test done (network-kit D-025). Still not used by a real game; Bricks waits until it is (owner decision). Owner decision: use network-kit's admin page and sign-in, retire Bricks' admin Worker. Network-kit's answers (2026-11-18): separate 1 Player On/Off/Until is not supported yet, recorded there as network-kit F-057 (modes per game and a room-less status check); administrators playing while closed is not supported, recorded there as network-kit F-058 (needs a design). Correction from network-kit (2026-11-18): *Private only* does not match Bricks' public Off, because with it anyone can still create a room and invite friends; with Off, invited friends are refused even when the owner uses an admin link. Covered by network-kit F-059; a smaller first step (a room created with an admin link admits holders of its invitation link while the game is Off) is proposed to the owner there. Building network-kit F-057/network-kit F-058 is the owner's call in network-kit. Since network-kit v0.8.0 room codes are 6 characters by default; Bricks switches to 6 with the move (owner, 2026-11-18). Rough estimate (not measured): a match uses about 1,400 of 100,000 daily Durable Object requests per hour; room time (awake during the whole match) allows roughly 29 match hours a day, shared with the other games. Bricks-side work when moving: 2 Players transport, a small game Worker for rooms, the privacy text in Settings, then remove Firebase.
- What stays here: moving Bricks Score Duel and Battle from Firebase to network-kit once it is proven with Boomers. Bricks then keeps its own rules (snapshots, Battle garbage) as its plug-in and reuses network-kit for rooms, codes, invitations, reconnection and the admin page.

### F-008 Boomers (moved)
- Moved on 2026-11-15 to https://github.com/BadBagel47/boomers (F-001 solo endless mode, F-002 online play, D-004 design proposal). Earlier text is in git history.

### F-026 Boomers campaign (moved)
- Moved on 2026-11-15 to https://github.com/BadBagel47/boomers (F-003 there, parked).
