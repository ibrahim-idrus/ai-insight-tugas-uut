import { createApp, initDb } from "./app";

const port = 3000;
const database = await initDb();
const app = createApp(database);

console.log(`LMS API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
