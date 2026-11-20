import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, signUp } from './helpers.js';

describe('auth', () => {
  test('register, log in, read /auth/me, log out', async () => {
    const auth = await signUp('asha@example.com');
    const me = await request(app).get('/auth/me').set('Authorization', auth).expect(200);
    assert.equal(me.body.email, 'asha@example.com');
    await request(app).post('/auth/logout').set('Authorization', auth).expect(204);
    await request(app).get('/auth/me').set('Authorization', auth).expect(401);
  });

  test('the same email twice is a 409, whatever the case', async () => {
    await signUp('asha@example.com');
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ASHA@example.com', password: 'another long password' })
      .expect(409)
      .expect('Content-Type', /application\/problem\+json/);
    assert.equal(res.body.title, 'Conflict');
  });

  test('after 5 wrong passwords, login answers 429', async () => {
    await signUp('asha@example.com');
    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/login').send({ email: 'asha@example.com', password: `guess ${i}` }).expect(401);
    }
    const res = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: 'a long enough password' }).expect(429);
    assert.ok(Number(res.headers['retry-after']) > 0);
  });
});
