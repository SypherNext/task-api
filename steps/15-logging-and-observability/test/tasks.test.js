import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, signUp } from './helpers.js';

describe('tasks', () => {
  test('needs a token', async () => {
    const res = await request(app).get('/tasks').expect(401);
    assert.equal(res.headers['www-authenticate'], 'Bearer');
  });

  test('create answers 201 with Location and ETag', async () => {
    const auth = await signUp('asha@example.com');
    const res = await request(app).post('/tasks').set('Authorization', auth).send({ title: 'Write tests' }).expect(201);
    assert.equal(res.headers.location, `/tasks/${res.body.id}`);
    assert.equal(res.headers.etag, '"1"');
    assert.equal(res.body.priority, 'normal');
  });

  test('invalid input is a 400 problem that names the field', async () => {
    const auth = await signUp('asha@example.com');
    const res = await request(app).post('/tasks').set('Authorization', auth).send({ title: '', owner_id: 2 }).expect(400);
    assert.deepEqual(
      res.body.errors.map((e) => e.path),
      ['title', ''],
    );
  });

  test("another user's task is a 404, for reads, updates and deletes", async () => {
    const asha = await signUp('asha@example.com');
    const bob = await signUp('bob@example.com');
    const { body: task } = await request(app).post('/tasks').set('Authorization', asha).send({ title: 'Private' }).expect(201);
    await request(app).get(`/tasks/${task.id}`).set('Authorization', bob).expect(404);
    await request(app).patch(`/tasks/${task.id}`).set('Authorization', bob).set('If-Match', '"1"').send({ done: true }).expect(404);
    await request(app).delete(`/tasks/${task.id}`).set('Authorization', bob).expect(404);
    const still = await request(app).get(`/tasks/${task.id}`).set('Authorization', asha).expect(200);
    assert.equal(still.body.done, false);
  });

  test('pages cover every task exactly once', async () => {
    const auth = await signUp('asha@example.com');
    for (let i = 1; i <= 7; i++) {
      await request(app).post('/tasks').set('Authorization', auth).send({ title: `Task ${i}` }).expect(201);
    }
    const seen = [];
    let cursor;
    do {
      const res = await request(app).get('/tasks').query({ limit: 3, ...(cursor && { cursor }) }).set('Authorization', auth).expect(200);
      seen.push(...res.body.data.map((t) => t.title));
      cursor = res.body.page.nextCursor;
    } while (cursor);
    assert.equal(seen.length, 7);
    assert.equal(new Set(seen).size, 7);
    assert.equal(seen[0], 'Task 7'); // newest first
  });

  test('a stale If-Match is a 412 and changes nothing', async () => {
    const auth = await signUp('asha@example.com');
    const { body: task } = await request(app).post('/tasks').set('Authorization', auth).send({ title: 'Edit me' }).expect(201);
    await request(app).patch(`/tasks/${task.id}`).set('Authorization', auth).set('If-Match', '"1"').send({ title: 'First edit' }).expect(200);
    await request(app).patch(`/tasks/${task.id}`).set('Authorization', auth).set('If-Match', '"1"').send({ title: 'Second edit' }).expect(412);
    const res = await request(app).get(`/tasks/${task.id}`).set('Authorization', auth).expect(200);
    assert.equal(res.body.title, 'First edit');
  });

  test('the same Idempotency-Key creates one task', async () => {
    const auth = await signUp('asha@example.com');
    const send = () => request(app).post('/tasks').set('Authorization', auth).set('Idempotency-Key', 'k-1').send({ title: 'Once' });
    const [a, b] = await Promise.all([send(), send()]);
    assert.equal(a.body.id, b.body.id);
    assert.deepEqual([a.headers['idempotent-replayed'], b.headers['idempotent-replayed']].sort(), ['false', 'true']);
    const list = await request(app).get('/tasks').set('Authorization', auth).expect(200);
    assert.equal(list.body.data.length, 1);
  });
});
