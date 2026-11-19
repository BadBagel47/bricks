// Bricks room server (F-028): network-kit's room server with Bricks' options,
// connected to network-kit's admin page as game "bricks", mode "duo" (2 Players).
import { createRoomServer } from '../../vendor/network-kit/server/index.js';
import options from './rooms-options.js';

const rooms = createRoomServer({
  ...options,
  allowedOrigins: [
    'https://bricks.trythis.one',
    'https://bricks-operating.l8p1.workers.dev',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ],
  jurisdiction: (env) => env.ROOM_JURISDICTION || null,
  admin: { binding: 'NETWORK_KIT_ADMIN', game: 'bricks', mode: 'duo' },
});

export const Room = rooms.RoomObject;
export default { fetch: rooms.fetch };
