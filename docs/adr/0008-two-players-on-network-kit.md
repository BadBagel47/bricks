# ADR 0008: 2 Players on network-kit, side by side with Firebase

- Status: accepted (owner, 2026-11-19, F-028/F-036)
- Context: Bricks 2 Players ran on Firebase Realtime Database with server rules that checked every write. The shared room server `BadBagel47/network-kit` (Cloudflare Durable Objects, EU rooms) now has everything Bricks needs (modes per game, game links, admin lobbies, server arrival time on messages).

## Decision

- A second 2 Players implementation on network-kit (`src/net/`), chosen with a *Server* switch on the 2 Players screen (Firebase first). Firebase stays until the owner retires it (T-009).
- Room server: the `bricks` Worker (`server/rooms/`, `wrangler.rooms.jsonc`, vendored network-kit in `vendor/network-kit/`, 0.13.4 at the start, 0.15.1 since B-025, 0.17.0 since T-012), deployed from `main` by `.github/workflows/rooms.yml`, connected to network-kit's admin page as game `bricks`, mode `duo`.
- Host-run room used as a relay: each browser runs its own game from the room's seed; boards (newest only, at most every 100 ms), Battle rows and finishes (reliable) go to the other player; the receiving browser checks every message (`src/net/protocol.ts`) instead of server rules.
- Identity per device (`identity: 'device'`), as with the Firebase sign-in; a local player id (`bricks.player-id.v1`) links results across rooms.
- F-036: both versions measure the same things on the receiving device (server-to-device delay, update gaps, reconnects) and show them on the result screen and in Settings → Connection.

## Consequences

- No server-side validation of game data on Cloudflare (accepted for a hobby game; anti-cheat ideas are network-kit D-062, F-063, F-064).
- A page reload during a Cloudflare match continues it (F-038): the player's game is kept in the tab (`src/net/checkpoint.ts`), the address keeps `#room=CODE` while in a room, and both players send their current state again when the other comes back.
- Two places control 2 Players while both exist: Bricks' admin page (Firebase) and network-kit's admin page (Cloudflare).
