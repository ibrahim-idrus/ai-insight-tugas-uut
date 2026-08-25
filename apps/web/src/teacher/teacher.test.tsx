import assert from "node:assert/strict";
import test from "node:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TeacherClassesPage } from "./pages/TeacherClassesPage";
import { TeacherContextPage } from "./pages/TeacherContextPage";

function renderedText(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

test("Classes page renders assigned classes grouped by academic period", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/teacher/classes");
    return new Response(
      JSON.stringify({
        contexts: [
          {
            id: 1,
            class: { id: 1, name: "X-A", gradeLevel: 10 },
            subject: { id: 1, name: "Matematika", code: "MTK" },
            academicPeriod: { id: 1, schoolYear: "2025/2026", semester: 1 },
            studentCount: 5,
            materialCount: 2,
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter>
          <TeacherClassesPage />
        </MemoryRouter>
      );
    });

    const output = renderedText(renderer);
    for (const text of ["X-A", "Matematika", "2025/2026", "5 students", "2 materials"]) {
      assert.match(output, new RegExp(text));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Classes page shows an empty state when no classes are assigned", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/teacher/classes");
    return new Response(JSON.stringify({ contexts: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter>
          <TeacherClassesPage />
        </MemoryRouter>
      );
    });

    assert.match(renderedText(renderer), /No classes are assigned to you yet/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Context page renders its students and materials", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/teacher/classes/1");
    return new Response(
      JSON.stringify({
        id: 1,
        class: { id: 1, name: "X-A", gradeLevel: 10 },
        subject: { id: 1, name: "Matematika", code: "MTK" },
        academicPeriod: { id: 1, schoolYear: "2025/2026", semester: 1 },
        studentCount: 2,
        materialCount: 1,
        students: [
          { id: 10, name: "Ayu Lestari", nis: "1001" },
          { id: 11, name: "Bima Pratama", nis: "1002" },
        ],
        materials: [
          {
            id: 5,
            title: "Aljabar Dasar",
            description: "Pengenalan aljabar",
            content: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-02T00:00:00.000Z",
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1"]}>
          <Routes>
            <Route element={<TeacherContextPage />} path="/teacher/classes/:contextId" />
          </Routes>
        </MemoryRouter>
      );
    });

    const output = renderedText(renderer);
    for (const text of ["X-A", "Matematika", "Ayu Lestari", "1001", "Bima Pratama", "1002", "Aljabar Dasar"]) {
      assert.match(output, new RegExp(text));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Context page shows a Classes link when its context is not found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/teacher/classes/1");
    return new Response(JSON.stringify({ error: "Class context not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1"]}>
          <Routes>
            <Route element={<TeacherContextPage />} path="/teacher/classes/:contextId" />
          </Routes>
        </MemoryRouter>
      );
    });

    const output = renderedText(renderer);
    assert.match(output, /Class context not found/);
    assert.match(output, /Classes/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
