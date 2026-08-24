import { randomBytes } from "node:crypto";
import type { SessionSubject } from "./types";

export const SESSION_COOKIE = "lms_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionStore {
  create(subject: SessionSubject): string;
  get(token: string): SessionSubject | null;
  delete(token: string): void;
}

interface StoredSession {
  subject: SessionSubject;
  expiresAt: number;
}

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, StoredSession>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  create(subject: SessionSubject): string {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, {
      subject,
      expiresAt: this.now() + SESSION_TTL_SECONDS * 1000,
    });
    return token;
  }

  get(token: string): SessionSubject | null {
    const stored = this.sessions.get(token);
    if (!stored) return null;

    if (stored.expiresAt <= this.now()) {
      this.sessions.delete(token);
      return null;
    }

    return stored.subject;
  }

  delete(token: string): void {
    this.sessions.delete(token);
  }
}
