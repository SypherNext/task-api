// Two kinds of "at the same time": the same POST sent twice, and two edits of one task.
const base = 'http://localhost:18180';
const json = { 'Content-Type': 'application/json' };
const credentials = JSON.stringify({ email: 'asha@example.com', password: 'correct horse battery staple' });
const { token } = await (await fetch(`${base}/auth/login`, { method: 'POST', headers: json, body: credentials })).json();
const auth = { ...json, Authorization: `Bearer ${token}` };

// 1. A client retries a POST before the first answer arrived: both carry one key.
const post = () =>
  fetch(`${base}/tasks`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': 'retry-demo-7f3a' },
    body: JSON.stringify({ title: 'Pay the electricity bill' }),
  });
const answers = await Promise.all([post(), post()]);
for (const r of answers) {
  const body = await r.json();
  console.log(`POST -> ${r.status} replayed=${r.headers.get('idempotent-replayed')} id=${body.id}`);
}
const list = await (await fetch(`${base}/tasks?q=electricity`, { headers: auth })).json();
console.log(`tasks titled "Pay the electricity bill": ${list.data.length}`);

// 2. Two tabs read the same version of one task, then both save.
const id = list.data[0].id;
const tag = (await fetch(`${base}/tasks/${id}`, { headers: auth })).headers.get('etag');
console.log(`both tabs read task ${id} with ETag ${tag}`);
const save = (title) =>
  fetch(`${base}/tasks/${id}`, { method: 'PATCH', headers: { ...auth, 'If-Match': tag }, body: JSON.stringify({ title }) });
const a = await save('Pay the electricity bill (done online)');
console.log(`tab A PATCH -> ${a.status}, new ETag ${a.headers.get('etag')}`);
const b = await save('Pay the electricity bill before Friday');
console.log(`tab B PATCH -> ${b.status}: ${(await b.json()).detail}`);
