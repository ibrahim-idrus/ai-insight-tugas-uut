import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = join(import.meta.dirname, "../../../database/lms.db");

let db: Database;

async function initDb() {
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA foreign_keys = ON");
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) => {
  return c.json({ message: "LMS API is running" });
});

app.get("/api/health", (c) => {
  try {
    db.run("SELECT 1");
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json({ status: "error", database: "disconnected" }, 500);
  }
});

app.get("/api/tables", (c) => {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  const tables = result[0]?.values.map((row) => ({ name: row[0] })) || [];
  return c.json(tables);
});

export { initDb, saveDb };
export default app;
