import assert from "node:assert/strict";
import test from "node:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { TeacherClassesPage } from "./pages/TeacherClassesPage";
import { TeacherContextPage } from "./pages/TeacherContextPage";
import { TeacherMaterialPage } from "./pages/TeacherMaterialPage";
import { deleteTeacherMaterial, updateTeacherMaterial } from "./api";

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

test("Classes page shows a loading state while assigned classes are loading", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter>
          <TeacherClassesPage />
        </MemoryRouter>
      );
    });

    assert.match(renderedText(renderer), /Loading classes/);
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
    assert.deepEqual(
      renderer.root.findAllByType("td").map((cell) => cell.props["data-label"]),
      ["Name", "NIS", "Name", "NIS", "Title", "Updated", "Actions"]
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Context page shows empty students and materials states", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/teacher/classes/1");
    return new Response(
      JSON.stringify({
        id: 1,
        class: { id: 1, name: "X-A", gradeLevel: 10 },
        subject: { id: 1, name: "Matematika", code: "MTK" },
        academicPeriod: { id: 1, schoolYear: "2025/2026", semester: 1 },
        studentCount: 0,
        materialCount: 0,
        students: [],
        materials: [],
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
    assert.match(output, /No students are assigned to this class yet/);
    assert.match(output, /No materials have been created for this class yet/);
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

test("Context page clears stale details while another context is loading", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    if (String(input) === "/api/teacher/classes/1") {
      return new Response(
        JSON.stringify({
          id: 1,
          class: { id: 1, name: "X-A", gradeLevel: 10 },
          subject: { id: 1, name: "Matematika", code: "MTK" },
          academicPeriod: { id: 1, schoolYear: "2025/2026", semester: 1 },
          studentCount: 1,
          materialCount: 0,
          students: [{ id: 10, name: "Ayu Lestari", nis: "1001" }],
          materials: [],
        }),
        { status: 200 }
      );
    }

    assert.equal(String(input), "/api/teacher/classes/2");
    return new Promise<Response>(() => {});
  }) as typeof fetch;

  function ContextRoute() {
    const navigate = useNavigate();
    return (
      <>
        <button onClick={() => navigate("/teacher/classes/2")} type="button">Load second class</button>
        <TeacherContextPage />
      </>
    );
  }

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1"]}>
          <Routes>
            <Route element={<ContextRoute />} path="/teacher/classes/:contextId" />
          </Routes>
        </MemoryRouter>
      );
    });

    await act(async () => {
      renderer.root.findByType("button").props.onClick();
    });

    const output = renderedText(renderer);
    assert.doesNotMatch(output, /Ayu Lestari/);
    assert.match(output, /Loading class details/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Material view renders the material and an edit link", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/teacher/classes/1/materials/5");
    return new Response(
      JSON.stringify({
        id: 5,
        title: "Aljabar Dasar",
        description: "Pengenalan aljabar",
        content: "Baca materi ini sebelum pertemuan berikutnya.",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1/materials/5"]}>
          <Routes>
            <Route element={<TeacherMaterialPage mode="view" />} path="/teacher/classes/:contextId/materials/:materialId" />
          </Routes>
        </MemoryRouter>
      );
    });

    const output = renderedText(renderer);
    for (const text of ["Aljabar Dasar", "Pengenalan aljabar", "Baca materi ini sebelum pertemuan berikutnya.", "Edit"]) {
      assert.match(output, new RegExp(text));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Material view clears loaded state when its raw route parameters become malformed", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input) => {
    requests.push(String(input));
    return new Response(
      JSON.stringify({
        id: 5,
        title: "Aljabar Dasar",
        description: "Pengenalan aljabar",
        content: "Read this",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  function MaterialRoute() {
    const navigate = useNavigate();
    return (
      <>
        <button onClick={() => navigate("/teacher/classes/1e0/materials/5")} type="button">Use malformed context</button>
        <TeacherMaterialPage mode="view" />
      </>
    );
  }

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1/materials/5"]}>
          <Routes>
            <Route element={<MaterialRoute />} path="/teacher/classes/:contextId/materials/:materialId" />
          </Routes>
        </MemoryRouter>
      );
    });
    await act(async () => {
      renderer.root.findByType("button").props.onClick();
    });

    assert.deepEqual(requests, ["/api/teacher/classes/1/materials/5"]);
    assert.match(renderedText(renderer), /Material not found/);
    assert.doesNotMatch(renderedText(renderer), /Aljabar Dasar/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Material create page shows the material form without loading a material", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    assert.fail("The create form must not fetch an existing material");
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1/materials/new"]}>
          <Routes>
            <Route element={<TeacherMaterialPage mode="create" />} path="/teacher/classes/:contextId/materials/new" />
          </Routes>
        </MemoryRouter>
      );
    });

    const fields = renderer.root.findAllByType("textarea");
    assert.equal(renderer.root.findAllByType("input").length, 1);
    assert.equal(fields.length, 2);
    assert.match(renderedText(renderer), /Save material/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Material create saves trimmed allowed fields and navigates to the saved material", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ input: string; init: RequestInit | undefined }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ input: String(input), init });
    return new Response(
      JSON.stringify({
        id: 8,
        title: "New guide",
        description: "Intro",
        content: "Read this",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
      { status: 201 }
    );
  }) as typeof fetch;

  function Location() {
    return <span>{useLocation().pathname}</span>;
  }

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <MemoryRouter initialEntries={["/teacher/classes/1/materials/new"]}>
          <Routes>
            <Route element={<TeacherMaterialPage mode="create" />} path="/teacher/classes/:contextId/materials/new" />
            <Route element={<Location />} path="*" />
          </Routes>
        </MemoryRouter>
      );
    });

    await act(async () => {
      renderer.root.findByProps({ id: "material-title" }).props.onChange({ target: { value: "  New guide  " } });
      renderer.root.findByProps({ id: "material-description" }).props.onChange({ target: { value: "Intro" } });
      renderer.root.findByProps({ id: "material-content" }).props.onChange({ target: { value: "Read this" } });
    });
    await act(async () => {
      await renderer.root.findByType("form").props.onSubmit({ preventDefault() {} });
    });

    assert.deepEqual(requests, [{
      input: "/api/teacher/classes/1/materials",
      init: {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New guide", description: "Intro", content: "Read this" }),
      },
    }]);
    assert.match(renderedText(renderer), /teacher\/classes\/1\/materials\/8/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Material update and delete requests keep the authenticated client contract", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ input: string; init: RequestInit | undefined }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ input: String(input), init });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(
      JSON.stringify({
        id: 5,
        title: "Updated guide",
        description: null,
        content: "Updated",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    await updateTeacherMaterial(1, 5, { title: "Updated guide", description: null, content: "Updated" });
    await deleteTeacherMaterial(1, 5);

    assert.deepEqual(requests, [
      {
        input: "/api/teacher/classes/1/materials/5",
        init: {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated guide", description: null, content: "Updated" }),
        },
      },
      {
        input: "/api/teacher/classes/1/materials/5",
        init: { method: "DELETE", credentials: "include" },
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Material edit loads, saves allowed fields, and navigates to its view", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ input: string; init: RequestInit | undefined }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ input: String(input), init });
    return new Response(JSON.stringify({
      id: 5, title: "Updated guide", description: "Intro", content: "Read this",
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z",
    }), { status: init?.method === "PATCH" ? 200 : 200 });
  }) as typeof fetch;

  function Location() { return <span>{useLocation().pathname}</span>; }

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<MemoryRouter initialEntries={["/teacher/classes/1/materials/5/edit"]}><Routes>
        <Route element={<TeacherMaterialPage mode="edit" />} path="/teacher/classes/:contextId/materials/:materialId/edit" />
        <Route element={<Location />} path="*" />
      </Routes></MemoryRouter>);
    });
    assert.equal(renderer.root.findByProps({ id: "material-title" }).props.value, "Updated guide");
    await act(async () => {
      renderer.root.findByProps({ id: "material-title" }).props.onChange({ target: { value: "  Revised guide  " } });
    });
    await act(async () => {
      await renderer.root.findByType("form").props.onSubmit({ preventDefault() {} });
    });
    assert.equal(requests[0]?.input, "/api/teacher/classes/1/materials/5");
    assert.deepEqual(requests[1], {
      input: "/api/teacher/classes/1/materials/5",
      init: { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Revised guide", description: "Intro", content: "Read this" }) },
    });
    assert.match(renderedText(renderer), /teacher\/classes\/1\/materials\/5/);
  } finally { globalThis.fetch = originalFetch; }
});

test("Material edit confirms deletion and returns to its class", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const requests: Array<{ input: string; init: RequestInit | undefined }> = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { confirm: (message: string) => message === "Delete this material?" } });
  globalThis.fetch = (async (input, init) => {
    requests.push({ input: String(input), init });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 5, title: "Guide", description: null, content: null, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z" }), { status: 200 });
  }) as typeof fetch;

  function Location() { return <span>{useLocation().pathname}</span>; }

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<MemoryRouter initialEntries={["/teacher/classes/1/materials/5/edit"]}><Routes>
        <Route element={<TeacherMaterialPage mode="edit" />} path="/teacher/classes/:contextId/materials/:materialId/edit" />
        <Route element={<Location />} path="*" />
      </Routes></MemoryRouter>);
    });
    await act(async () => { renderer.root.findAllByType("button").find((button) => button.props.children === "Delete material")!.props.onClick(); });
    assert.deepEqual(requests[1], { input: "/api/teacher/classes/1/materials/5", init: { method: "DELETE", credentials: "include" } });
    assert.match(renderedText(renderer), /teacher\/classes\/1/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow }); else Reflect.deleteProperty(globalThis, "window");
  }
});

test("Material edit shows save and delete request failures", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let mutation = "PATCH";
  Object.defineProperty(globalThis, "window", { configurable: true, value: { confirm: () => true } });
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === mutation) return new Response(JSON.stringify({ error: `${mutation} failed` }), { status: 500 });
    return new Response(JSON.stringify({ id: 5, title: "Guide", description: null, content: null, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z" }), { status: 200 });
  }) as typeof fetch;
  try {
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<MemoryRouter initialEntries={["/teacher/classes/1/materials/5/edit"]}><Routes><Route element={<TeacherMaterialPage mode="edit" />} path="/teacher/classes/:contextId/materials/:materialId/edit" /></Routes></MemoryRouter>); });
    await act(async () => { await renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }); });
    assert.match(renderedText(renderer), /PATCH failed/);
    mutation = "DELETE";
    await act(async () => { renderer.root.findAllByType("button").find((button) => button.props.children === "Delete material")!.props.onClick(); });
    assert.match(renderedText(renderer), /DELETE failed/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow }); else Reflect.deleteProperty(globalThis, "window");
  }
});
