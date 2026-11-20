import crypto from 'node:crypto';

const sha256 = (token) => crypto.createHash('sha256').update(token).digest();

export function sessionsRepo(pool, { ttlHours = 24 } = {}) {
  return {
    // 32 random bytes: about 43 characters, impossible to guess.
    async create(userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      const { rows } = await pool.query(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(hours => $3))
         RETURNING expires_at AS "expiresAt"`,
        [sha256(token), userId, ttlHours],
      );
      return { token, expiresAt: rows[0].expiresAt };
    },

    // The user behind a token, or undefined if the token is unknown or expired.
    async findUser(token) {
      const { rows } = await pool.query(
        `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sha256(token)],
      );
      return rows[0];
    },

    async remove(token) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
    },
  };
}
