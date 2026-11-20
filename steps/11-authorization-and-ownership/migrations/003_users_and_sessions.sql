CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text           NOT NULL,
  password_hash text           NOT NULL,
  created_at    timestamptz(3) NOT NULL DEFAULT now()
);
-- One account per address, whatever the letter case.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE sessions (
  token_hash bytea          PRIMARY KEY, -- SHA-256 of the token; the token itself is never stored
  user_id    bigint         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  expires_at timestamptz(3) NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
