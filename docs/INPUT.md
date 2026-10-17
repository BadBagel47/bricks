# Input

The engine receives the same action names from every input method: movement, soft drop, both rotations, Hard Drop, Hold and Pause. Inputs remain outside the gameplay engine.

## Keyboard

Arrow keys move and soft-drop; Z/X rotate; Space Hard Drops; C Holds; P or Escape pauses. Movement and soft drop repeat while held. Personal Settings allows conflict-checked remapping and Reset to Defaults.

## Touch

The default mobile layout puts a directional pad and A/B-style rotation buttons below the playfield, with Hard Drop, optional Hold and Pause nearby. Holding movement or soft-drop buttons repeats the action. Touch controls can be resized, moved to a left-handed layout, or hidden while a gamepad is connected.

The optional Swipe layout uses a tap for clockwise rotation, horizontal swipes for movement, downward swipes for Soft Drop, and an upward swipe for Hard Drop. Swipe thresholds reduce accidental input.

## Gamepads

The app polls the browser Gamepad API. Standard mappings use D-pad left/right/down, A/B for rotation, X for Hard Drop, Y for Hold and Start for Pause. The left analog stick also moves and soft-drops. Button assignments can be remapped and reset in Personal Settings. A connection status is shown during play; disconnecting returns control to keyboard or touch without interrupting the game.

Browser, operating-system and device support varies. Gamepad polling and touch behavior need verification on physical hardware in addition to the automated mapping and gesture tests.
