# Bricks development instructions

- Treat [BRICKS_SPEC.md](BRICKS_SPEC.md) as the product source of truth. Keep player-facing text in English and communicate with the owner in Swedish.
- At a new work session or milestone, read [HANDOVER.md](HANDOVER.md) first, then verify current facts in `PROGRESS.md` and follow its links to the relevant phase docs. Update the handover at each milestone checkpoint; keep durable requirements in the spec/AGENTS, not only in the handover.
- Keep gameplay rules independent from React, rendering, input, audio, persistence, and multiplayer. Prefer small, testable modules and avoid unnecessary dependencies or rewrites.
- Run relevant existing checks after meaningful changes and report only results actually observed. Keep `PROGRESS.md` current at milestone boundaries.
- Work in the existing checkout; do not create a worktree. Preserve user changes and make only changes required by the approved milestone.
- Recommend the economical suitable model at each milestone. Escalate difficult gameplay engineering only when justified; wait for approval before starting a stronger-model task if the specification requires a model switch.
- Stop at milestone review checkpoints. Do not begin multiplayer/Firebase or a later phase without explicit approval.
- Keep interface copy direct and functional. Retain the approved “Make room for one more.” headline; avoid decorative subheadings, slogans, menu descriptions, and footers. Keep necessary instructions, validation, and availability status.
