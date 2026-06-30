import crypto from 'node:crypto';
import { nanoid } from 'nanoid';

export type SessionRecord = {
  id: string;
  csrfToken: string;
  expiresAt: number;
  createdAt: number;
  lastSeenAt: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(private readonly ttlMs: number) {}

  create(): SessionRecord {
    const now = Date.now();
    const session: SessionRecord = {
      id: nanoid(32),
      csrfToken: crypto.randomBytes(24).toString('hex'),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string | undefined): SessionRecord | null {
    if (!sessionId) {
      return null;
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(session.id);
      return null;
    }
    return session;
  }

  touch(sessionId: string | undefined): SessionRecord | null {
    const session = this.get(sessionId);
    if (!session) {
      return null;
    }
    session.lastSeenAt = Date.now();
    session.expiresAt = session.lastSeenAt + this.ttlMs;
    this.sessions.set(session.id, session);
    return session;
  }

  delete(sessionId: string | undefined): void {
    if (!sessionId) {
      return;
    }
    this.sessions.delete(sessionId);
  }

  sweep(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }
}

export class RateLimiter {
  private readonly records = new Map<string, RateLimitRecord>();

  constructor(
    private readonly windowMs: number,
    private readonly maxAttempts: number,
  ) {}

  consume(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const current = this.records.get(key);
    let record = current;

    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + this.windowMs };
    }

    record.count += 1;
    this.records.set(key, record);

    return {
      allowed: record.count <= this.maxAttempts,
      remaining: Math.max(this.maxAttempts - record.count, 0),
      resetAt: record.resetAt,
    };
  }

  clear(key: string): void {
    this.records.delete(key);
  }

  sweep(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.resetAt <= now) {
        this.records.delete(key);
      }
    }
  }
}
