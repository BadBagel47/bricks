# Multiplayer — milestones 3.1–3.11

## Milestone 3.3 lobby and quota review

The lobby shows both connection states and permits the current host to transfer
that role to the existing guest. The transaction swaps the two role slots without
changing names, reservation owner, timestamp or epoch. Only the original code
owner can reopen a closed room. An old owner has no host power after transfer.
Leaving as host hands the role to the remaining player; the last host leaving
closes the room. Disconnecting marks a player offline, without silently evicting
their slot or granting another player host power. Full recovery/active-tab leases
remain milestone 3.12. No settings/approval/Start Match controls are added before
their respective milestones.

Presence is stored separately at `presence/CODE/EPOCH/UID/CONNECTION_ID`, with a
boolean record per lobby tab. Writes are authenticated, membership/epoch checked,
and limited to boolean records with fixed-length connection IDs. Reads require current room membership.
Cleanup is registered with `onDisconnect` before each connection is advertised.
There are no application heartbeat writes. A failed entry or leaving the room
disconnects the database; menu and single-player use no database connection.

See [Firebase Spark budget](FIREBASE_QUOTA.md) for quota assumptions, implemented
traffic limits, retention, operating thresholds and the later snapshot budget.

Deployment order: run emulator/browser CI on `milestone-3.3`, copy its reviewed
`firebase/database.rules.json` into the production console and publish, then push
the checked commit to `main`. Branch CI never deploys Pages. Keep the working 3.2
site live until rules are installed; old tabs must reload before transferred
roles can be parsed. No Firebase admin credentials are available in this cloud
instance; production rule installation still requires the owner.


The owner approved Phase 3 after the single-player polish review. This milestone
provides the Firebase boundary, anonymous identity, immutable code reservations,
emulator tooling and security tests. Room creation/joining is milestone 3.2.
Milestone 3.2 adds the room UI and transactions below. Later sections cover settings, countdown and live play.
The single-player engine is independent from Firebase; the app loads the Firebase
client only when entering a configured room flow.

## Room flow implemented in 3.2

The 2 Players menu offers Host Game, Join Game and Reopen Previous Room. Invitations
use the current deployment origin and path, including `/bricks/` on Pages. The
`room` query survives name onboarding and is normalized after a successful join.
Copy Code and Copy Invite Link have independent feedback and an exact-text
selection fallback when clipboard access is denied.

Room data currently has this bounded shape:

```text
rooms/CODE
  version: 1
  ownerUid, hostUid                 # code ownership and current lobby role
  epoch                            # starts at 1; increments on reopen
  status: waiting | closed
  createdAt
  players/host: { uid, name }
  players/guest?: { uid, name }
```

Creation requires an existing reservation owned by the authenticated creator.
Room reads require an authenticated user who knows the code; they reveal only
lobby metadata (names, identities, epoch and waiting/closed state). Listing rooms
is denied. This limited pre-join read permits atomic join transactions and clear
not-found/closed/full errors. Sessions remain denied; presence uses its separate participant-only path.

Joining never creates a room. Root transactions and complete old-to-new rules
permit one distinct guest and protect the host, owner, timestamp and epoch. Two
concurrent joins cannot both claim the guest slot. An already joined UID can
return after reload. A guest can release only their own slot. The last host closes the room on explicit exit. Leaving while a guest remains
transfers the host role. The original owner may reopen a closed room with an
incremented epoch and no guest. Old-epoch leave requests cannot close a newly reopened room.

Owner update 2026-11-06: new rooms use four random characters. Code editing has
been removed from both the lobby UI and repository API. Older 6–8 character
rooms/links remain accepted (input/rules allow 4–8); reopens keep the owned code.
Host transfer moves only the host role. The code and its original ownership do
not move or reset. Allocation still reserves atomically and retries collisions at
most eight times. Four-character space has 32^4 = 1,048,576 possible codes; code
knowledge is not a secret credential or a grant of host permissions.

The previous-room localStorage value is a hint, never an ownership credential.
Another UID cannot reopen it even if they copy that value. The room listener
rejects invalid snapshots or changed epochs. Mutation preflight waits up to eight
seconds for a database connection before queueing a transaction. A write already
in flight can still complete after a temporary disconnection; it is not reported
as cancelled. Presence and transferable host roles are implemented in 3.3; active-tab
leases and coordinated match recovery remain later milestones. Offline guests retain their slot until they return and leave. Automatic eviction
and recovery of a lobby stranded after a host handover remain future recovery work.

The room screen shows unavailable status and disables Host/Join when Web App
configuration is missing. GitHub Pages reads the five `VITE_FIREBASE_*` fields
from repository Actions **Variables** during build. Set those public fields only
after configuring the actual Spark project and deploying the reviewed rules.
No production project or rules deployment is inferred from emulator tests.

`tests/firebase.rooms.mjs` exercises the actual UI in distinct browser contexts:
host and four-character code, clipboard success/failure, invited guest onboarding,
reload/rejoin, third-player rejection, invalid/missing/closed codes, leaving,
reopening and failed ownership theft. The rules suite separately checks concurrent
guest claims and malicious payloads. The room UI is also checked at 320 px width.

## Local development

Requirements: Node.js 24, npm, Java 21 or newer, and Chromium/Chrome for browser
checks. `BRICKS_CHROMIUM_EXECUTABLE` can select the installed browser.

```sh
npm ci
npm run emulators
```

The command starts Anonymous Authentication on `127.0.0.1:9099` and Realtime
Database on `127.0.0.1:9000`, always under the non-billable `demo-bricks` project.
The first run downloads the official database emulator from
`storage.googleapis.com`; the CLI verifies its checksum. Emulator artifacts and
CLI state are kept in ignored `.firebase/`, and no Google login is needed.
Data is ephemeral. The local emulator has admin endpoints and is bound to
loopback only; never expose it publicly.

For local multiplayer UI work, copy `.env.emulators.example` to `.env.local` and
run `npm run dev` separately. Single-player does not initialize Firebase.
Emulator and real project settings cannot be combined.

```sh
npm test
npm run build
npm run lint
npm run test:browser
npm run test:firebase
```

`test:firebase` starts/stops its own emulators; stop an existing emulator process
before running it. It runs real rules-engine tests and Chromium authentication
checks. The two browser contexts represent independent anonymous players; a reload
must preserve the first player's UID. The tests also try to steal a reservation,
impersonate its owner, change its creation time, enumerate codes and access denied
paths. Concurrent transactions must produce a single owner.

GitHub Pages CI runs these checks with Java 21 before publishing the application.
It needs no real Firebase project or credentials and does not deploy database
rules. A failed emulator startup is a failed check, never a passing zero-test run.

If the database emulator download is blocked, `npm run test:firebase:auth` can
verify browser authentication independently. That partial command intentionally
skips the database ownership check; it does not replace the full rules suite.

## Connecting a real Firebase project

1. Create or select a Firebase project on the Spark plan. Do not enable billing.
2. Register a Web App, enable **Authentication → Anonymous**, and create a
   **Realtime Database** in locked mode. Select an appropriate European region.
3. Copy `.env.example` to ignored `.env.local` and fill in the five public Web App
   fields from Firebase's app settings, including the actual Realtime Database
   URL. Keep `VITE_FIREBASE_USE_EMULATORS=false`. These fields are public client
   configuration, not administrator credentials. Never put a service-account key,
   refresh token or Admin SDK credential in any `VITE_` field.
4. Review the target project and this milestone's rules, then deploy only those
   rules with the Firebase CLI's authorized identity:
   `npx firebase deploy --only database --project YOUR_PROJECT_ID`.
   Deployment and a live two-player smoke check must be recorded separately from
   emulator results. Until that happens, production Firebase is unverified.

There is deliberately no default production project in `.firebaserc`, no Hosting
deployment and no automatic rules deployment. Firebase Hosting is Phase 4.
GitHub Pages builds read the public Web App fields from repository Actions
variables, as wired in milestone 3.2.

For the cloud environment, the local emulator download requires
`storage.googleapis.com`. Live project work will additionally require the exact
database hostname, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`
and authorized Firebase CLI/API access. Add only the destinations needed once
the actual project is known. Do not confuse an installed SDK with cloud access.

## Identity and client boundary

`src/multiplayer/config.ts` validates complete Web App configuration or explicitly
selects fixed demo emulator endpoints. Missing configuration leaves multiplayer
unavailable without affecting single-player. Invalid or mixed configuration fails
closed. The initial production configuration accepts the standard
`PROJECT_ID.firebaseapp.com` auth domain and HTTPS Firebase database URLs.

`firebase-client.ts` is initialized only when the multiplayer room flow asks for
it. `getPlayer()` waits for persisted authentication before signing in anonymously,
deduplicates concurrent requests and permits retry after failure. The browser SDK
persists the anonymous identity. Changing config requires a page reload.

Ownership is tied to `auth.uid`, never a username, code or localStorage flag.
Clearing browser authentication storage can permanently lose code ownership.
Errors crossing into UI are converted to fixed English messages without exposing
raw Firebase responses. The room-specific messages are added with milestone 3.2.

## Rules implemented in 3.1

The database defaults to denying reads and writes. Only the following path opens:

```text
roomReservations/CODE
  version: 1
  ownerUid: authenticated creator's UID
  createdAt: server timestamp
```

Codes use 6–8 characters from `A–H`, `J–N`, `P–Z`, `2–9`. The UI normalizes
case before access. An authenticated player may inspect one known code,
including its owner's UID, but cannot list reservations. There is no secret in
reservation metadata. Use a transaction for allocation; knowing a code never
permits claiming an existing reservation. All fields are immutable and no client,
including the owner, may delete it. Unknown fields, wrong types, timestamps not
equal to server time and attempts to reserve for another UID are rejected.

The original 3.1 rules denied all other paths. Milestone 3.2 adds the narrowly
scoped room transitions described above; sessions, presence and all unknown paths
remain denied. Existing reservations are retained if creating a room fails,
allowing only the original owner to retry. Closing a room does not free its code.

## Planned room and session contract

This is architecture for subsequent milestones, not a claim that these paths
are implemented or currently writable:

```text
rooms/CODE
  version, ownerUid, hostUid, epoch, status
  players/slot0, players/slot1    # UID, username, joinedAt
  settingsRevision, settings
  approvals/UID                  # approved settings revision, timestamp
  currentSessionId

presence/CODE/UID/connections/CONNECTION_ID
  connectedAt, lastSeenAt

sessions/SESSION_ID
  roomCode, roomEpoch, participants, settingsSnapshot
  pieceSeed, startAt, status
  gameplaySnapshots/UID          # compact board, counters, piece index, sequence
  attacks/ATTACK_ID              # sender, receiver, sequence, rows
  results/UID                    # score, lines, Game Over elapsed time
```

The reservation owner controls reopening the code; `hostUid` is a transferable
lobby role. A new room epoch invalidates old session messages and stale invite
state without giving the next guest ownership. Two fixed participant slots cap
membership at two distinct UIDs. Player names are presentation data.

Transactions will allocate codes, create rooms, claim a slot, transfer host and
start matches. Reserving a code precedes room creation; an interrupted second
step leaves a safe owner-only reservation. Joining never creates a missing room.
An empty guest slot must be readable to an authenticated code holder for its
claim transaction; the write must identify that same UID and preserve the host.
Gameplay/session reads are restricted to participants. Do not grant a broad
participant write at an ancestor: Realtime Database grants cascade and children
cannot revoke them. A transaction at a shared root needs a complete, explicitly
authorized old-to-new transition and immutable unrelated fields.

The intended room state transitions are:

```text
waiting → configuring → waiting
waiting → countdown → playing → completed
countdown → waiting                         (disconnect/cancel)
playing → reconnecting → playing/abandoned
completed → waiting                         (fresh rematch)
waiting/configuring/completed/abandoned → closed
closed → waiting                            (owner reopens; new epoch)
```

Each transition needs participant, host and revision checks before its feature is
enabled. Only the host publishes settings or starts a countdown. Each participant
approves only for themselves, tied to the exact settings revision. Countdown
freezes the revision, two participant identities, a fresh seed/session ID and a
shared server-clock start time five seconds ahead. A disconnect cancels it.
Host transfer requires the current host and an existing participant; it never
changes reservation ownership.

## Synchronization, recovery and costs

Gameplay stays local and uses the engine's deterministic seed stream. Future
network code sends compact snapshots at a capped rate (initial target: at most
two per second), plus important events; it must never send every frame or
keypress. Server rules will bound payload shape, board size, counters and identity.
A timestamp is not proof of fair play. Client-reported scores and elimination
times remain untrusted; this architecture cannot guarantee cheat-proof matches.

Presence uses `.info/connected` and `onDisconnect` with separate connection IDs.
A transactional active-control lease to prevent two tabs controlling one player
remains future work before active matches. Reconnection gets approximately 30 seconds. Recovery must check
the room epoch, session ID, identity and valid saved snapshot before resuming both
players. Otherwise the match becomes Abandoned and earns no competitive result.

Keep code reservations lightweight and clean up old session payloads through
authorized client operations. No paid backend functions or billing upgrade are
assumed. Authentication and these rules do not provide robust per-person rate
limits: someone creating many anonymous identities/reservations can still consume
the free quota. App Check and operational quota monitoring can reduce abuse but
do not make browser gameplay authoritative.

## Milestone boundaries

- 3.1: configuration, anonymous identity, reservation ownership rules, emulator
  verification and this architecture.
- 3.2: actual room creation/joining and invite URLs, with atomic two-player
  membership and matching permission/concurrency tests.
- Later milestones: lobby/host roles, shared settings, approvals, countdown,
  snapshots, modes, results and reconnection, each with its own tested rules.

Use Sol Medium for 3.2's transactions and authorization. A later straightforward
menu-only task can use Luna Medium. Stop for owner review at each milestone.

Official references:

- https://firebase.google.com/docs/auth/web/anonymous-auth
- https://firebase.google.com/docs/database/security/core-syntax
- https://firebase.google.com/docs/database/security/test-rules-emulator
- https://firebase.google.com/docs/emulator-suite/connect_rtdb

## Disconnected guest follow-up

Closing a tab removes presence but used to retain the guest slot indefinitely.
The staged follow-up has the connected host wait 15 seconds of observed guest
absence, then transact a release of that specific guest in the same room epoch.
Reconnects and any other open tab for the guest cancel the timer. The rules require
current host authority, unchanged host/ownership/epoch and no guest presence record
at evaluation time. The grace timer is client policy; rules enforce actual absence,
not an independently measured 15-second interval. This is lobby cleanup, not active
match recovery. If the host is also offline there is no cleanup coordinator.

Publish the updated rules before the client. No polling, heartbeat writes or paid
functions are added. Explicit Leave Lobby still releases the slot immediately.

## Milestone 3.4 — shared settings and approval

`matchSettings/CODE/EPOCH/config` stores five bounded fields: revision, mode
(score-duel/battle), startLevel (0–19), hold and requireApproval. An absent config
means defaults: Score Duel, level 00, Hold off, approval off. Only the current host
may publish; changes increment revision exactly once. No-op Apply and Cancel do
not write. Drafts are local React state, discarded when changing rooms or roles.
Stale editors cannot overwrite a newer settings revision. Gameplay remains future
work; there is no Start Match button in 3.4.

The separate `approval` node contains revision, hostUid, guestUid and roleRevision.
Only the current guest can approve the current published configuration while
approval is enabled. Rules reject host/third-player approval, stale revisions,
wrong roles and extra fields. Effective setting changes invalidate the binding.
`rooms/CODE/roleRevision` advances on every host change (legacy absent value means
zero), preventing a double handover from reviving an old approval. Settings survive
host handover, while the editor resets and the former host must approve anew.
Membership checks, epoch scoping and bounded payloads are enforced server-side.
Two small configuration/approval listeners close with the lobby component; no
polling or heartbeat traffic is added. Epoch-scoped old settings are small but
not automatically purged yet; do not claim historical metadata has a TTL.

Stage on `milestone-3.4` and run full CI without Pages deployment. The owner must
publish the updated rules before this client is activated on main. Existing 3.3
clients must reload after activation: old host-transfer writes do not include the
new generation. No administrator identity is attached to this runtime. Stop for
review at 3.4; the dedicated host-configuration waiting screen is 3.5.

## Milestone 3.5 — host configuration waiting

A guest sees the dedicated host-configuration status while any connected current
host tab is editing. The panel hides published-settings approval controls during
that wait, but room navigation/Leave remain available. No draft values are sent.
Only Apply publishes the effective settings; unchanged Apply and Cancel preserve
approval as before.

`matchSettings/CODE/EPOCH/editors/UID/CONNECTION_ID` contains only roleRevision.
The marker is written once on editor opening after registering onDisconnect
cleanup, and removed on close. Writes require current host identity, waiting room,
matching epoch and role generation; cleanup can remove the writer's own obsolete
marker. Guests cannot advertise editing or inject draft fields. Old markers cannot
keep the UI waiting after role changes; host presence gates waiting during network
loss. Separate tab IDs keep one tab's cleanup from erasing another editor's state.
The editor re-advertises after reconnect only if the local draft is still open.
No polling/heartbeat writes are used. Normal marker cleanup is best-effort with
onDisconnect fallback; it is not a server TTL or an absolute guarantee under
revoked authentication.

The 50 approved messages from spec section 30 use a client-only shuffle bag.
Each full cycle contains all 50 once; its first five exclude the preceding five.
The bag survives waiting-screen unmounts and host-role changes within the same
room/epoch and resets when leaving that lobby. Reading the current message is
idempotent, including React StrictMode rendering. Only a visible waiting screen
runs the eight-second interval; no messages are rendered over active gameplay.
Changing a message has no Firebase operation and does not repeatedly announce
text to screen readers.

Stage on `milestone-3.5`; publish reviewed marker rules before main activation.
Stop after owner review of 3.5. Five-second countdown/seeded start remains 3.6.

Participant-only presence/settings listeners now start after the room watcher has
observed confirmed membership. A transaction/get cache may otherwise produce a
join result before all participant reads are authorized, permanently cancelling
an early listener with Permission Denied. Admission is cleared on room errors and
fresh joins, including a retry into the same room/epoch. Room-known-code reads
remain narrow and existing participant-only security rules are not relaxed.

## Milestone 3.6 — countdown and shared starting state

`matchStarts/CODE/EPOCH` is one bounded current preparation record, not a match
history. It contains a random id, unsigned 32-bit seed, frozen five-field settings,
role generation, host/guest UIDs, selected connection IDs, server countdownAt and
status countdown/ready/cancelled. The common start time is countdownAt + 5000 ms.
Only the host can create it with two live selected connections, no open host
editor and current guest approval when required. Server rules compare every frozen
setting/role to the current lobby; unknown fields and forged timestamps are denied.

Readiness requires five seconds to have elapsed on the server and all frozen
roles, settings and selected connections to remain valid. The host schedules one
readiness transition using `.info/serverTimeOffset`, with a small transport margin;
the server enforces the deadline independently of either browser's wall clock.
Counters render locally; no timer writes are sent per second or animation frame.
Settings, approvals, new editor markers and room membership/host changes are
blocked while countdown/ready is active. Explicit lobby exit first cancels the
preparation. Cancellation is participant-only and compares the exact start id;
a delayed old cancellation cannot cancel a replacement start. The next attempt
uses a fresh id and freshly drawn seed and overwrites the cancelled record.

Presence now uses a fresh per-tab ID after every reconnect. A selected connection
loss cancels the preparation when observed by a connected participant. The host
must still be on the initiating connection to promote it to ready. If all clients
are offline no coordinator can immediately write cancellation; once a client
returns, missing old connection IDs cause cancellation rather than silent revival.
Presence detection is subject to server socket-loss detection latency, not perfect
instant partition detection. Extra tabs do not provide an active-control lease;
full gameplay tab ownership/recovery remains later work.

At ready, each client derives the same empty board, opening piece/preview, level,
Hold rule and deterministic randomizer from the frozen seed/settings. The UI shows
the initial piece/preview and score as a read-only prepared state. No inputs,
gravity, opponent snapshots, penalties or competitive results are enabled here;
those belong to subsequent milestones. Personal Hard Drop/audio/input preferences
remain personal and are not published as shared settings. Late readiness is not a
claim of zero-latency gameplay synchronization.

Stage on milestone-3.6 and verify emulator/browser CI. Publish reviewed rules via
the owner before main activation; reload both clients. Stop for 3.6 review before
implementing live boards in 3.7. Configuration history/metadata retention remains
as previously documented; current preparation itself has no accumulating event log.

## 3.7 live display synchronization

Gameplay uses the same local engine and saved personal input/audio preferences as
single-player. Both clients derive their stream from the frozen shared seed. The
opponent is display-only: received data never drives the local engine. Shared
board, preview and touch components retain the earlier focus/volume fixes.

`gameSnapshots/CODE/EPOCH/UID` contains only each participant's latest state, with
match ID, frozen connection, monotone sequence, server update time, 200 visible
cells encoded as digits 0–7, Next/Hold, status, score, level and lines. Eleven
bounded fields; no histories. Stale match IDs and sequences are ignored. The client
publishes only changed visible state, with one request in flight and a minimum
200 ms delay after acknowledgement; the server also enforces 200 ms between
updates (500 ms before B-003). Checkpoints and Battle attack records use the same
200 ms rule interval. Terminal Game Over is sent once, through the same budget.

Rules restrict writes to the owning participant and the current ready session's
selected present connection. Numbers, pieces, schema, monotonicity and terminal
state are checked. These bounds do not validate a complete legal input replay:
client-owned scores are not server-authoritative anti-cheat. A same-UID malicious
tab can reproduce a connection ID; full control leases/recovery remain 3.12.

The game page is a portal outside the inert lobby. Tab is prevented before native
focus movement and cycles only visible game/dialog controls; boards have no tab
stop. Esc/the personal Pause binding opens a leave confirmation without pausing
multiplayer gravity. Returning cancels the prepared session for both players.
Current disconnect behavior cancels the session and records no competitive result.
Score Duel completion, Battle penalties, results, highscores and rematches retain
their later milestones.

The owner authorized this step without a manual 3.6 review and wants fewer manual
test interruptions. Full automated security and real two-session checks remain
required. Stage on `milestone-3.7`; install its reviewed snapshot rules before
publishing the client from main.

3.7 validation: `a4d5641` passed full branch CI (https://github.com/BadBagel47/bricks/actions/runs/42261496444), including real two-session
line clears and score mirroring, independent keyboard/touch movement, snapshot
rate/payload bounds, terminal Game Over, focus containment, three mobile
viewports, and server-side ownership/schema/rate/stale-match/terminal checks.
Local lint/build, 109 unit tests and 15 production single-player Chromium checks
also passed. Local Database Emulator rule upload remains blocked as previously
recorded; the complete server result is from CI. Pages deploy was skipped.

## 3.8 Score Duel

Both local engines keep running independently until their own Game Over. No
penalty events are sent. A finished player sees a saving state until its terminal
snapshot write is acknowledged, then waits and watches the opponent. The survivor
can keep moving/clearing lines. Neither a live lead nor the first elimination
settles the duel. Only two current, confirmed Game Over scores yield win/loss or
a draw, from each participant's perspective. Highest final score wins; finish
order is irrelevant. Exact equality, including zero, draws.

The outcome is a pure derivation from the existing snapshots, with no new paths,
writes, listeners or rules. It is not a durable shared result record or a
server-authoritative anti-cheat system. Existing rule-enforced terminal states,
match/connection IDs and monotone sequences still apply. Own final eligibility is
set only on successful write acknowledgement; sync errors suppress settlement.
Disconnect/leave still cancels the session as in 3.7; full recovery and durable
results remain later work. No highscore is recorded in this milestone.

Completed games retain both boards/final scores and show an inline outcome, with
a direct Return to lobby action. An unfinished duel still asks before cancelling
both players. Final publishers stop their local timer after acknowledgement.
Two-session tests cover independent continuation, higher-score victory despite
finishing first, reciprocal outcomes, zero draws with reversed finish order,
terminal stability, no solo highscore pollution, reset into a fresh match and
Tab/Space exit. No manual Firebase rule installation is needed for this step.

3.8 validation: main `a3db2c0` passed complete CI and deployed Pages (https://github.com/BadBagel47/bricks/actions/runs/42296466728).
The new two-browser test completed a real positive-score duel with the winner
eliminated first, confirmed continuing control for the survivor, reciprocal
outcomes, stable acknowledged finals, a zero-score draw in a fresh session with
reversed finish order, and Tab/Space return to lobby. Existing Firebase security,
countdown, live-sync and single-player browser suites also passed. No database
rule or quota increase was required. Full result persistence/highscores, Battle
and coordinated recovery remain later milestones.

## 3.9 Battle penalties and survival

`engine/battle.ts` is a pure adapter: a line clear generates 0/1/2/4 outgoing rows
for one/two/three/four lines. First consume the oldest queued incoming rows as
cancellation, then apply the remaining queue after the piece locks and clears.
The underlying engine has already spawned; a shifted-board collision or discarded
occupied top cell produces the same top-out as raising before the next spawn.
Garbage is a grey `G` cell, encoded as 8 in Battle snapshots, with exactly one hole
per row. A stateless hash of shared seed, sender role and row ordinal generates
holes separately from the piece RNG. Scores, levels and piece order are unaffected
by receiving garbage. Clearing garbage uses normal line scoring.

`battleAttacks/CODE/EPOCH/UID` stores only `{matchId, connection, seq, total,
updatedAt}`. A row's unique ID is the tuple (match ID, sender UID, ordinal 1..total).
The receiver retains a high-water prefix and consumed/applied/cancelled counts;
repeated, late and coalesced snapshots cannot replay rows. Pending counts stay
numeric, and at most 20 physical rows are allocated even for a maliciously large
prefix (overflow ends the local game). No event history or per-row writes.

The sender batches net generated rows inside the existing >=200 ms publisher
cycle, with event-driven preflight reads and a transaction. Server rules bind the
stream to the current Battle version, selected connection, membership/presence,
monotone sequence/total, bounded fields and update interval. They reject sending
after either player's current Game Over. If the opponent finishes between read
and write, a confirmed final snapshot suppresses unsent rows; other failures stop
synchronization. Existing queued attacks sent before elimination may still land.

`battleFinishes/CODE/EPOCH/UID` stores one immutable current-match final frame and
sent/received/applied/cancelled counts, plus match/connection/server update time.
It requires the player's acknowledged terminal board, exact committed sent count,
bounded received count and consistent accounting. Final frame may not lie more
than one second ahead of the server timeline (clock tolerance). This constrains
payloads, but is not authoritative anti-cheat or replay validation.

Battle runs on a shared 60 Hz frame timeline, anchored once from the Firebase
clock offset and countdown deadline through monotonic performance time. Inputs
first catch gravity up to that frame. A catch-up loop stops on the actual fatal
simulation frame, rather than using the delayed network arrival time. Both
participants continue until Game Over; longer survival wins and equal frames draw,
regardless of points. Outcomes require both final board states and acknowledged
Battle finishes. Disconnect still cancels without a competitive result; recovery
remains 3.12. Full results/highscores/rematches remain later work.

New starts freeze `battleVersion: 1` for Battle only. Old clients cannot start a
new penalty-free Battle under these rules; they fail closed on new Battle starts.
Existing legacy Battle starts can still be cancelled, and the new client asks for
a new start rather than mounting live Battle without a protocol marker. Score
Duel retains the eleven-field board protocol and does not initialize Battle paths.
Install checked rules before activating the new client; reload both clients for
Battle. Local emulator upload remains blocked, so full CI is the server gate.

3.9 validation: source `8a90d27` passed complete branch CI (https://github.com/BadBagel47/bricks/actions/runs/42310387560). The two real
browser sessions generated a multi-row clear via keyboard inputs, sent a real
attack prefix, showed it queued without early board changes, applied the grey
rows at lock, avoided reapplication on the next lock, and confirmed that later
survival wins even with fewer points. Final prefixes/frames remained stable and
return to lobby worked. Server tests covered protocol marker/migration, identity,
epoch/match/connection, counters, rate, terminal restrictions, immutable finishes
and payload bounds, alongside all existing suites. Local lint/build, 119 unit
tests and 15 production single-player Chromium checks passed. Pages was skipped;
owner rule installation is the only outstanding external step before activation.

3.9 publication: owner confirmed the checked rules installed on 2026-11-07.
Main `1eaa086` passed complete CI and deployed Pages (https://github.com/BadBagel47/bricks/actions/runs/42323293594); app source is
unchanged from validated `8a90d27`. Reload both clients before starting Battle.
Manual playtesting remains consolidated; no owner test is required at this stop.

## 3.10 frozen results and local rankings

A `ResultCollector` per live match accepts the opponent's current match/connection
snapshots and Battle finish metadata. It emits exactly once only after own terminal
write acknowledgement and both participants' terminal state. Battle also needs
both confirmed frames/counters. The collector is independent of the game view's
lifetime, allowing a late own acknowledgement to save after peer-driven lobby
return. Canonical peer terminal data precedes its subsequent cancellation on the
same Firebase socket. Incomplete/rejected/stale records never settle a match.

The parent holds the immutable results view separately from the live lobby, so
peer return/host transfer/disconnect cannot erase an already completed result.
Underlying session observers remain active until cancellation. Game input handlers
are disabled while results show; the underlying page is inert and result Tab order
is contained. Both terminal boards become a full results table, winner/draw,
point difference and Battle statistics. Return to lobby uses existing cancellation;
Main Menu uses existing leave/host handover. Coordinated Rematch/readiness/fresh
approval is deliberately the next milestone, 3.11, rather than an automatic start
from the result page.

`bricks.multiplayer-results.v1` stores `{version: 1, matches: MatchResult[]}` locally.
Each match includes mode, ID, room/epoch, shared start date, and both participants'
UID, historical name, score, level, lines, outcome and optional Battle counters.
Each participant's logical record ID is match ID + UID. The pair is stored atomically
and deduplicated as one completed match on each device. Web Locks serialize tab
read-modify-write operations where available; the fallback is synchronous per tab
and does not guarantee cross-tab mutual exclusion. No cloud result/history writes
or new Firebase listeners/rules are used. This is local history, not cross-device
cloud synchronization or authoritative anti-cheat.

Storage failures leave the result visible with Retry saving; existing history is
preserved, including unrecognized future envelopes. History is retained, not
silently pruned; browser quota/cleared storage/identity loss remain browser limits.
A view exit does not cancel an already started local save. Closing the whole tab
before final data arrives is not full recovery and remains later work.

Score Duel top ten includes both participants' individual completed scores, ordered
by points descending, earlier shared match date, then logical record ID. Battle
aggregates by UID, never display name: wins descending, win rate (wins / all
completed games including draws), total points, then UID. It shows wins, games,
percentage, points, lines and sent rows. The aggregate label uses the latest match
name; every historical record retains its own original name. Solo storage/ranking
is unchanged. The main High Scores page exposes all three mode-specific lists.

3.10 validation/publication: main `5744540` passed full CI and deployed Pages
(https://github.com/BadBagel47/bricks/actions/runs/42327837605). Real two-session tests checked identical both-player archives on both
devices, saving retry after a simulated quota failure, completed results retained
after peer exit, draw histories, reload and historical-name preservation after a
profile rename, contained result focus, narrow/landscape width, and Battle
statistics/ranking. All earlier server/security/gameplay suites also passed.
Local lint/build, 126 unit tests and 15 single-player production Chromium checks
passed. No production rules or administrator actions were needed. Manual review
remains consolidated into a later playable checkpoint.

## 3.11 rematch consent and approval generations

Results offer Rematch and Main Menu. Rematch returns to the same lobby; published
settings remain the defaults and the host may edit them or transfer host role.
Both participants must accept the lobby before a new countdown; the host alone
presses Start Match. A participant still reviewing results does not consent.

`roundReadiness/CODE/EPOCH/host|guest` stores at most two four-field intents:
UID, connection, previousId, roleRevision. Lobby entry publishes idempotent intent
only after membership/presence and current start data are confirmed. Results
withdraw only this connection's intent. Superseded asynchronous operations check
relevance before applying a transaction, preventing old withdrawal from erasing a
new Rematch acceptance. Presence invalidates stale connection intents without
heartbeats. Slots are overwritten across guest changes/host transfers, not
accumulated per participant or round.

New starts freeze `roundVersion: 1` and `previousId` (the last start ID, or `-` for
the first). Creation requires both exact UID/connection/generation intents for
that previous ID. Countdown-to-ready rechecks the same frozen intents, so a
withdrawal cancels preparation. Live-ready matches do not require old consent to
remain after completion. Only the current host may create/advance starts. Every
new ID/seed differs from the previous pair; repeated random seed output increments
within uint32. Fresh engine/Battle/collector instances plus match-ID filters reset
boards, scores, Hold, penalties and elimination state while preserving archives.

Approvals add `roundId`, matching the previous start ID for a new attempt. Settings
revision and role/participant binding still apply. Approval stays bound to the
frozen previous ID through the active countdown, but a cancellation/new attempt
needs approval for the last ID again. No-op settings publication still writes
nothing. Guest departure/replacement or host transfer cannot revive approval or
readiness from an earlier generation.

For rollout, legacy first starts are still accepted only when no start record
exists; existing legacy matches can finish/cancel. An old client cannot create a
rematch after any previous start. New clients parse both generations for safe
cancellation. Install checked rules before activating the new client and reload
both clients. No paid backend or result-history writes were added. Active-control
leases and coordinated interruption recovery remain milestone 3.12.

3.11 validation: source `0ddf8c4` passed full branch CI (https://github.com/BadBagel47/bricks/actions/runs/42402648129). The two real
browser sessions completed Battle with an actual attack/Hold, blocked a new
start while one participant reviewed results, required a fresh approval, transferred
host between rounds and invalidated that approval again, then started from reused
settings with a new ID/seed and zeroed board/score/Hold/penalty state. Saved history
remained unchanged. Server tests enforced stale/forged/role/connection/previous-ID
intent restrictions, fresh approvals, seed difference, host-only start, countdown
withdrawal and legacy rematch rejection. All prior suites passed. Local lint/build,
130 unit tests and 15 single-player production Chromium tests passed. Pages was
skipped; owner rule publication is required before activating the staged client.
## 3.12 recovery work in progress

The `milestone-3.12` test branch is not a deployable recovery release. During a
match the candidate client stores a compact engine checkpoint atomically with
each changed display snapshot. A participant-owned control lease is bound to the
match and connection; the server only permits a new connection to claim it once
the old connection is absent. Legacy matches with no lease retain their existing
write rules. A lease is not itself a recovery authorization.

When an original match connection disappears, either connected participant can
create the server-timestamped pause. Both clients freeze input and simulation;
the server refuses subsequent gameplay/checkpoint/attack writes for that match.
The fixed deadline cannot be reset. After 30 seconds a connected participant can
mark the interruption abandoned and cancel the session without an incomplete
competitive result. There is no background worker: if nobody is connected,
expiration is processed when a participant returns. A transient connection can
be detected later than the physical interruption by Firebase presence.

The recovery readiness process claims a lease and compares the player's saved
engine with its acknowledged display snapshot and, for Battle, the authoritative
attack-stream prefixes. Its bounded record is tied to the match, current lease,
checkpoint sequence, interruption cycle and deadline. This is a consistency
check, not proof that a client played honestly. Once both players confirm, a
server transaction authorizes the current connections and the publishers resume
from their confirmed sequences. Each subsequent interruption starts a distinct
cycle so old confirmations cannot authorize a new resume.

For Battle, recovery advances each saved game to the later checkpoint frame
before delivering attack prefixes received after that checkpoint. If an active
board would need more than 120 frames of catch-up, recovery is refused. Finished
boards require their confirmed final record; inconsistent or unavailable state
leads to abandonment without a competitive result. Inputs after the last
acknowledged snapshot can be lost, and Firebase presence may detect a disconnect
after it actually happens. Recovery is not guaranteed.

Final branch CI passed for `03d97ed`, including host/guest reconnect, repeated
recovery and reload, queued Battle attacks, finished-player results, abandonment
and server authorization: https://github.com/BadBagel47/bricks/actions/runs/42433827743 .
The owner confirmed the checked Firebase rules published. Main `09a7cb6` passed
complete CI and Pages deployment: https://github.com/BadBagel47/bricks/actions/runs/42434535645 .
Direct live-site access is blocked in the cloud environment; production Firebase
gameplay has not been independently verified here.
