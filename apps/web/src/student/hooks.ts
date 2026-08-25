import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export function useStudentFetch() {
  const { user } = useAuth();

  async function studentFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const { apiUrl } = await import("../auth/api");
    const response = await fetch(apiUrl(path), {
      credentials: "include",
      ...options,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `Request failed (${response.status})`);
    }
    return response.json();
  }

  return { studentFetch, user };
}

export function useLoadingState() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  return { loading, setLoading, error, setError };
}
