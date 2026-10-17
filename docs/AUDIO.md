# Audio

Bricks generates its own retro-style sound using the Web Audio API. It does not download music or effects. The first Start or Resume button click initializes or resumes the browser audio context, as required by browser autoplay policies.

The looping square-wave melody is a sixteen-note sequence written for this game. Normal tempo is 390 ms per note. When locked blocks reach any of the top five rows, the same motif speeds up to 230 ms per note and rises one octave. Music and sound effects have separate local on/off and 0–100% volume settings; both default to on at 70%.

Short synthesized effects respond to rotations, Hold, piece locking, Hard Drop, line clears and Game Over. Pause and returning to the menu stop the music; resuming play starts it again.

Automated coverage checks the audio defaults and volume validation, original melody shape, danger threshold, tempo change and octave shift. Browser output still needs a listening check on the published site.
