# 2. Firebase Realtime Database on the free Spark plan for multiplayer

Date: 2026-11-10 (records a decision made during Phase 3)

## Status
Accepted

## Context
Bricks needs two-player matches for friends without running a server or paying
for hosting. Each player plays their own board, so only compact state needs to
be shared.

## Decision
Use Firebase Anonymous Auth and Realtime Database (`europe-west1`) on the Spark
plan. Share changed-only board snapshots at most five times per second per player
(200 ms; raised from twice per second on 2026-11-11, B-003, for a smoother opponent view),
with no heartbeats. Security rules enforce membership, schema and rates.

## Consequences
Free and serverless for the owner; quota is the main limit
(`docs/FIREBASE_QUOTA.md`). Not suited to real-time shared-world games; those
should use WebRTC for gameplay (see backlog F-008). No paid plan without owner
approval.
