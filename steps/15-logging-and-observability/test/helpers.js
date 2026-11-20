// Shared setup for the integration tests: a real PostgreSQL database
// (tasks_test, never the development one), migrated once, emptied before each test.
import { before, beforeEach, after } from 'node:test';
import request from 'supertest';
import { createPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { migrate } from '../scripts/migrate.js';

const config = loadConfig({ ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL });
export const pool = createPool(config.databaseUrl);
export let app;

before(async () => {
  await migrate(config.databaseUrl, () => {});
  app = createApp({ pool, config });
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, tasks, sessions, idempotency_keys RESTART IDENTITY CASCADE');
});

after(() => pool.end());

// Registers a user, logs in, returns the Authorization header value.
export async function signUp(email, password = 'a long enough password') {
  await request(app).post('/auth/register').send({ email, password }).expect(201);
  const res = await request(app).post('/auth/login').send({ email, password }).expect(200);
  return `Bearer ${res.body.token}`;
}
