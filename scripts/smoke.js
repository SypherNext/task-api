// End-to-end smoke test against a running Task API: the whole user journey,
// one line per step. Exits with 1 at the first unexpected status.
// Usage: BASE_URL=http://localhost:18180 node scripts/smoke.js
import crypto from 'node:crypto';

const base = process.env.BASE_URL ?? 'http://localhost:18180';
const email = `smoke-${crypto.randomUUID().slice(0, 8)}@example.com`;
const password = 'smoke test password 123';
let token;

async function step(name, expected, method, path, { body, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  const ok = res.status === expected;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(res.status).padEnd(3)} ${method.padEnd(6)} ${path.padEnd(24)} ${name}`);
  if (!ok) {
    console.log(text);
    process.exit(1);
  }
  return { data, headers: res.headers };
}

await step('process is alive', 200, 'GET', '/healthz');
await step('database is reachable', 200, 'GET', '/readyz');
await step('docs are served', 200, 'GET', '/openapi.json');
await step('register', 201, 'POST', '/auth/register', { body: { email, password } });
await step('wrong password', 401, 'POST', '/auth/login', { body: { email, password: 'nope' } });
({ data: { token } } = await step('log in', 200, 'POST', '/auth/login', { body: { email, password } }));
await step('invalid task', 400, 'POST', '/tasks', { body: { title: '' } });
const key = crypto.randomUUID();
const { data: task } = await step('create (Idempotency-Key)', 201, 'POST', '/tasks', { body: { title: 'Ship the Task API' }, headers: { 'Idempotency-Key': key } });
const again = await step('retry, same key', 201, 'POST', '/tasks', { body: { title: 'Ship the Task API' }, headers: { 'Idempotency-Key': key } });
if (again.data.id !== task.id || again.headers.get('idempotent-replayed') !== 'true') throw new Error('retry created a second task');
await step('list, first page', 200, 'GET', '/tasks?limit=10');
await step('update without If-Match', 428, 'PATCH', `/tasks/${task.id}`, { body: { done: true } });
await step('update with If-Match "1"', 200, 'PATCH', `/tasks/${task.id}`, { body: { done: true }, headers: { 'If-Match': '"1"' } });
await step('stale If-Match "1"', 412, 'PATCH', `/tasks/${task.id}`, { body: { done: false }, headers: { 'If-Match': '"1"' } });
await step('delete', 204, 'DELETE', `/tasks/${task.id}`);
await step('read deleted task', 404, 'GET', `/tasks/${task.id}`);
await step('log out', 204, 'POST', '/auth/logout');
await step('token no longer works', 401, 'GET', '/auth/me');
console.log('smoke test passed');
