import assert from "node:assert/strict";
import test from "node:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { TeacherClassesPage } from "./pages/TeacherClassesPage";

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
