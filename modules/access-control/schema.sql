-- Private storage. Never expose SQL access or admin records through public APIs.
CREATE TABLE IF NOT EXISTS admins (
  subject TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1))
);
CREATE TABLE IF NOT EXISTS magic_links (
  digest TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS magic_links_expiry ON magic_links(expires_at);
CREATE TABLE IF NOT EXISTS rate_windows (
  key TEXT PRIMARY KEY,
  used INTEGER NOT NULL,
  resets_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_window_expiry ON rate_windows(resets_at);
CREATE TABLE IF NOT EXISTS admin_sessions (
  digest TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_session_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS private_invites (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'active', 'revoked')),
  owner_uid TEXT,
  owner_name TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS private_invite_expiry ON private_invites(expires_at);
CREATE TABLE IF NOT EXISTS operator_mirrors (
  digest TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  delete_after INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS operator_mirror_expiry ON operator_mirrors(delete_after);
