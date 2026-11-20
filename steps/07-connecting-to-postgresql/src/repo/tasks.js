// All SQL for tasks lives here. Columns are renamed to camelCase in the query.
const COLUMNS = `id, title, priority, done, created_at AS "createdAt", updated_at AS "updatedAt"`;

export function tasksRepo(pool) {
  return {
    async list() {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM tasks ORDER BY id`);
      return rows;
    },

    async create({ title, priority }) {
      const { rows } = await pool.query(
        `INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING ${COLUMNS}`,
        [title, priority],
      );
      return rows[0];
    },
  };
}
