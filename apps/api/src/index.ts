import app, { initDb } from "./app";

const port = 3000;

await initDb();

console.log(`LMS API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
