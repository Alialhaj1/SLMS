-- Replace refresh_tokens table with secure schema (token_hash + jti + revoked_at)
DROP TABLE IF EXISTS refresh_tokens;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  jti TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_user_jti ON refresh_tokens (user_id, jti);
