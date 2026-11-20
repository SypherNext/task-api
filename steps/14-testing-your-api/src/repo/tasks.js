// All SQL for tasks lives here. Every query is scoped to one owner:
// a task that belongs to someone else behaves exactly like a task that does not exist.
const COLUMNS = `id, title, priority, done, version, created_at AS "createdAt", updated_at AS "updatedAt"`;

export function tasksRepo(pool) {
  return {
    async list(ownerId, { limit, after, done, priority, q, sort }) {
      const params = [ownerId];
      const where = ['owner_id = $1'];
      const add = (sql, value) => {
        params.push(value);
        where.push(sql.replace('?', `$${params.length}`));
      };
      if (done !== undefined) add('done = ?', done);
      if (priority) add('priority = ?', priority);
      if (q) add('title ILIKE ?', `%${q.replace(/[\\%_]/g, '\\$&')}%`); // % and _ match literally

      const desc = sort === '-createdAt';
      if (after) {
        params.push(after.createdAt, after.id);
        const n = params.length;
        where.push(`(created_at, id) ${desc ? '<' : '>'} ($${n - 1}::timestamptz, $${n})`);
      }
      params.push(limit + 1);
      const dir = desc ? 'DESC' : 'ASC';
      const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM tasks WHERE ${where.join(' AND ')}
          ORDER BY created_at ${dir}, id ${dir} LIMIT $${params.length}`,
        params,
      );
      return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
    },

    async get(ownerId, id) {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1 AND owner_id = $2`, [id, ownerId]);
      return rows[0];
    },

    // db is the pool, or a client inside a transaction (see idempotency.js).
    async create(ownerId, { title, priority }, db = pool) {
      const { rows } = await db.query(
        `INSERT INTO tasks (owner_id, title, priority) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
        [ownerId, title, priority],
      );
      return rows[0];
    },

    // Optimistic locking: the update only happens if nobody changed the task
    // since the client read it (same version). Returns undefined otherwise.
    async update(ownerId, id, expectedVersion, { title, done, priority }) {
      const { rows } = await pool.query(
        `UPDATE tasks
            SET title      = COALESCE($4, title),
                done       = COALESCE($5, done),
                priority   = COALESCE($6, priority),
                version    = version + 1,
                updated_at = now()
          WHERE id = $1 AND owner_id = $2 AND version = $3
      RETURNING ${COLUMNS}`,
        [id, ownerId, expectedVersion, title ?? null, done ?? null, priority ?? null],
      );
      return rows[0];
    },

    async remove(ownerId, id) {
      const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1 AND owner_id = $2', [id, ownerId]);
      return rowCount === 1;
    },
  };
}
