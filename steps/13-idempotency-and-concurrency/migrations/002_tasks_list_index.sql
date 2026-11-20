-- JavaScript dates keep milliseconds; PostgreSQL keeps microseconds. A cursor
-- built from a JavaScript date would point slightly off the real row, so store
-- milliseconds only. Then the value in the cursor is exactly the stored value.
ALTER TABLE tasks
  ALTER COLUMN created_at TYPE timestamptz(3),
  ALTER COLUMN updated_at TYPE timestamptz(3);

-- The list endpoint sorts by (created_at, id). This index serves both directions.
CREATE INDEX tasks_created_at_id_idx ON tasks (created_at, id);
