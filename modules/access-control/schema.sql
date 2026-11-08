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
