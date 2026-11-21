# 9. Own touch layout as screen shares, upright 1 Player only

- Status: Accepted (2026-11-21, owner: "Kör A och B rek"; F-059, F-061)

## Context

The owner wanted players to place the touch controls themselves and set the board's height
(F-061), with a way back to the standard layout, and removed the Row layout (F-059). Bricks runs on
phones of many sizes, tablets in both orientations and matches with a different screen layout.

## Decision

- Only Split remains for buttons. The standard layout keeps adapting to the screen.
- An own layout is stored in the personal settings as `customLayout`: for each button group (the
  pad, the rotate buttons) its centre as a share of the screen's width and height and a size
  factor (0.7–1.4) of a width-based standard button size; plus the board's height as a share of its
  standard size (60–100 %). `null` means the standard layout; Reset in the editor saves `null`.
- It is used in 1 Player when the device is upright; in landscape and in matches the standard
  layout applies. The board height applies to phones upright (up to 760 px wide).
- The editor (Settings → Edit layout) shows a copy of the 1 Player screen with sample pieces, dashed
  frames to drag the groups and a corner handle to resize them (arrow keys and + / − for keyboard
  users), a board-height slider, Reset and Done.

## Consequences

- Positions scale with the screen, so a layout made on one phone stays usable on another, but
  groups may sit differently on screens of another shape.
- Matches and landscape keep the standard layout; extending the own layout there is a later choice.
- The Settings preview always shows the standard arrangement.
