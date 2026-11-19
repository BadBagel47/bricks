// Bricks 2 Players on network-kit (F-028). Plain data, also used by the kit's smoke test.
// Each browser runs its own game from the room's seed; the room only relays (host-run).
export default {
  mode: 'host',
  takeover: false,          // nobody runs the other player's game; a lost host is waited for
  roles: { player: { seats: 2 } },
  lateJoin: 'never',        // a third player can never join a running match
  ownerLeave: 'pass',       // the room stays with the other player, as in the Firebase version
  countdownMs: 5000,        // the same five-second countdown as before
  autoPauseMs: 2000,        // pause both games when a player has been away for two seconds
  heartbeatMs: 2000,        // notice a phone that lost its network within seconds
  lobbyRole: 'player',      // guests of an admin lobby play
};
