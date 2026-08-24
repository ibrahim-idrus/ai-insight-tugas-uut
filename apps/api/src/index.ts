import { serve } from "@hono/node-server";
import { createApp, initDb } from "./app.js";

const port = 3000;
const database = await initDb();
const app = createApp(database);

console.log(`LMS API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export default {
  port,
  fetch: app.fetch,
};
