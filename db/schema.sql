-- Gauß app schema (PostgreSQL 16, database "gauss" on chessperiment).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL,
  email         text NOT NULL,
  password_hash text NOT NULL,            -- hashed by the backend (argon2/bcrypt), never plaintext
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key    ON users (lower(email));

-- Append-only ledger: every award of Gauß-Punkte is one row.
CREATE TABLE IF NOT EXISTS point_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  points     integer NOT NULL CHECK (points <> 0),
  source     text NOT NULL,               -- e.g. 'quiz', 'game', 'video', 'lecture'
  source_ref text,                        -- e.g. quiz id / level id (Sanity document or game level)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_events_user_idx ON point_events (user_id, created_at DESC);

-- Totals per user (including users with 0 points), for profile + leaderboard.
CREATE OR REPLACE VIEW user_points AS
SELECT u.id AS user_id,
       u.username,
       COALESCE(SUM(p.points), 0)::integer AS total_points
FROM users u
LEFT JOIN point_events p ON p.user_id = u.id
GROUP BY u.id, u.username;

-- Login sessions. Only a SHA-256 hash of the cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash bytea PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Quizzes and lessons pay out once per user and item.
CREATE UNIQUE INDEX IF NOT EXISTS point_events_once_key
  ON point_events (user_id, source, source_ref)
  WHERE source IN ('quiz', 'lesson');
