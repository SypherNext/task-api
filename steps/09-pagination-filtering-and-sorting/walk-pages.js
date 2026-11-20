// Walk every page of /tasks with limit=10 and check nothing is missing or repeated.
let cursor = null;
const seen = [];
let pages = 0;
do {
  const url = new URL('http://localhost:18180/tasks?limit=10');
  if (cursor) url.searchParams.set('cursor', cursor);
  const body = await (await fetch(url)).json();
  pages += 1;
  seen.push(...body.data.map((t) => t.id));
  console.log(`page ${pages}: ids ${body.data.map((t) => t.id).join(',')}`);
  cursor = body.page.nextCursor;
} while (cursor);
console.log(`${seen.length} tasks, ${new Set(seen).size} unique, ${pages} pages`);
