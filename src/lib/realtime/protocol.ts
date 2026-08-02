/**
 * Wire protocol shared by every transport (WebSocket in production, SSE fallback)
 * and by both clients. Adding a message type here is the only way to add one.
 */
import type { FieldKey, PatientForm } from "@/lib/patient-form";

/** What the staff view shows as the patient's live activity. */
export type SessionStatus = "typing" | "idle" | "submitted";

export type FieldValues = Partial<Record<FieldKey, string>>;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export interface PatientSession {
  id: string;
  /** Short human-readable handle, e.g. "PT-4F9C" — staff refer to this. */
  reference: string;
  status: SessionStatus;
  /** True while at least one socket for this session is connected. */
  connected: boolean;
  values: FieldValues;
  /** Client-side validation errors, mirrored so staff see blocking problems live. */
  errors: FieldErrors;
  /** Field the patient is editing right now (null when they left the form). */
  activeField: FieldKey | null;
  /** 0..1 over required fields. */
  completion: number;
  createdAt: number;
  updatedAt: number;
  submittedAt: number | null;
}

/* ── client → server ─────────────────────────────────────────────────────── */

export type ClientMessage =
  | { type: "patient:join"; sessionId: string }
  | {
      type: "patient:update";
      sessionId: string;
      values: FieldValues;
      errors: FieldErrors;
      activeField: FieldKey | null;
    }
  | { type: "patient:blur"; sessionId: string }
  | { type: "patient:submit"; sessionId: string; values: PatientForm }
  | { type: "patient:reset"; sessionId: string }
  | { type: "staff:join" }
  | { type: "staff:clear-submitted" }
  | { type: "ping" };

/* ── server → client ─────────────────────────────────────────────────────── */

export type ServerMessage =
  | { type: "snapshot"; sessions: PatientSession[]; serverTime: number }
  | { type: "session:upsert"; session: PatientSession; serverTime: number }
  | { type: "session:remove"; sessionId: string }
  | { type: "pong"; serverTime: number };

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

/** Patient is considered idle after this long without a keystroke. */
export const IDLE_AFTER_MS = 8_000;
/** Sessions with no socket and no activity are dropped after this long. */
export const SESSION_TTL_MS = 30 * 60_000;
/** Patient form coalesces keystrokes into at most one message per interval. */
export const UPDATE_THROTTLE_MS = 120;

function isSession(value: unknown): value is PatientSession {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PatientSession>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.reference === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.values === "object" &&
    candidate.values !== null
  );
}

/**
 * Guards the reducer against a truncated or foreign frame: a `snapshot` whose
 * payload is not an array of sessions would otherwise put `undefined` into the
 * list and crash the board on the next render.
 */
export function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as { type?: unknown; sessions?: unknown; session?: unknown; sessionId?: unknown };
  switch (message.type) {
    case "snapshot":
      return Array.isArray(message.sessions) && message.sessions.every(isSession);
    case "session:upsert":
      return isSession(message.session);
    case "session:remove":
      return typeof message.sessionId === "string";
    case "pong":
      return true;
    default:
      return false;
  }
}
