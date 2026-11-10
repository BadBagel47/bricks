# 6. Documentation and backlog conventions

Date: 2026-11-10

## Status
Accepted

## Context
The owner wants documentation any AI agent can pick up, using established
standards, with planned features and fixes kept current.

## Decision
- `AGENTS.md` (cross-tool agent instructions) is the entry point; `CLAUDE.md`
  only imports it. `HANDOVER.md` holds the current checkpoint.
- `docs/BACKLOG.md` lists open work with `F-`/`B-`/`T-` IDs.
- `CHANGELOG.md` follows Keep a Changelog.
- Decisions go into `docs/adr/` as ADRs.
- External documentation is in English; owner communication is in Swedish.

## Consequences
One place per kind of information. Agents update the backlog, changelog and
handover at the end of each run.
