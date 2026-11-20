import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 18180);

// A tiny request logger: runs for every request, then hands over with next().
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'task-api', status: 'ok' });
});

app.get('/hello/:name', (req, res) => {
  res.json({ greeting: `Hello, ${req.params.name}`, query: req.query });
});

app.post('/echo', (req, res) => {
  res.status(201).json({ received: req.body });
});

app.listen(port, (err) => {
  if (err) {
    console.error(`could not start: ${err.message}`);
    process.exit(1);
  }
  console.log(`task-api listening on http://localhost:${port}`);
});
