import { serve } from "@hono/node-server";
import { createApp, initDb, saveDb } from "./app.js";
import { closeExpiredAssignments } from "./teacher/assignment-repository.js";

const port = 3000;
const database = await initDb();

let persistencePending = false;
function persistDatabase(): void {
  persistencePending = true;
  try {
    saveDb();
    persistencePending = false;
  } catch (error) {
    console.error("Unable to persist assignment changes", error);
    throw error;
  }
}

const app = createApp(database, undefined, persistDatabase);

function synchronizeExpiredAssignments(): void {
  try {
    if (closeExpiredAssignments(database) > 0) persistencePending = true;
    if (persistencePending) {
      persistDatabase();
    }
  } catch (error) {
    persistencePending = true;
    console.error("Unable to persist expired assignment closures", error);
  }
}

synchronizeExpiredAssignments();
const expirationTimer = setInterval(synchronizeExpiredAssignments, 30_000);
expirationTimer.unref();

console.log(`LMS API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export default {
  port,
  fetch: app.fetch,
};
