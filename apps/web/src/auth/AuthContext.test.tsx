import assert from "node:assert/strict";
import test from "node:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ProtectedRoute } from "../App";
import type { AuthenticatedUser } from "./types";

const teacher: AuthenticatedUser = { id: 2, name: "Arsito Guru", role: "teacher" };

function renderedText(renderer: ReactTestRenderer): string {
  const json = renderer.toJSON();
  if (!json || Array.isArray(json)) throw new Error("Expected one rendered element");
  return String(json.children?.[0] ?? "");
}

function AuthStateProbe() {
  const { isLoading, user } = useAuth();
  return <span>{`${isLoading ? "loading" : "ready"}:${user?.role ?? "anonymous"}`}</span>;
}

test("restores the current user while showing a loading state", async () => {
  const originalFetch = globalThis.fetch;
  let resolveMe!: (response: Response) => void;
  const meResponse = new Promise<Response>((resolve) => {
    resolveMe = resolve;
  });

  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/auth/me");
    return meResponse;
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      );
    });
    assert.equal(renderedText(renderer), "loading:anonymous");

    resolveMe(new Response(JSON.stringify({ user: teacher }), { status: 200 }));
    await act(async () => {
      await meResponse;
    });

    assert.equal(renderedText(renderer), "ready:teacher");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redirects an authenticated user away from a wrong-role namespace", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "/api/auth/me");
    return new Response(JSON.stringify({ user: teacher }), { status: 200 });
  }) as typeof fetch;

  try {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <MemoryRouter initialEntries={["/student/classes"]}>
            <Routes>
              <Route element={<ProtectedRoute role="student" />} path="/student/*">
                <Route element={<span>student workspace</span>} path="classes" />
              </Route>
              <Route element={<span>teacher dashboard</span>} path="/teacher/dashboard" />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );
    });

    assert.equal(renderedText(renderer), "teacher dashboard");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("logout clears the authenticated user after the server request", async () => {
  const originalFetch = globalThis.fetch;
  let latestAuth: ReturnType<typeof useAuth> | undefined;

  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url === "/api/auth/me") {
      return new Response(JSON.stringify({ user: teacher }), { status: 200 });
    }
    assert.equal(url, "/api/auth/logout");
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  function LogoutProbe() {
    latestAuth = useAuth();
    return null;
  }

  try {
    await act(async () => {
      create(
        <AuthProvider>
          <LogoutProbe />
        </AuthProvider>
      );
    });
    assert.equal(latestAuth?.user?.role, "teacher");

    await act(async () => {
      await latestAuth?.logout();
    });

    assert.equal(latestAuth?.user, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
