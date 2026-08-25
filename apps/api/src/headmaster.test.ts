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

test("seed preserves historical PAI coverage and current-period analytics fixtures", async () => {
  const database = await createSeededDatabase();
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM subject_teacher_assignments WHERE teacher_id = 3 AND subject_id = 8 AND academic_period_id = 1"
    )[0].values[0][0],
    2
  );
  assert.deepEqual(
    database.exec(
      "SELECT MIN(id), MAX(id), COUNT(*) FROM subject_teacher_assignments WHERE academic_period_id = 2"
    )[0].values[0],
    [19, 30, 12]
  );
  assert.equal(
    database.exec("SELECT COUNT(*) FROM assignments WHERE subject_teacher_assignment_id BETWEEN 19 AND 24 AND status = 'published'")[0]
      .values[0][0],
    12
  );
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id BETWEEN 10 AND 21 AND status = 'graded'"
    )[0].values[0][0],
    45
  );
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id BETWEEN 10 AND 21 AND status = 'submitted'"
    )[0].values[0][0],
    2
  );
  assert.equal(
    database.exec("SELECT COUNT(*) FROM attitudes WHERE academic_period_id = 2")[0].values[0][0],
    30
  );
});
