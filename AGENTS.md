# Bricks development instructions

- Treat [BRICKS_SPEC.md](BRICKS_SPEC.md) as the product source of truth. Keep player-facing text in English and communicate with the owner in Swedish.
- At a new work session or milestone, read [HANDOVER.md](HANDOVER.md) first, then verify current facts in `PROGRESS.md` and follow its links to the relevant phase docs. Update the handover at each milestone checkpoint; keep durable requirements in the spec/AGENTS, not only in the handover.
- Keep gameplay rules independent from React, rendering, input, audio, persistence, and multiplayer. Prefer small, testable modules and avoid unnecessary dependencies or rewrites.
- Run relevant existing checks after meaningful changes and report only results actually observed. Keep `PROGRESS.md` current at milestone boundaries.
- Work in the existing checkout; do not create a worktree. Preserve user changes and make only changes required by the approved milestone.
- Recommend the economical suitable model at each milestone. Escalate difficult gameplay engineering only when justified; wait for approval before starting a stronger-model task if the specification requires a model switch.
- Owner update 2026-11-06: proceed with 3.7 without requiring manual review of 3.6; consolidate owner playtesting into larger playable checkpoints and use automated two-session checks between steps. This authorizes 3.7, not all later milestones.
- Owner subsequently authorized 3.8 Score Duel. Continue consolidating manual playtesting; no manual review is required before its checked deployment. Later milestones still require authorization.
- Owner authorized 3.9 Battle penalties. Consolidate manual playtesting; stage rule changes and complete automated two-session/security validation before requesting owner publication of the checked rules. No later milestone is authorized by this step.
- Owner authorized 3.10 match results and local highscores. Continue automated checks and checked publication without requiring a manual game review. Dedicated rematch coordination remains 3.11.
- Owner authorized 3.11 rematches. Keep manual testing consolidated; stage and verify new readiness/approval rules before requesting owner rule publication. Later recovery work still requires authorization.
- Stop at milestone review checkpoints unless the owner has waived the relevant review. Do not begin multiplayer/Firebase or a later phase without explicit approval.
- Keep interface copy direct and functional. Retain the approved “Make room for one more.” headline; avoid decorative subheadings, slogans, menu descriptions, and footers. Keep necessary instructions, validation, and availability status.

- Owner preference: include GPT-6.1 Terra alongside Sol and Luna when recommending a model and reasoning level at each checkpoint.
- Owner direction 2026-11-08: Bricks is a hobby game for casual play with friends. Prioritize Firebase Spark quota efficiency and simple operation; advanced anti-cheat/server-authoritative competition is not a project priority. Keep normal identity and database authorization protections.
