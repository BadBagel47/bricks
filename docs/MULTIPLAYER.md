# Multiplayer foundation — milestone 3.1

The owner approved Phase 3 after the single-player polish review. This milestone
provides the Firebase boundary, anonymous identity, immutable code reservations,
emulator tooling and security tests. Room creation/joining is milestone 3.2.
There is no playable multiplayer UI yet. The single-player engine and app neither
import nor initialize Firebase.

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

For later multiplayer UI work, copy `.env.emulators.example` to `.env.local` and
run `npm run dev` separately. The current single-player UI does not consume
Firebase configuration. Emulator and real project settings cannot be combined.

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
deployment and no automatic rules deployment. Firebase Hosting is Phase 4. Future
GitHub Pages multiplayer builds will need the public Web App fields supplied as
build variables; that wiring belongs with the first working room flow.

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

`firebase-client.ts` is initialized only when a future multiplayer flow asks for
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

Codes use 6–8 characters from `A–H`, `J–N`, `P–Z`, `2–9`. A future UI will
normalize case before access. An authenticated player may inspect one known code,
including its owner's UID, but cannot list reservations. There is no secret in
reservation metadata. Use a transaction for allocation; knowing a code never
permits claiming an existing reservation. All fields are immutable and no client,
including the owner, may delete it. Unknown fields, wrong types, timestamps not
equal to server time and attempts to reserve for another UID are rejected.

`rooms`, `sessions`, presence and all other paths are denied in this milestone.
Their rules must be implemented and tested together with their features. Existing
reservations are retained if creating a room fails, allowing only the original
owner to retry. Closing a room will not free its reservation.

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
five per second), plus important events; it must never send every frame or
keypress. Server rules will bound payload shape, board size, counters and identity.
A timestamp is not proof of fair play. Client-reported scores and elimination
times remain untrusted; this architecture cannot guarantee cheat-proof matches.

Presence will use `.info/connected` and `onDisconnect`, with separate connection
IDs and a transactional active-control lease to prevent two tabs from controlling
one participant. Reconnection gets approximately 30 seconds. Recovery must check
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
