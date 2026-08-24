import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import initSqlJs, { Database } from "sql.js";
import { createApp } from "./app";
import { MemorySessionStore } from "./auth/session-store";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

async function createTestDatabase(): Promise<Database> {
  SQL ??= await initSqlJs();
  const database = new SQL.Database();

  database.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('headmaster', 'teacher', 'student')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade_level INTEGER NOT NULL
    );
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      nis TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );
  `);

  database.run("INSERT INTO classes (name, grade_level) VALUES (?, ?)", ["X-A", 10]);

  const staffHash = bcrypt.hashSync("admin123", 4);
  const studentHash = bcrypt.hashSync("student123", 4);
  database.run(
    "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["Baim Kepala Sekolah", "adminbaim", staffHash, "headmaster"]
  );
  database.run(
    "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["Arsito Guru", "adminarsito", staffHash, "teacher"]
  );
  database.run(
    "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["Ahmad Rizki Pratama", "ahmad.rizki", studentHash, "student"]
  );
  database.run(
    "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["Unlinked Student", "unlinked.student", studentHash, "student"]
  );
  database.run(
    "INSERT INTO students (user_id, nis, name, class_id) VALUES (?, ?, ?, ?)",
    [3, "2025001", "Ahmad Rizki Pratama", 1]
  );

  return database;
}

test("migration and seed define the unified users model", async () => {
  SQL ??= await initSqlJs();
  const database = new SQL.Database();
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/migration.sql"), "utf8"));

  const studentColumns = database
    .exec("PRAGMA table_info(students)")[0]
    .values.map((row) => row[1]);
  assert.deepEqual(studentColumns, [
    "id",
    "user_id",
    "nis",
    "name",
    "class_id",
    "created_at",
    "updated_at",
  ]);

  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/seed.sql"), "utf8"));
  assert.deepEqual(
    database.exec("SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role")[0].values,
    [
      ["headmaster", 1],
      ["student", 30],
      ["teacher", 2],
    ]
  );
  assert.equal(
    database.exec("SELECT COUNT(*) FROM students s JOIN users u ON u.id = s.user_id")[0].values[0][0],
    30
  );
  const studentHash = database.exec(
    "SELECT password_hash FROM users WHERE username = 'ahmad.rizki'"
  )[0].values[0][0] as string;
  assert.equal(await bcrypt.compare("student123", studentHash), true);
});

async function setup() {
  const database = await createTestDatabase();
  const sessions = new MemorySessionStore();
  return { app: createApp(database, sessions), database, sessions };
}

async function login(app: ReturnType<typeof createApp>, username: string, password: string) {
  const response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  return { response, cookie: setCookie.split(";", 1)[0] };
}

test("logs in a teacher from users", async () => {
  const { app } = await setup();
  const { response } = await login(app, "adminarsito", "admin123");

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.user, { id: 2, name: "Arsito Guru", role: "teacher" });
  assert.equal(body.user.password_hash, undefined);
});

test("logs in a headmaster from users", async () => {
  const { app } = await setup();
  const { response } = await login(app, "adminbaim", "admin123");

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.user, { id: 1, name: "Baim Kepala Sekolah", role: "headmaster" });
  assert.equal(body.user.password_hash, undefined);
});

test("logs in a student from users and returns student profile data", async () => {
  const { app } = await setup();
  const { response } = await login(app, "ahmad.rizki", "student123");

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.user, {
    id: 3,
    name: "Ahmad Rizki Pratama",
    role: "student",
    student_id: 1,
    class_id: 1,
  });
  assert.equal(body.user.password_hash, undefined);
});

test("returns the same generic error for unknown username and wrong password", async () => {
  const { app } = await setup();
  const unknown = await login(app, "missing", "wrong");
  const wrongPassword = await login(app, "adminarsito", "wrong");

  assert.equal(unknown.response.status, 401);
  assert.equal(wrongPassword.response.status, 401);
  assert.deepEqual(await unknown.response.json(), { error: "Invalid username or password" });
  assert.deepEqual(await wrongPassword.response.json(), { error: "Invalid username or password" });
});

test("rejects missing and blank credentials before authentication", async () => {
  const { app } = await setup();
  const blankPassword = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "adminarsito", password: "   " }),
  });
  const nullBody = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });

  assert.equal(blankPassword.status, 400);
  assert.equal(nullBody.status, 400);
  assert.deepEqual(await blankPassword.json(), { error: "Username and password are required" });
  assert.deepEqual(await nullBody.json(), { error: "Username and password are required" });
});

test("allows credentialed requests from the configured local frontend origin", async () => {
  const { app } = await setup();
  const response = await app.request("/api/health", {
    headers: { Origin: "http://localhost:5173" },
  });

  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("rejects a student user without a synchronized students profile", async () => {
  const { app } = await setup();
  const { response } = await login(app, "unlinked.student", "student123");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Invalid username or password" });
});

test("restores the current user from the session cookie", async () => {
  const { app } = await setup();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const response = await app.request("/api/auth/me", { headers: { Cookie: cookie } });

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).user, {
    id: 2,
    name: "Arsito Guru",
    role: "teacher",
  });
});

test("returns 401 for an unauthenticated protected request", async () => {
  const { app } = await setup();
  const response = await app.request("/api/teacher/dashboard");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("allows only the matching role on protected dashboard endpoints", async () => {
  const fixtures = [
    { username: "adminarsito", password: "admin123", role: "teacher", own: "/api/teacher/dashboard" },
    { username: "adminbaim", password: "admin123", role: "headmaster", own: "/api/headmaster/dashboard" },
    { username: "ahmad.rizki", password: "student123", role: "student", own: "/api/student/dashboard" },
  ];
  const endpoints = [
    "/api/teacher/dashboard",
    "/api/headmaster/dashboard",
    "/api/student/dashboard",
  ];

  for (const fixture of fixtures) {
    const { app } = await setup();
    const { cookie } = await login(app, fixture.username, fixture.password);

    for (const endpoint of endpoints) {
      const response = await app.request(endpoint, { headers: { Cookie: cookie } });
      assert.equal(response.status, endpoint === fixture.own ? 200 : 403, `${fixture.role} -> ${endpoint}`);
    }
  }
});

test("logout invalidates the session", async () => {
  const { app } = await setup();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const logout = await app.request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  const protectedRequest = await app.request("/api/teacher/dashboard", {
    headers: { Cookie: cookie },
  });

  assert.equal(logout.status, 204);
  assert.equal(protectedRequest.status, 401);
});
