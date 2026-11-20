-- Every task belongs to one user. Three steps, because rows already exist:
-- add the column as nullable, fill it in, then make it required.
ALTER TABLE tasks ADD COLUMN owner_id bigint REFERENCES users (id) ON DELETE CASCADE;
UPDATE tasks SET owner_id = (SELECT min(id) FROM users);
DELETE FROM tasks WHERE owner_id IS NULL; -- only if there were no users at all
ALTER TABLE tasks ALTER COLUMN owner_id SET NOT NULL;

-- Lists are always "my tasks, newest first": index exactly that.
DROP INDEX tasks_created_at_id_idx;
CREATE INDEX tasks_owner_created_at_id_idx ON tasks (owner_id, created_at, id);
