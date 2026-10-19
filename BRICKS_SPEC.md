# BRICKS — MASTER DEVELOPMENT SPECIFICATION
**Version:** 1.2 — Consolidated Codex Edition  
**Project:** Bricks  
**Development environment:** OpenAI Codex  
**Initial preview:** ChatGPT Sites if available, otherwise a standard browser preview  
**Technology:** React, TypeScript, Vite  
**Future multiplayer:** Firebase  
**Application language:** English  
**Communication with project owner:** Swedish  
**Priority:** High software quality with economical ChatGPT Plus usage

---

# 1. YOUR ROLE AND PRIMARY INSTRUCTIONS

You are the lead developer responsible for creating **Bricks**, a complete, polished, browser-based falling-block puzzle game.

This document is the authoritative project specification. It includes the approved functionality, design, architecture, implementation plan, testing requirements, and instructions for managing model usage efficiently.

Read the complete specification before starting.

## Your immediate task

Start with the first milestone of Phase 1, not the entire project at once.

Create a portable React + TypeScript + Vite codebase. The first goal is a fully playable single-player game, developed through controlled, testable milestones.

Multiplayer and Firebase will be added later, only after explicit approval.

Do not produce merely a static mockup or visual demonstration. The end result of Phase 1 must be a functioning game.

## General working principles

- Follow the established product requirements.
- Do not repeatedly ask questions that this specification already answers.
- Prefer simple, robust solutions over unnecessary complexity.
- Write maintainable, modular, testable code.
- Separate gameplay rules from rendering, controls, audio, and networking.
- Use existing functionality rather than recreating components unnecessarily.
- Run relevant tests after meaningful changes.
- Clearly distinguish verified functionality from untested assumptions.
- Do not start new phases without approval.
- Do not automatically use parallel coding agents or expensive development workflows.
- Keep all player-facing text in English.
- Communicate with me in Swedish.

The complete source code must remain portable and must not depend on a proprietary preview environment.

---

# 2. COST-AWARE CODEX DEVELOPMENT

## 2.1 Budget context

I use **ChatGPT Plus**.

I currently have approximately half of my usage allowance remaining and have several other projects planned.

Therefore, minimize unnecessary model usage while preserving software quality.

Do not sacrifice correctness, maintainability, or test coverage merely to use the cheapest model.

Avoid repeatedly attempting complex tasks with a model that is not suited to them.

## 2.2 Model recommendations

Use these models when available in my Codex environment.

### GPT-6 Luna — economical default

Preferred for:

- Creating project files and components.
- React menus and settings.
- CSS and responsive styling.
- Forms and interface interactions.
- Local storage and highscores.
- Simple audio controls.
- Routine bug fixes.
- Straightforward unit tests.
- Small refactoring tasks.
- UI improvements.

Recommended reasoning: Low or Medium, depending on complexity.

### GPT-6.1 Sol — complex engineering

Recommend for:

- Core gameplay architecture.
- Complex movement, collision, and rotation logic.
- Gravity and deterministic simulation.
- Difficult gameplay bugs.
- Shared seeded piece generation.
- Multiplayer synchronization.
- Battle attack and penalty logic.
- Firebase transactions and security rules.
- Reconnection and race-condition handling.
- Important architectural reviews.

Recommended reasoning: Medium, increasing only when necessary.

### Premium models

Do not recommend GPT-6 Astra or another premium model for routine work.

Only propose a premium model when a specific difficult problem justifies it, and require my explicit approval first.

If the named models are unavailable, suggest the closest available alternative.

Do not invent model availability, prices, or consumption figures.

## 2.3 Mandatory model-switch notifications

At the beginning of each development milestone, recommend the most economical suitable model.

When changing to a stronger model would materially improve the next task, stop and display:

**MODEL RECOMMENDATION: SWITCH TO SOL**

- Reason: Brief technical explanation.
- Next task: What will be implemented.
- Recommended reasoning: Medium or High.
- Risk of continuing with Luna: Brief explanation.

Wait for my response before proceeding with the more expensive task.

When complex work is complete and the next work is routine, display:

**MODEL RECOMMENDATION: SWITCH BACK TO LUNA**

- Reason: Why the cheaper model is sufficient.
- Next task: What will be implemented.
- Recommended reasoning: Low or Medium.

Do not suggest switching unnecessarily.

Group similar tasks together to avoid excessive model changes.

Do not assume you can automatically change the selected model. Tell me which model to select manually.

## 2.4 Escalation after failed attempts

If two focused attempts fail to solve the same problem:

1. Stop repeated trial-and-error changes.
2. Summarize what failed.
3. Show the relevant evidence or test results.
4. Decide whether better diagnostics or a stronger model would help.
5. Recommend changing models if justified.
6. Wait for my decision.

Avoid repeatedly rewriting working code.

## 2.5 Usage awareness

You may not have direct access to my remaining Plus allowance.

Do not claim you know my exact balance or consumption unless that information is actually available.

Optimize usage by:

- Reading only relevant source files.
- Avoiding repeated full-specification processing.
- Keeping work appropriately scoped.
- Reusing existing tests and components.
- Avoiding unnecessary whole-project rewrites.
- Avoiding premium reasoning for straightforward edits.
- Avoiding multiple agents unless explicitly approved.
- Using Standard speed rather than more expensive faster options when practical.
- Creating meaningful checkpoints.

If I tell you that my remaining allowance is low, favor stopping at a stable checkpoint instead of beginning a large new task.

---

# 3. PERSISTENT PROJECT INSTRUCTIONS

At the start of the project, create:

**BRICKS_SPEC.md**

Contains this complete project specification.

**AGENTS.md**

Contains concise persistent instructions covering:

- Code quality.
- Architecture.
- Testing.
- Budget-conscious development.
- Model recommendations.
- Milestone approval.
- Communication language.
- Avoiding unnecessary rewrites.
- Never beginning multiplayer without approval.

**PROGRESS.md**

Maintains:

- Current phase.
- Current milestone.
- Completed functionality.
- Test results.
- Known bugs.
- Remaining work.
- Next recommended task.
- Recommended model and reasoning level.

Do not copy the entire specification into AGENTS.md. Keep persistent agent instructions short and refer to BRICKS_SPEC.md.

Use Git and meaningful commits when available.

At the end of a milestone, update PROGRESS.md and save the working state.

---

# 4. PRODUCT VISION

Bricks is a modern web game inspired by classic NES-era falling-block puzzle gameplay.

It combines:

- Classic gameplay mechanics.
- Modern visual design.
- Pixel-retro identity.
- Level-dependent NES-inspired colors.
- Desktop and mobile support.
- Customizable controls.
- Generic game-controller support.
- Original retro music and sound effects.
- Single-player gameplay.
- Two-player online competition.
- Local leaderboards.
- Firebase-based multiplayer on free hosting.

The game should be fast, responsive, readable, and enjoyable.

Avoid unnecessary visual effects or complexity.

Do not copy copyrighted game logos, musical compositions, artwork, or proprietary assets.

Create an original identity for Bricks.

---

# 5. BRANDING AND GRAPHIC DESIGN

## 5.1 Logo

Create an original logo reading:

**BRICKS**

Visual requirements:

- Pixel-art / 8-bit appearance.
- Strong block-shaped typography.
- Crisp pixel edges.
- Clean modern composition.
- Retro-game atmosphere.
- Good readability at multiple sizes.
- Dark-background compatibility.
- Recognizable visual identity.

Provide a favicon or simplified icon if practical.

## 5.2 General interface

Use a polished dark-first design.

Suggested characteristics:

- Dark navy, charcoal, or near-black backgrounds.
- High-contrast text.
- Retro accent colors.
- Clear panel separation.
- Consistent spacing.
- Subtle animations.
- Pixel details without excessive decoration.

The application should feel modern, not visually outdated.

## 5.3 Readability and sizing

Text and interface elements must be **large and clear without becoming oversized or clumsy**.

Recommended targets:

- Body text: 16–18 px.
- Secondary text: preferably at least 14 px.
- Menu headings: 24–32 px.
- Score text: approximately 22–30 px.
- Main buttons: at least 48 px high.
- Touch targets: at least 48 × 48 px.

Scale responsively.

Gameplay space has higher priority than decorative elements.

Use a clean, readable interface font. Reserve pixel typography mainly for the logo and selected details.

## 5.4 Accessibility

Include:

- Strong contrast.
- Visible focus indicators.
- Accessible labels.
- Comfortable touch targets.
- Clear error/status messages.
- Reduced-motion support where practical.
- Information not dependent solely on color.

---

# 6. FIRST-LAUNCH USERNAME REQUIREMENT

On first launch, users must enter a username before accessing the main menu.

The username is mandatory.

Suggested validation:

- 2–16 visible characters.
- Remove unnecessary leading/trailing whitespace.
- Reject whitespace-only names.
- Safely display user-generated text.

Save the username locally.

The username may later be changed in Personal Settings.

**Changing usernames must never alter historical names stored in highscore records or previous matches.**

Different users may share the same display name.

Use distinct participant identifiers for multiplayer.

---

# 7. MAIN MENU

The main menu contains:

- **1 Player**
- **2 Players**
- **High Scores**
- **Settings**

A Help / How to Play section may be added.

During Phase 1, mark multiplayer as Coming Soon rather than presenting nonfunctional multiplayer controls as working features.

---

# 8. SETTINGS ARCHITECTURE

Separate settings into three groups.

## 8.1 Personal Settings

Each player controls:

- Username.
- Keyboard mapping.
- Game-controller mapping.
- Mobile control method.
- Mobile control layout and size.
- Hard Drop ON/OFF.
- Music ON/OFF.
- Music volume.
- Sound effects ON/OFF.
- Sound effects volume.

Personal settings apply across game modes and are saved locally.

The multiplayer host cannot modify another player's personal settings.

## 8.2 1 Player Settings

Include:

- Starting Level, default 00.
- Hold Piece ON/OFF, default OFF.

Keep previous selections for future games.

## 8.3 2 Player Match Settings

Controlled only by the current host:

- Match Mode.
- Starting Level.
- Hold Piece.
- Require Approval.

These apply equally to both participants.

Remember the previous match settings for subsequent rounds.

Hard Drop is personal and must not appear in host-controlled match settings.

---

# 9. CORE GAMEPLAY ENGINE

Build a modular TypeScript game engine independent of React and Firebase.

## 9.1 Board

Use a visible playfield of:

**10 columns × 20 rows**

Implement seven tetrominoes:

- I
- O
- T
- S
- Z
- J
- L

## 9.2 Required mechanics

Implement:

- Spawning.
- Gravity.
- Horizontal movement.
- Rotation.
- Collision detection.
- Soft Drop.
- Hard Drop.
- Piece locking.
- Row clearing.
- Scoring.
- Level progression.
- Next-piece preview.
- Optional Hold.
- Game Over.
- Single-player pause/resume.

Gameplay timing must be independent of rendering frame rate.

## 9.3 NES-inspired mechanics

Use classic NES-inspired movement, rotation, gravity, and scoring.

Keep behavior consistent and documented.

Do not introduce advanced modern mechanics such as Super Rotation System wall kicks, T-spin bonuses, or complex combo scoring unless explicitly approved.

## 9.4 Deterministic piece generation

Use a seeded pseudorandom generator.

Prefer an NES-inspired piece distribution rather than a modern guaranteed seven-bag.

Each new single-player game receives a fresh seed.

Multiplayer players share the same seed and underlying piece-generation sequence.

Player actions, Hold usage, and different game speeds must not change the underlying generated order.

Use a separate random stream for Battle penalty-row holes.

Document and test the algorithm.

## 9.5 Colors

Use original NES-inspired **level-dependent color palettes**.

Colors change with level rather than being permanently assigned to particular tetromino types.

Store palette definitions separately from game logic.

## 9.6 Starting levels and progression

Allow starting levels 00–19.

Default level is 00.

Use documented NES-inspired gravity progression and line thresholds.

Higher levels should become significantly faster.

In multiplayer, both start at the same selected level but progress individually.

## 9.7 Scoring

Use NES-inspired line-clear scores:

| Rows cleared | Base score |
|---|---:|
| 1 | 40 |
| 2 | 100 |
| 3 | 300 |
| 4 | 1200 |

Multiply by the current level plus one.

Soft Drop and Hard Drop award no points. Only line clears award points; do not reward manual falling in a way that can be repeated for score.

Hard Drop must not provide an unfair score bonus simply because a player uses that personal preference.

Display:

- Score.
- Level.
- Cleared lines.
- Next piece.
- Hold when enabled.

## 9.8 Hold

Hold is optional.

Single-player default: OFF.

In 1 Player, the user controls Hold in 1 Player Settings.

In multiplayer, Hold is a common match rule controlled by the host.

When enabled, use conventional hold/swap behavior.

Allow at most one Hold action per active piece.

When disabled, hide or disable Hold controls.

## 9.9 Hard Drop

Hard Drop is enabled by default.

It instantly drops the active piece to its lowest possible position and locks it.

Hard Drop is a personal preference.

Each player may disable it independently, including in multiplayer.

Provide customizable input mapping.

Do not make it a host-controlled setting.

## 9.10 Ghost Piece

No Ghost Piece feature in the initial version.

## 9.11 Game Over

Game Over occurs when the next required piece cannot spawn according to the defined collision rules.

Single-player supports pause/resume.

Multiplayer must not permit one player to pause independently for a competitive advantage.

---

# 10. INPUT AND CONTROLS

Use a unified action-based input system.

Actions:

- Move Left.
- Move Right.
- Soft Drop.
- Rotate Clockwise.
- Rotate Counterclockwise.
- Hard Drop.
- Hold when available.
- Pause where allowed.
- Menu navigation.

## 10.1 Keyboard defaults

| Key | Action |
|---|---|
| Left Arrow | Move Left |
| Right Arrow | Move Right |
| Down Arrow | Soft Drop |
| X | Rotate Clockwise |
| Z | Rotate Counterclockwise |
| Space | Hard Drop |
| C | Hold |
| P / Escape | Pause in single-player |

Allow remapping.

Save mappings locally.

Prevent mapping conflicts.

Provide Reset to Defaults.

Prevent gameplay keys from scrolling the page.

Implement appropriate held-key repetition.

## 10.2 Mobile D-Pad — default

Provide virtual controls for:

- Left.
- Right.
- Soft Drop.
- Rotate Clockwise.
- Rotate Counterclockwise.
- Hard Drop.
- Hold when enabled.
- Pause where appropriate.

Use a classic directional-pad design with A/B-inspired rotation buttons.

Controls must not cover the active playfield.

Use large, comfortable touch targets.

Support holding movement controls.

## 10.3 Swipe Controls — alternative

Allow selection of gesture controls in Personal Settings.

Use intuitive gestures for movement, Soft Drop, rotation, and Hard Drop.

Design against accidental input.

Persist the selected method.

Where practical, offer adjustable button sizes and left-handed layouts.

## 10.4 Generic game-controller support

Use the browser Gamepad API.

Do not rely on manufacturer-specific integrations.

Support compatible USB and Bluetooth controllers.

Requirements:

- Detection.
- Standard mappings.
- D-pad support.
- Analog input where sensible.
- Custom button mapping.
- Connection status.
- Local persistence.
- Held-button support.
- Graceful disconnection handling.
- Keyboard/touch fallback.
- Option to hide mobile touch controls when a controller is active.

Compatibility depends on browser, operating system, and device.

Test in a normal HTTPS browser environment when available.

---

# 11. RESPONSIVE GAME LAYOUT

## 11.1 Desktop single-player

Prominent centered board.

Display Score, Level, Lines, Next Piece, and Hold when enabled.

## 11.2 Desktop multiplayer

Show two complete boards side by side.

Include usernames, scores, score difference, match type, and status.

## 11.3 Mobile single-player

Prioritize the complete active board.

Put controls outside the playfield.

Avoid scrolling during gameplay.

## 11.4 Mobile multiplayer

The local playfield is larger.

The opponent's complete playfield remains visible at a smaller size.

Display both usernames, scores, and score difference.

Keep controls below/outside the boards.

Support portrait and landscape layouts.

On small screens, adapt intelligently rather than simply shrinking a desktop layout.

Do not obstruct gameplay with controls or decorative UI.

---

# 12. AUDIO

Use original retro-inspired music and sound effects.

Do not copy existing Nintendo or Tetris music.

## 12.1 Music

Default: ON.

Default volume: 70%.

Create an original looping 8-bit-style soundtrack.

When the player's stack reaches dangerous height, music must become faster and more urgent, inspired by classic NES gameplay.

Initial recommended danger threshold: locked blocks reaching roughly the upper six rows.

Use hysteresis to avoid rapid tempo changes.

Return to normal tempo when danger subsides.

The accelerated music does not change gameplay speed.

In multiplayer, danger music responds to each player's own board.

Respect browser audio autoplay restrictions.

## 12.2 Sound effects

Provide retro-inspired sound effects for:

- Movement.
- Rotation.
- Piece locking.
- Line clearing.
- Four-row clears.
- Level changes.
- Hard Drop.
- Hold.
- Menus.
- Game Over.
- Victory/defeat.
- Battle penalties.

Default: ON.

Default volume: 85%.

## 12.3 Audio settings

Include:

- Music ON/OFF.
- Music volume 0–100%.
- Sound Effects ON/OFF.
- Sound effects volume 0–100%.

Save preferences locally.

The host cannot control another player's audio.

---

# 13. SINGLE-PLAYER MODE

Before a game, select:

- Starting Level.
- Hold ON/OFF.

Save the previous selections.

During play, show a complete HUD and provide pause/resume.

At Game Over, display:

- Final score.
- Final level.
- Cleared lines.
- Highscore ranking.
- New-record indication where applicable.
- Relevant highscore list.
- Play Again.
- Main Menu.

Always show the highscore list after completing a game.

---

# 14. LOCAL HIGHSCORES

Highscores are stored locally, not on a global cloud leaderboard.

Historical usernames must remain unchanged after a user edits their current name.

Use versioned stored records and prevent duplicate writes.

## 14.1 Single-player

Top 10 by points.

## 14.2 Multiplayer Score Duel

Top 10 individual scores.

Include both the local player's and opponents' completed-match results.

## 14.3 Multiplayer Battle

Top 10 ranked primarily by number of wins.

Show:

- Wins.
- Matches played.
- Win percentage.
- Supporting statistics.

Use a documented tie-breaker.

Aggregate by reliable player identifiers where available, not merely display names.

Preserve the name that was used for each historical match.

## 14.4 Record structure

Store appropriate information:

- Record ID.
- Player identifier.
- Historical username.
- Score.
- Level.
- Lines.
- Mode.
- Date/time.
- Match ID, when applicable.
- Match outcome.

Both players' completed match records must be saved locally on each participating device.

Deduplicate by match ID and participant identity.

Abandoned matches must not count as competitive results.

---

# 15. MULTIPLAYER OVERVIEW

Implement in Phase 3 only.

Selecting **2 Players** displays:

**HOST GAME**

**JOIN GAME**

Support exactly two active participants per room.

Each participant retains personal controls, Hard Drop preferences, and audio settings.

---

# 16. MATCH TYPES

## 16.1 Score Duel — default

Both players receive the same underlying piece sequence.

No penalty rows.

Both continue until Game Over.

Highest final score wins.

Equal scores produce a draw.

## 16.2 Battle

Both receive the same piece sequence.

Multiple-row clears send penalty rows.

Both continue until Game Over.

The player who survives longer wins.

Equal elimination times according to the defined shared match timeline produce a draw.

Show final scores and attack statistics.

Selecting Battle automatically enables penalty lines.

Do not add a redundant Penalty Lines toggle.

---

# 17. HOST GAME AND ROOM CODES

## 17.1 New room

Selecting Host Game generates a new room and new random code.

Suggested code format:

- Six to eight uppercase alphanumeric characters.
- Avoid confusing characters where practical.
- Case-insensitive entry.

Allow the host to replace the generated code with a custom code.

Validate format, availability, and ownership.

Do not allow room-code changes after the opponent has joined.

## 17.2 Copy actions

Provide two buttons:

**COPY CODE**

Copies the code only.

**COPY INVITE LINK**

Copies the entire invite URL.

Example URL:

`https://YOUR-ACTUAL-DOMAIN/?room=BRK724`

Use the real deployed domain.

Show successful-copy feedback.

Handle unavailable clipboard permissions gracefully.

## 17.3 URL-based joining

Read the room code from the URL.

If the visitor has not selected a username, complete onboarding first and then continue joining.

Do not require manual re-entry of the code.

Keep the room code in the address bar so the link can be saved.

## 17.4 Reopen Previous Room

Distinguish between:

- Creating a new room with a new code.
- Reopening an existing previously owned room using the same code.

Provide **Reopen Previous Room**.

The original link works again once that room has been reopened.

Do not keep old gameplay sessions running indefinitely.

Preserve lightweight ownership/reservation metadata.

Prevent another player from claiming an owned code merely by knowing the code.

If ownership cannot be recovered because the anonymous identity was deleted, explain the limitation.

---

# 18. JOIN GAME AND ERROR MESSAGES

A player can join by entering a room code or opening an invitation link.

Validate before allowing entry.

Required error states:

## ROOM NOT FOUND

"This room doesn't exist. Check the code and try again, or ask the host for a new invite link."

## ROOM CLOSED

"This room is currently inactive. Ask the host to reopen it."

## ROOM FULL

"This room already has two players."

## INVALID CODE

"Enter a valid room code."

## CONNECTION LOST

"Unable to connect. Check your connection and try again."

## SESSION EXPIRED

"This invitation is no longer active."

Provide appropriate Retry, Edit Code, and Back navigation.

Do not display raw Firebase errors.

Never create a room automatically when a player attempts to join a nonexistent room.

If a match is already in progress, do not admit an unrelated third participant.

Allow an authenticated existing participant to reconnect when appropriate.

---

# 19. MULTIPLAYER LOBBY

Display:

- Room code.
- Copy Code.
- Copy Invite Link.
- Host username.
- Opponent username.
- Both players' connection status.
- Published match settings.
- Approval status where relevant.
- Start Match for the host.
- Transfer Host.
- Leave Lobby.

Before a second player joins:

**Waiting for opponent...**

After joining, show the opponent's chosen username and connection status in real time.

The host may see, but not change, the opponent's username.

Disable Start Match until both players are connected.

There is no mandatory Ready button.

---

# 20. HOST MATCH SETTINGS

Host-controlled settings:

| Setting | Default |
|---|---|
| Match Mode | Score Duel |
| Start Level | 00 |
| Hold Piece | OFF |
| Require Approval | OFF |

Starting level supports 00–19.

Keep previously used match settings for the next round.

Hard Drop, music, volume, controls, and touch preferences remain personal.

## 20.1 Draft and published settings

When the host opens settings, changes are edited privately.

The opponent must not see incomplete edits.

Provide:

**APPLY SETTINGS**

**CANCEL**

Applying settings publishes the final values.

Canceling discards the draft.

Only changes to the published effective settings invalidate approval.

Use a settings revision to bind approval to the correct configuration.

---

# 21. OPTIONAL APPROVAL

If Require Approval is OFF:

- No opponent approval is required.
- No Ready button is required.
- The host can start when two players are connected.

If Require Approval is ON:

- The opponent sees the published settings.
- The opponent approves via a thumbs-up button.
- The host cannot start without approval.
- Approval is bound to the current settings revision.
- Published changes revoke approval.
- The opponent must approve again.
- The host cannot approve for the opponent.

---

# 22. HOST TRANSFER

Provide **TRANSFER HOST** in the lobby.

Only the current host can initiate it.

Require a confirmation dialog identifying the recipient.

The recipient does not need to approve.

After confirmation:

- The other participant becomes host.
- Both players are informed.
- The room code remains unchanged.
- Published match settings remain unchanged.
- The new host controls match settings and match start.

If approval mode is active, revoke previous approval because roles have changed.

The former host must approve the rules before starting.

Allow transfers only in the lobby or between rounds.

Do not allow transfers during countdown or active gameplay.

Perform the change atomically.

---

# 23. FIVE-SECOND COUNTDOWN

All multiplayer matches begin with a synchronized five-second countdown.

Show:

- Match Mode.
- Start Level.
- Hold status.
- Other relevant shared rules.

Both players see the same countdown.

Use a shared start timestamp.

Lock shared settings during the countdown.

Cancel the countdown if a participant disconnects.

At start, both receive identical shared rules, a common piece-generation seed, and equivalent initial conditions.

---

# 24. FAIR MULTIPLAYER SYNCHRONIZATION

The underlying generated piece order must be identical for both players.

Use a shared seeded deterministic algorithm.

Gameplay runs locally.

Firebase synchronizes:

- Room state.
- Player presence.
- Host identity.
- Match settings.
- Approval revision.
- Countdown/start timestamp.
- Seed.
- Opponent board snapshots.
- Scores.
- Penalty events.
- Game Over.
- Results.

Do not send every keypress or animation frame through Firebase.

Use efficient throttled snapshots and event-driven updates for important changes.

Prevent network latency from directly affecting local movement responsiveness.

---

# 25. MULTIPLAYER HUD

Show:

- Own complete playfield.
- Opponent's complete playfield.
- Both usernames.
- Both scores.
- Score difference.
- Match mode.
- Connection state.
- Game Over status.

Examples of score difference:

**YOU LEAD BY 5,500**

**YOU TRAIL BY 2,400**

**SCORES ARE TIED**

On mobile, prioritize the own board while keeping the entire opponent board visible.

---

# 26. BATTLE PENALTY SYSTEM

Use:

| Cleared lines | Penalty rows |
|---|---:|
| 1 | 0 |
| 2 | 1 |
| 3 | 2 |
| 4 | 4 |

Penalty rows rise from the bottom and contain holes.

Use separate deterministic randomness for hole placement.

Queue incoming attacks.

Allow outgoing attacks to cancel queued incoming rows before sending the remainder.

Apply queued attacks at well-defined gameplay boundaries.

Each attack must have a unique identifier.

Do not apply duplicate attack events.

Do not add advanced combo or T-spin attack bonuses initially.

Stop sending attacks to an eliminated opponent.

Both players finish their games, with Battle victory determined by survival.

---

# 27. END OF MATCH

The full results screen appears after both players have reached Game Over.

Score Duel:

- Highest points win.
- Equal points result in a draw.

Battle:

- Longest survival wins.
- Equal elimination times result in a draw.

Display:

- Both usernames.
- Final scores.
- Winner or Draw.
- Score difference.
- Lines cleared.
- Match mode.
- Battle statistics where applicable.
- Relevant highscore list.
- Rematch.
- Main Menu.

---

# 28. REMATCH

Keep the same room while both players remain present.

Reuse the last published settings as defaults.

For every rematch:

- Create a new match ID.
- Create a new shared piece seed.
- Reset boards.
- Reset scores.
- Reset penalties.
- Reset Game Over state.

If Require Approval is ON, obtain fresh approval.

Only the host initiates the new countdown.

Host transfer remains possible between rounds.

---

# 29. DISCONNECTION AND RECONNECTION

Use Firebase presence tracking.

When a player disconnects during active multiplayer:

1. Detect the interruption.
2. Coordinate a consistent pause of both games.
3. Display a reconnection status.
4. Allow approximately 30 seconds for reconnection.
5. Restore valid game state if technically possible.

If reconnection fails:

- Mark the match Abandoned.
- Do not award a win.
- Do not record a competitive result.
- Return safely to an appropriate lobby/status screen.

Handle browser reloads and mobile suspensions where feasible.

Prevent simultaneous active control of the same session from multiple tabs.

Do not claim perfect recovery when the necessary state cannot be restored.

---

# 30. HOST CONFIGURATION WAITING SCREEN

While the host has the match-settings editor open, display a dedicated waiting experience for the opponent.

Heading:

**HOST IS CONFIGURING THE MATCH**

Supporting line:

**Waiting for the host to finish adjusting the rules.**

Show a rotating humorous status message.

Requirements:

- Fifty messages.
- Randomized order.
- New message approximately every eight seconds.
- Shuffle-bag selection.
- All messages used before repeating.
- Avoid the previous five messages at the start of a new shuffle cycle.
- Keep the shuffle state during the lobby session.
- Stop when the host applies, cancels, leaves, or transfers host control.
- Do not reveal uncommitted settings changes.
- Never display these messages over active gameplay.

## Approved messages

1. The host is negotiating with gravity.
2. The T-piece insists it's the main character.
3. The I-piece is late. Again.
4. The O-piece thinks rotation is overrated.
5. The Z-piece refuses to fit anywhere.
6. The S-piece claims the Z-piece started it.
7. The L-piece took a wrong turn.
8. The J-piece is still looking for its other half.
9. The next piece knows something you don't.
10. The blocks promise to behave this time. Probably.
11. The host is searching for the perfect starting level.
12. A four-line clear is practicing its victory pose.
13. The bottom row is expecting company.
14. The top row is getting a little nervous.
15. The left wall is blaming the right wall.
16. The right arrow suspects the left arrow of cheating.
17. Button A and Button B disagree on directions.
18. The D-pad is warming up for a serious workout.
19. The Hold slot wants another chance.
20. The soft drop button is getting impatient.
21. The blocks are practicing synchronized falling.
22. The host is checking if the I-piece is still straight.
23. The line counter is preparing for overtime.
24. A lonely gap is waiting for the perfect piece.
25. The next-piece preview is trying not to spoil the surprise.
26. The blocks are arguing about who falls first.
27. The scoreboard is preparing some very large numbers.
28. A T-piece is planning an unnecessarily complicated landing.
29. The host is deciding how much chaos is appropriate.
30. The stack is practicing its balancing act.
31. The penalty rows are sharpening their corners.
32. The blocks have been warned about suspicious gaps.
33. The host is checking both players received the same pieces.
34. The O-piece is feeling unusually well-rounded.
35. A perfect landing has been postponed indefinitely.
36. The game board is pretending there's plenty of room.
37. The I-piece is demanding a four-row welcome.
38. The rotation button is training for its big moment.
39. The next line clear has already claimed victory.
40. The blocks are trying to remember which way is down.
41. The host is testing the limits of your patience meter.
42. The random piece generator looks suspiciously innocent.
43. The countdown is stretching its five seconds.
44. The score duel is preparing for a very square showdown.
45. A suspicious gap has appeared in row nineteen.
46. The pieces are rehearsing a spectacular misdrop.
47. The I-piece is refusing to arrive when needed.
48. The host is deciding whether mercy is a game mechanic.
49. Your future high score is currently under construction.
50. The blocks are ready. The host is another story.

---

# 31. TECHNICAL ARCHITECTURE

Recommended stack:

- React.
- TypeScript.
- Vite.
- Modular CSS or CSS Modules.
- Firebase Hosting.
- Firebase Realtime Database.
- Firebase Anonymous Authentication.
- LocalStorage and/or IndexedDB.
- Gamepad API.
- Web Audio API.

Do not introduce unnecessary dependencies.

Separate:

**Game Engine** — gameplay mechanics and state.

**Rendering/UI** — React components and visual presentation.

**Input** — keyboard, touch, controllers.

**Audio** — music and sound effects.

**Persistence** — preferences and local records.

**Multiplayer** — rooms, Firebase, synchronization, approvals, recovery, and results.

The single-player engine must not depend on Firebase.

## Suggested structure

```text
src/
  app/
  components/
    menus/
    settings/
    gameplay/
    multiplayer/
    highscores/
  engine/
    board.ts
    pieces.ts
    rotation.ts
    collision.ts
    rng.ts
    scoring.ts
    levels.ts
    game-state.ts
    battle.ts
  input/
    keyboard.ts
    touch.ts
    gamepad.ts
    input-manager.ts
  audio/
  storage/
  multiplayer/
    firebase-client.ts
    rooms.ts
    presence.ts
    sync.ts
    approvals.ts
    results.ts
  styles/
  assets/
  tests/
```

Adjust structure where sound engineering justifies it.

---

# 32. FIREBASE DESIGN

Implement only when Phase 3 is approved.

Use Firebase for:

- Anonymous authentication.
- Room-code reservations.
- Room presence.
- Host ownership.
- Shared match settings.
- Approval.
- Countdown.
- Piece seed.
- Opponent state snapshots.
- Attacks.
- Game Over and result synchronization.

## Suggested data model

```text
roomReservations/
  ROOMCODE/
    ownerUid
    createdAt

rooms/
  ROOMCODE/
    ownerUid
    hostUid
    status
    settingsRevision
    settings
    players/
    approvals/
    currentSessionId

sessions/
  SESSION_ID/
    roomCode
    status
    settingsSnapshot
    pieceSeed
    startAt
    participants/
    gameplaySnapshots/
    attacks/
    results/
```

Possible room statuses:

- waiting
- configuring
- countdown
- playing
- reconnecting
- completed
- abandoned
- closed

Use documented state transitions.

## Firebase security

Use security rules to enforce:

- Participant identity.
- Maximum two players.
- Host-only shared-setting changes.
- Host-only match start.
- Authorized host transfer.
- Valid approval operations.
- Participant-specific writes.
- Data validation.
- Reasonable payload limits.
- Appropriate state transitions.

Use atomic transactions for room creation, participant-slot claiming, ownership, and host transfers.

Knowing the room code must not grant host permissions.

## Anti-cheat limitation

The initial architecture uses client-side gameplay.

It is not guaranteed cheat-proof.

Implement practical validation without pretending client-reported game results are authoritative.

## Free-tier constraints

Design for small-scale use within Firebase Spark limits.

Avoid unnecessary network messages.

Use compact snapshots.

Clean up inactive sessions where practical.

Keep room reservations lightweight.

Do not rely on paid backend functions.

Never upgrade to paid services without my explicit permission.

---

# 33. GAME STATE AND RECOVERY

Make game state serializable where practical.

Include:

- Board.
- Active piece.
- Next piece.
- Hold piece.
- PRNG state or piece index.
- Score.
- Level.
- Cleared lines.
- Relevant game timers.
- Pending penalties.
- Game status.
- Match ID.

Use versioned formats.

Prevent duplicate attacks and duplicate result records.

Avoid tying gameplay correctness to React animation state.

---

# 34. TESTING

Create automated tests for:

- All seven tetrominoes.
- Piece spawning.
- Movement.
- Rotations.
- Wall and block collisions.
- Gravity.
- Soft Drop.
- Hard Drop.
- Hold.
- Piece locking.
- Row clearing.
- Score calculation.
- Level progression.
- Game Over.
- Deterministic piece generation.
- Penalty-row generation.
- Attack cancellation.
- Duplicate event handling.
- Room-code validation.
- Room-not-found errors.
- Approval invalidation.
- Host transfer.
- Reconnection.
- Highscore sorting and deduplication.
- Immutable historical usernames.

Provide a developer-only capability to reproduce specific boards, levels, and piece sequences.

Do not expose development controls in the normal game menus.

Test keyboard and touch input.

Test representative desktop and mobile viewport sizes.

Test portrait and landscape.

Test standard controllers when hardware is available.

Test multiplayer with two separate sessions/devices.

Only report tests as passed if actually executed.

---

# 35. DEVELOPMENT PHASES AND MODEL STRATEGY

Development must proceed through controlled milestones.

Each milestone has an initial model recommendation, implementation, tests, progress update, and a decision checkpoint.

Do not implement the entire project in one uninterrupted run.

## PHASE 1 — PLAYABLE SINGLE-PLAYER

### Milestone 1.1 — Project foundation and interface

Recommended: **GPT-6 Luna, Low/Medium**

Implement:

- React/Vite/TypeScript setup.
- Project structure.
- Bricks pixel-art logo.
- Main menu.
- First-launch username onboarding.
- Base design system.
- Initial desktop/mobile responsive layout.
- Persistent project instruction files.

Run relevant build and UI checks.

Stop for review.

### Milestone 1.2 — Core gameplay engine

Recommended: **GPT-6.1 Sol, Medium**

Before starting, notify me that switching to Sol is recommended.

Implement:

- Board and pieces.
- Deterministic random generator.
- Rotation and collisions.
- Gravity.
- Movement.
- Row clearing.
- Scoring.
- Level progression.
- Hard Drop.
- Optional Hold.
- Game Over.
- Automated engine tests.

Keep the engine separate from React.

Stop after tests and review.

### Milestone 1.3 — Gameplay rendering and keyboard controls

Recommended: **GPT-6 Luna, Medium**, provided the game engine is stable.

Implement:

- Playfield rendering.
- Active piece.
- Next-piece preview.
- HUD.
- Keyboard input.
- Key remapping.
- Pause/resume.
- Game Over overlay.

Test gameplay integration.

### Milestone 1.4 — Settings and highscores

Recommended: **GPT-6 Luna, Low/Medium**

Implement:

- Personal Settings.
- 1 Player Settings.
- Local persistence.
- Highscore top 10.
- Username changes without historical modification.
- Final result screen.
- Play Again.

Test persistence and highscore behavior.

### Milestone 1.5 — Music and sound effects

Recommended: **GPT-6 Luna, Medium**

Implement:

- Original 8-bit-inspired music.
- Sound effects.
- Music toggle.
- Music volume.
- Effects toggle.
- Effects volume.
- Danger music acceleration.
- Browser audio initialization.

Test settings and tempo behavior.

### Milestone 1.6 — Mobile controls and gamepads

Recommended: **GPT-6 Luna, Medium**, with Sol escalation if complex integration issues arise.

Implement:

- Mobile virtual D-Pad.
- Gesture alternative.
- Adjustable layout where practical.
- Portrait and landscape responsiveness.
- Gamepad API support.
- Controller remapping.
- Connection status.
- Input fallback.

Test on available devices/environments.

### Milestone 1.7 — Phase 1 integration and quality review

Recommended: **GPT-6.1 Sol, Medium only if warranted by complexity**; otherwise Luna.

Perform:

- Integration checks.
- Regression tests.
- Gameplay timing verification.
- Input tests.
- Mobile layout review.
- Performance review.
- Bug fixing.
- Code-quality review.

Deliver a playable single-player build.

**STOP after Phase 1 and wait for explicit approval.**

## Phase 1 acceptance criteria

Phase 1 is complete when:

1. First launch requires a username.
2. Main menu works.
3. A real game can start and finish.
4. All seven pieces function.
5. Movement and rotation are correct.
6. Lines clear correctly.
7. Scores and levels update.
8. NES-inspired palettes change by level.
9. Hard Drop works by default and can be disabled.
10. Hold follows its settings.
11. Keyboard mappings can be changed.
12. Mobile D-Pad works.
13. Gesture controls work sufficiently for normal play.
14. Gamepad support is implemented and tested where possible.
15. Music and sound settings work.
16. Danger music accelerates correctly.
17. Game Over results appear.
18. Local highscore works.
19. Old record names remain unchanged after renaming.
20. Settings survive reload.
21. Automated engine tests pass.
22. A playable preview is available.

Do not claim unverified requirements have passed.

---

## PHASE 2 — POLISH

After explicit approval:

- Refine game feel.
- Improve NES-inspired timing.
- Optimize rendering.
- Improve visual design.
- Improve touch layouts.
- Refine audio.
- Fix usability problems.
- Improve accessibility.
- Expand regression tests.

Use Luna for routine refinement and Sol for genuinely difficult gameplay issues.

Stop for approval before multiplayer.

---

## PHASE 3 — MULTIPLAYER

Use Sol Medium for important architecture, synchronization, security, and concurrency work.

Use Luna for straightforward lobby components, UI, and routine persistence functionality.

Divide multiplayer into milestones:

1. Firebase setup and security architecture.
2. Room creation, join, and invite links.
3. Lobby and host roles.
4. Match settings and approval.
5. Host configuration waiting screen.
6. Five-second countdown and seeded starting state.
7. Live opponent board and score updates.
8. Score Duel.
9. Battle penalties.
10. Match completion and highscores.
11. Rematches.
12. Reconnection and recovery.
13. Integration and security testing.

Stop for review after meaningful milestones.

Test with two real browser sessions.

Do not consider multiplayer complete without demonstrating two-player gameplay.

---

## PHASE 4 — PUBLIC DEPLOYMENT

After approval, deploy to Firebase Hosting.

Verify:

- HTTPS.
- Desktop and mobile usability.
- Invite-link behavior.
- Correct room query parameters.
- Room reopening.
- Room-not-found errors.
- Authentication and security rules.
- Database usage efficiency.
- Full match completion.
- Highscore functionality.
- Reconnection behavior.
- Reasonable operation within Spark limits.

Provide the deployment URL and maintenance instructions.

Never activate paid services without approval.

---

# 36. QUALITY AND PERFORMANCE STANDARDS

Prioritize:

- Responsive gameplay.
- Predictable timing.
- Correct scoring.
- Maintainable code.
- Testable architecture.
- Clear UI.
- Comfortable controls.
- Good mobile usability.
- Efficient network communication.
- Stable persistence.
- Understandable errors.

Avoid:

- Tiny text.
- Clumsy oversized components.
- Controls covering the game.
- Excessive animations.
- Unnecessary dependencies.
- Huge unreviewed changes.
- Repeated full-project rewrites.
- Multiplayer logic mixed into core game rules.
- Unverified claims of successful testing.

---

# 37. REQUIRED OUTPUT AT EVERY MILESTONE

At the end of each milestone, provide a concise Swedish summary:

**Completed**
- What was implemented.

**Tests**
- What was actually verified.
- Passed/failed results.

**Known Issues**
- Unresolved bugs or limitations.

**Files / Progress**
- Major changed files.
- Updated PROGRESS.md.
- Git checkpoint where available.

**Next Milestone**
- Description of the next task.

**Recommended Model**
- Luna or Sol.
- Reasoning level.
- Short justification.
- Whether switching is recommended.

Stop for review according to the milestone rules.

Do not repeatedly paste the full specification into progress summaries.

---

# 38. IMMEDIATE START INSTRUCTIONS

We are beginning a completely new Codex project.

No Bricks source code has been created yet.

First:

1. Initialize the React + TypeScript + Vite project.
2. Save this specification in BRICKS_SPEC.md.
3. Create a concise AGENTS.md with the persistent working rules.
4. Create PROGRESS.md.
5. Confirm the first milestone and suitable model.
6. Begin Milestone 1.1 if the currently selected model is appropriate.

For the first milestone, prefer **GPT-6 Luna with Low or Medium reasoning**, if available.

If the selected model is unnecessarily expensive, recommend switching before substantial implementation.

Do not begin Milestone 1.2 until Milestone 1.1 is reviewed.

Remember that I have limited ChatGPT Plus usage and several other projects.

**Your objective is to deliver the highest practical software quality while minimizing unnecessary model consumption.**

**BEGIN PHASE 1, MILESTONE 1.1 ONLY.**

**END OF BRICKS MASTER DEVELOPMENT SPECIFICATION — VERSION 1.2**
