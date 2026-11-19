// The vendored network-kit client is plain JavaScript; src/net/kit.ts gives the typed view Bricks uses.
declare module '*network-kit/client/index.js' {
  const value: Record<string, unknown> & { NetworkRoom: unknown; shareLink: unknown; readShareLink: unknown; forgetShareKey: unknown; readLobbyLink: unknown; watchNotices: unknown }
  export = value
}
