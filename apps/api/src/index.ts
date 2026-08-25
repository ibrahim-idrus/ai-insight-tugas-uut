import { serve } from "@hono/node-server";
import { createApp, initDb, saveDb } from "./app.js";

const port = 3000;
const database = await initDb();
const app = createApp(database, undefined, () => saveDb());

console.log(`LMS API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export default {
  port,
  fetch: app.fetch,
};
