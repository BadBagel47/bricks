# Firebase Spark budget

## Limits and verification

The reference Spark Realtime Database limits are **100 simultaneous connections**,
**1 GB stored**, and **10 GB downloaded per month**. These are planning baselines,
not a claim of a fresh pricing lookup: access to firebase.google.com was blocked
by this cloud environment on 2026-11-05. Confirm the current project allowances
in the Firebase console before a public launch. Authentication has separate limits.
Static JS/CSS files are served by GitHub Pages and do not use RTDB download
allowance. Authentication requests have their own allowances.
Database downloads include protocol/encryption overhead, reconnects and console
usage, not just JSON payloads. Spark is not unlimited; exhausting an allowance can
interrupt the service. No billing or paid backend is enabled by this implementation.

Official sources:
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/database/usage/limits
- https://firebase.google.com/docs/database/usage/billing
- https://firebase.google.com/docs/database/web/offline-capabilities

## Implemented in milestone 3.3

- One Firebase app/database instance per tab. Anonymous identity persists; no
  repeated signups on navigation or forced logouts.
- No root database listeners, room-list queries, polling or application heartbeat
  writes. Room metadata and presence are separate, narrowly scoped listeners.
- Presence writes one boolean under a random per-tab connection ID on connection;
  `onDisconnect` deletes it server-side. Multiple tabs do not mark each other
  offline. Each record has a fixed-length ID and a boolean payload. RTDB rules cannot
  enforce a per-identity child-count limit; active-tab control is deferred to 3.12. SDK transport keepalives still exist; this is not zero idle bandwidth.
- Reconnects register cleanup before publishing presence again. Leaving removes
  listeners and takes the database offline. Failed joins/creation also take it
  offline; Retry reconnects explicitly. Menu and single-player need no DB socket.
- Host-role changes use a bounded room transaction, without copying presence or
  unrelated data. Only two participants and bounded name/UID/room-code sizes are
  permitted. Reservation collision retries stop after eight attempts.
- Presence has no historical timestamps/logs. Empty branches disappear as their
  connection records are removed. Old-epoch presence cannot be read by a new room
  epoch. Each identity can remove its own obsolete connection records.

## Retention

Code ownership is intentionally permanent under the approved specification.
Reservations cannot be deleted/reassigned by the browser, and a closed room retains
only small lobby metadata needed for reopening the original link. There are no
stored gameplay snapshots or match logs yet. Automatic deletion of reservations
would change the promised reuse of saved room links, so it is not implemented.
Later session payloads must be bounded and pruned by authorized participants,
while keeping the small code reservation. Spark has no paid scheduled cleanup.
Clients alone cannot guarantee cleanup when all players disappear permanently.

No strong per-person rate limit exists: someone can create many anonymous accounts
and rooms. UI restrictions cannot enforce a service-wide quota. Monitor abuse;
consider App Check separately after compatibility and deployment review.

## Gameplay budget for milestone 3.7

Use an initial cap of **two compact snapshots per second per player**, send only
when state changes, and handle essential events separately. Keep game simulation
and input local at their normal frame rate. This lowers scheduled snapshot traffic
by 60% compared with the earlier five-per-second target. It is a design budget;
multiplayer snapshot transmission is not implemented in 3.3.

For a conservative model with 700-byte snapshots, two producers, two recipients
per update, two updates/second and a ten-minute match:

`700 × 2 × 2 × 2 × 600 = 3,360,000 bytes` of JSON deliveries.

This excludes transport overhead, extra events, retries and initial synchronization;
it is not a measured match cost or a promise of matches per month. Recalculate with
real payloads and actual RTDB usage before enabling live opponent boards. Never
send an entire board at every render frame or publish every keypress.

## Operations

The owner can inspect the Database Usage panel at:
https://console.firebase.google.com/project/bricks-8f56b/database

Record a quiet baseline, then a two-browser lobby session and (once implemented)
a ten-minute match: connection peak, downloaded bytes and stored bytes before/after.
Use isolated time windows because aggregate usage includes other visitors. Compare
many sessions rather than treating one delayed dashboard sample as exact.

Check usage daily during initial public testing and weekly once stable. Review at
50%, 75% and 90% of monthly download/storage budgets. These are operating thresholds,
not automated alerts in this app. Plan headroom below 100 connections: 40 normal
two-player rooms already use about 80 browser connections, and additional tabs,
admin consoles and reconnects need room. This is capacity planning, not an enforced
40-room limit. If use approaches limits, reduce updates, pause new-room onboarding
or review a hosting/backend change with the owner; never upgrade billing silently.

### 3.7 implementation budget

The visible board is 200 characters; the complete 11-field payload is under
600 UTF-8 bytes in automated tests. Each player writes changed snapshots only,
with one request in flight and at least 500 ms after acknowledgement. Rules also
enforce the minimum interval. Unchanged gravity counters and stable final states
produce no writes. Each client subscribes only to the opponent's current record.
At the 2 Hz ceiling, two active players produce at most 2.4 KB/s of JSON snapshot
payload (about 1.44 MB per ten-minute match); TLS/WebSocket/Firebase overhead and
other lobby traffic are additional and have not been measured in production.
Actual download quota usage must be checked in the Firebase console; this is a
protocol budget, not a verified billed-traffic estimate. Retention remains two
latest records per room epoch, not a per-frame or per-match history. Old room
epochs are not automatically pruned yet.

### 3.9 Battle traffic

Boards retain the existing <=2 changed snapshots/second/player and compact 200-cell
encoding. Battle adds one <=250-byte cumulative attack record/player, written only
when net outgoing rows exist and at most once per >=500 ms publisher cycle. It
also adds one small finish record/player/match. There are no per-row events,
heartbeat writes or growing attack histories. Receivers add two participant-scoped
listeners (opponent attack prefix and finish); Score Duel adds none.

During sustained attacking, the maximum is two board plus two attack writes per
second/player, with event-driven preflight reads for the attack transaction. Thus
Battle has more traffic than the earlier board-only budget. Actual read/transaction
retry/transport overhead and billed downloads have not been measured in production;
monitor Firebase usage before expanding public access. Latest records overwrite
per room epoch; old epochs are still not automatically pruned. No paid service,
Functions or billing change was introduced.

### 3.10 results

Completed match archives and rankings are local-only. Both participant records
are derived from existing confirmed snapshots/Battle finishes. No result-history
Firebase writes, extra listeners, heartbeats, backend functions or billing changes
were added. Result navigation uses the existing lobby cancel/leave operations.

### 3.11 rematch readiness

Readiness is two bounded role slots per room epoch, not a growing match history.
Each lobby/round/connection/generation change can write one small intent per
participant; identical intents skip writes. Results withdraw that connection's
intent. Approval writes occur only on explicit guest approval and no longer need
a settings revision bump per round. There are event-driven preflight reads and
one participant-scoped readiness listener, with no polling/heartbeats. Existing
start/approval path listeners are shared by the Firebase client. Gameplay snapshot
and Battle update budgets are unchanged. Old room epochs still need future
retention/cleanup policy.

### 3.12 checkpoint candidate (not deployed)

The experimental client writes the latest checkpoint and visible snapshot in
one atomic update, at the existing changed-snapshot rate. The checkpoint uses a
200-character board and does not duplicate it for Battle. Initial examples are
556 bytes for Score Duel and 801 bytes for Battle before record and transport
overhead. At a sustained two updates per second for both players, that is roughly
8 MB/hour and 11.5 MB/hour respectively of additional checkpoint payload sent;
actual states and UID lengths vary. This is not a billed-download estimate.
There are at most two checkpoint records per room epoch, with no heartbeat or
per-match history. Recovery reads, retries, transport overhead and the eventual
production quota effect remain unmeasured. Old epochs still need a retention
policy. Resumption adds bounded, event-driven session, lease and readiness
records and reads; actual production quota impact remains unmeasured.


## Future option: WebRTC/P2P hybrid

Owner requested a future evaluation only if measured Firebase quota consumption justifies it. Keep Firebase for rooms/signaling and consider WebRTC for live game data, accounting for TURN relay costs, fallback and recovery complexity. No P2P implementation or migration is currently authorized by this backlog item.

Operating controls add small admission/policy reads, not per-frame server traffic. Public solo makes one check per new round and opens no Firebase socket or anonymous-auth session. Multiplayer uses its existing socket for policy updates. New private/operator metadata is described in `OPERATING_CONTROLS.md`; measure its retained storage and actual downloads rather than promising a specific free-player capacity.
