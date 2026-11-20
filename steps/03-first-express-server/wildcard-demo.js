import express from 'express';

const app = express();
try {
  app.get('*', (req, res) => res.send('catch all'));
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
app.get('/{*splat}', (req, res) => res.json({ splat: req.params.splat }));
const server = app.listen(18182, async () => {
  const r = await fetch('http://localhost:18182/files/2026/report.pdf');
  console.log(await r.text());
  server.close();
});
