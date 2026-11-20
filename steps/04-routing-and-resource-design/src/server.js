import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 18180);
createApp().listen(port, (err) => {
  if (err) {
    console.error(`could not start: ${err.message}`);
    process.exit(1);
  }
  console.log(`task-api listening on http://localhost:${port}`);
});
