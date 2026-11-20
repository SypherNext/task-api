-- Optimistic locking: every successful update adds 1.
ALTER TABLE tasks ADD COLUMN version integer NOT NULL DEFAULT 1;

-- One row per (user, Idempotency-Key): what was asked and what was answered.
CREATE TABLE idempotency_keys (
  user_id       bigint         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key           text           NOT NULL,
  request_hash  text           NOT NULL,
  status_code   integer,
  response_body jsonb,
  created_at    timestamptz(3) NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
