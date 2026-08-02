/**
 * In-memory session hub. Transport-agnostic on purpose: the WebSocket server and
 * the SSE fallback both drive this same store, so behaviour is identical.
 *
 * Deliberately not a database — the assignment is about live synchronisation, and
 * patient drafts are ephemeral by design (PII never touches disk). Swapping this
 * for Redis pub/sub is the one change needed to run more than one instance; see
 * docs/development-planning.md.
 */
import {
  IDLE_AFTER_MS,
  SESSION_TTL_MS,
  type FieldErrors,
  type FieldValues,
  type PatientSession,
  type ServerMessage,
  type SessionStatus,
} from "@/lib/realtime/protocol";
import { completionRatio, type FieldKey, type PatientForm } from "@/lib/patient-form";

type Listener = (message: ServerMessage) => void;

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes

interface Store {
  sessions: Map<string, PatientSession>;
  /** Live socket count per session — a patient can have two tabs open. */
  sockets: Map<string, number>;
  listeners: Set<Listener>;
  sweeper: ReturnType<typeof setInterval> | null;
}

/**
 * Survives Next.js dev hot-reloads and is shared between the custom WS server
 * and the route handlers inside one Node process.
 */
const globalRef = globalThis as typeof globalThis & { __agnosStore?: Store };

function store(): Store {
  if (!globalRef.__agnosStore) {
    globalRef.__agnosStore = {
      sessions: new Map(),
      sockets: new Map(),
      listeners: new Set(),
      sweeper: null,
    };
  }
  const s = globalRef.__agnosStore;
  if (!s.sweeper) {
    // One timer decays "typing" → "idle" and evicts abandoned sessions.
    s.sweeper = setInterval(() => sweep(), 2_000);
    s.sweeper.unref?.();
  }
  return s;
}

function reference(): string {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `PT-${out}`;
}

function emit(message: ServerMessage): void {
  for (const listener of store().listeners) {
    try {
      listener(message);
    } catch {
      // A broken transport must never take the hub down; it will be cleaned up
      // by its own close handler.
    }
  }
}

function publish(session: PatientSession): void {
  emit({ type: "session:upsert", session, serverTime: Date.now() });
}

function ensure(sessionId: string): PatientSession {
  const s = store();
  const existing = s.sessions.get(sessionId);
  if (existing) return existing;
  const now = Date.now();
  const created: PatientSession = {
    id: sessionId,
    reference: reference(),
    status: "typing",
    connected: true,
    values: {},
    errors: {},
    activeField: null,
    completion: 0,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
  };
  s.sessions.set(sessionId, created);
  return created;
}

/* ── read ────────────────────────────────────────────────────────────────── */

export function snapshot(): ServerMessage {
  const sessions = [...store().sessions.values()].sort((a, b) => {
    // Submitted sink to the bottom; otherwise most recently active first.
    if ((a.submittedAt === null) !== (b.submittedAt === null)) return a.submittedAt === null ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  return { type: "snapshot", sessions, serverTime: Date.now() };
}

export function subscribe(listener: Listener): () => void {
  const s = store();
  s.listeners.add(listener);
  return () => {
    s.listeners.delete(listener);
  };
}

/* ── write ───────────────────────────────────────────────────────────────── */

export function joinPatient(sessionId: string): PatientSession {
  const s = store();
  const session = ensure(sessionId);
  s.sockets.set(sessionId, (s.sockets.get(sessionId) ?? 0) + 1);
  session.connected = true;
  session.updatedAt = Date.now();
  publish(session);
  return session;
}

export function leavePatient(sessionId: string): void {
  const s = store();
  const remaining = (s.sockets.get(sessionId) ?? 1) - 1;
  if (remaining <= 0) s.sockets.delete(sessionId);
  else s.sockets.set(sessionId, remaining);

  const session = s.sessions.get(sessionId);
  if (!session) return;
  session.connected = remaining > 0;
  if (!session.connected && session.submittedAt === null) {
    session.status = "idle";
    session.activeField = null;
  }
  publish(session);
}

export function updateSession(
  sessionId: string,
  patch: { values: FieldValues; errors: FieldErrors; activeField: FieldKey | null },
): PatientSession {
  const session = ensure(sessionId);
  session.values = { ...session.values, ...patch.values };
  session.errors = patch.errors;
  session.activeField = patch.activeField;
  session.completion = completionRatio(session.values);
  session.updatedAt = Date.now();
  session.connected = true;
  // A patient can edit after submitting — that reopens the record so staff notice.
  session.status = "typing";
  session.submittedAt = null;
  publish(session);
  return session;
}

export function blurSession(sessionId: string): void {
  const session = store().sessions.get(sessionId);
  if (!session) return;
  session.activeField = null;
  session.updatedAt = Date.now();
  if (session.submittedAt === null) session.status = "idle";
  publish(session);
}

export function submitSession(sessionId: string, values: PatientForm): PatientSession {
  const session = ensure(sessionId);
  const now = Date.now();
  session.values = { ...session.values, ...values };
  session.errors = {};
  session.activeField = null;
  session.completion = 1;
  session.status = "submitted";
  session.submittedAt = now;
  session.updatedAt = now;
  publish(session);
  return session;
}

export function resetSession(sessionId: string): void {
  const s = store();
  if (!s.sessions.has(sessionId)) return;
  s.sessions.delete(sessionId);
  s.sockets.delete(sessionId);
  emit({ type: "session:remove", sessionId });
}

export function clearSubmitted(): void {
  const s = store();
  for (const [id, session] of s.sessions) {
    if (session.submittedAt !== null && !session.connected) {
      s.sessions.delete(id);
      emit({ type: "session:remove", sessionId: id });
    }
  }
}

/* ── housekeeping ────────────────────────────────────────────────────────── */

function sweep(): void {
  const s = store();
  const now = Date.now();
  for (const [id, session] of s.sessions) {
    if (!session.connected && now - session.updatedAt > SESSION_TTL_MS) {
      s.sessions.delete(id);
      emit({ type: "session:remove", sessionId: id });
      continue;
    }
    const nextStatus: SessionStatus =
      session.submittedAt !== null
        ? "submitted"
        : now - session.updatedAt > IDLE_AFTER_MS
          ? "idle"
          : session.status;
    if (nextStatus !== session.status) {
      session.status = nextStatus;
      if (nextStatus === "idle") session.activeField = null;
      publish(session);
    }
  }
}
