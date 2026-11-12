# 7. Adopt the shared agent rules

Date: 2026-11-11

## Status
Accepted (owner approved run C, T-004)

## Context
The owner keeps one set of agent rules for all repositories
(`BadBagel47/agent-rules`, v1.0). Bricks had its own long `AGENTS.md`.

## Decision
- `AGENTS.md` only references the shared rules; Bricks-specific rules live in
  `HANDOFF.md` (renamed from `HANDOVER.md`).
- Priorities use High / Medium / Low; completed items are in a Done table.
- Bricks keeps `F-`/`B-`/`T-` IDs and the `feature/operating-controls` Worker
  deploy trigger as documented exceptions; `CLAUDE.md` stays a one-line import.

## Consequences
Rules are maintained in one place. Bricks differences are listed in
`HANDOFF.md` under *Differences from the shared rules*. Supersedes the entry
points named in ADR 0006.
