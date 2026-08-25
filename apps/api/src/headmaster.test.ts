import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import initSqlJs, { Database } from "sql.js";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

async function createSeededDatabase(): Promise<Database> {
  SQL ??= await initSqlJs();
  const database = new SQL.Database();
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/migration.sql"), "utf8"));
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/seed.sql"), "utf8"));
  return database;
}

test("seed provides four academic periods and periodized enrollment history", async () => {
  const database = await createSeededDatabase();
  assert.equal(database.exec("SELECT COUNT(*) FROM academic_periods")[0].values[0][0], 4);
  assert.equal(
    database.exec("SELECT COUNT(DISTINCT academic_period_id) FROM student_enrollments")[0].values[0][0],
    4
  );
  assert.ok(
    Number(database.exec("SELECT COUNT(*) FROM student_enrollments WHERE academic_period_id = 2")[0].values[0][0]) >= 30
  );
});
