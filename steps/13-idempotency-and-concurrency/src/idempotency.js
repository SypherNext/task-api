import crypto from 'node:crypto';
import { HttpError } from './errors.js';

const KEY = /^[\x21-\x7e]{1,200}$/; // 1 to 200 visible ASCII characters, for example a UUID

// Runs work(client) at most once per (user, key). The key row and the work share
// one transaction: if the work fails, both roll back and a retry starts fresh.
// A second request with the same key waits on the primary key until the first
// commits, then gets the stored answer instead of doing the work again.
export async function once(pool, { userId, key, body }, work) {
  if (!KEY.test(key)) throw new HttpError(400, 'Bad Request', 'Idempotency-Key must be 1 to 200 visible characters.');
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `INSERT INTO idempotency_keys (user_id, key, request_hash) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, key, requestHash],
    );
    if (claimed.rowCount === 0) {
      // The key exists (if its first request was still running, the INSERT above
      // waited for it to commit). Answer with what was stored.
      const { rows } = await client.query(
        'SELECT request_hash, status_code, response_body FROM idempotency_keys WHERE user_id = $1 AND key = $2',
        [userId, key],
      );
      await client.query('ROLLBACK');
      if (rows[0].request_hash !== requestHash) {
        throw new HttpError(422, 'Unprocessable Content', 'This Idempotency-Key was already used with a different request body.');
      }
      return { status: rows[0].status_code, body: rows[0].response_body, replayed: true };
    }
    const result = await work(client);
    await client.query(
      'UPDATE idempotency_keys SET status_code = $3, response_body = $4 WHERE user_id = $1 AND key = $2',
      [userId, key, result.status, result.body],
    );
    await client.query('COMMIT');
    return { ...result, replayed: false };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
