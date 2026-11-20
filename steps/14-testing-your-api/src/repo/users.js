export function usersRepo(pool) {
  return {
    // Returns the new user, or null when the email is already registered.
    async create(email, passwordHash) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO users (email, password_hash) VALUES ($1, $2)
           RETURNING id, email, created_at AS "createdAt"`,
          [email, passwordHash],
        );
        return rows[0];
      } catch (err) {
        if (err.code === '23505') return null; // unique_violation on users_email_key
        throw err;
      }
    },

    async findByEmail(email) {
      const { rows } = await pool.query(
        'SELECT id, email, password_hash AS "passwordHash" FROM users WHERE lower(email) = lower($1)',
        [email],
      );
      return rows[0];
    },
  };
}
