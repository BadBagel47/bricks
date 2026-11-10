# 5. Visual refresh from the approved design sketch

Date: 2026-11-10

## Status
Accepted

## Context
The owner preferred the Claude design sketch over the original lime-and-black
look, and later asked for the sketch's structure and behavior as well (backlog
F-001 to F-005).

## Decision
Adopt spec section 5.0: navy theme, tile logo, five-button touch row with a
tappable Hold box, NES-style two-color level palettes with an optional Classic
mode, and an optional ghost piece (off by default). System fonts only, because
the admin CSP blocks external font services.

## Consequences
UI changes must keep the accessible names and fit guarantees covered by the
browser and Firebase tests, or update those tests in the same change.
