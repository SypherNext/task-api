// A tiny server built on node:http that prints every request it receives
// and answers with a small JSON body. Used to look at raw HTTP.
import http from 'node:http';

const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;

  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    console.log(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
  }
  if (body) console.log(`\n${body}`);
  console.log('---');

  if (req.url === '/missing') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'nothing here' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ youSent: req.method, path: req.url }));
});

server.listen(18181, () => console.log('echo server on http://localhost:18181'));
