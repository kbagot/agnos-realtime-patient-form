/**
 * Defensive parsing and application of ClientMessage frames.
 *
 * Both transports funnel through here — the WebSocket server and the SSE
 * fallback's POST channel — so a malformed frame is rejected identically and a
 * valid frame produces exactly the same store mutation whichever pipe it
 * arrived on. Anything that reaches the store has already been narrowed to the
 * protocol's own types; nothing here trusts the wire.
 */
import { FIELD_BY_KEY, patientFormSchema, type FieldKey } from "@/lib/patient-form";
import type { ClientMessage, ServerMessage } from "@/lib/realtime/protocol";
import {
  blurSession,
  clearSubmitted,
  joinPatient,
  resetSession,
  snapshot,
  submitSession,
  updateSession,
} from "@/server/session-store";

/** Session ids are nanoid-sized; anything longer is an attempt to grow the map. */
const MAX_SESSION_ID_CHARS = 64;
/** Comfortably above the longest field (address, 240) without letting a peer stream megabytes. */
const MAX_FIELD_CHARS = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_SESSION_ID_CHARS ? trimmed : null;
}

function asFieldKey(value: unknown): FieldKey | null {
  return typeof value === "string" && value in FIELD_BY_KEY ? (value as FieldKey) : null;
}

/**
 * Unknown keys are dropped rather than rejected: a staff view running an older
 * bundle must not be able to poison the store, but a patient on a newer one
 * should still get their known fields mirrored.
 */
function asFieldMap(value: unknown): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  if (!isRecord(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    const field = asFieldKey(key);
    if (field && typeof entry === "string") out[field] = entry.slice(0, MAX_FIELD_CHARS);
  }
  return out;
}

/** Returns null for anything that is not a well-formed ClientMessage. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!isRecord(raw)) return null;

  switch (raw.type) {
    case "patient:join": {
      const sessionId = asSessionId(raw.sessionId);
      return sessionId === null ? null : { type: "patient:join", sessionId };
    }
    case "patient:update": {
      const sessionId = asSessionId(raw.sessionId);
      if (sessionId === null) return null;
      return {
        type: "patient:update",
        sessionId,
        values: asFieldMap(raw.values),
        errors: asFieldMap(raw.errors),
        activeField: asFieldKey(raw.activeField),
      };
    }
    case "patient:blur": {
      const sessionId = asSessionId(raw.sessionId);
      return sessionId === null ? null : { type: "patient:blur", sessionId };
    }
    case "patient:submit": {
      const sessionId = asSessionId(raw.sessionId);
      if (sessionId === null) return null;
      // Submission is the one irreversible step, so it is re-validated
      // server-side instead of trusting the client's own zod run.
      const parsed = patientFormSchema.safeParse(raw.values);
      return parsed.success ? { type: "patient:submit", sessionId, values: parsed.data } : null;
    }
    case "patient:reset": {
      const sessionId = asSessionId(raw.sessionId);
      return sessionId === null ? null : { type: "patient:reset", sessionId };
    }
    case "staff:join":
      return { type: "staff:join" };
    case "staff:clear-submitted":
      return { type: "staff:clear-submitted" };
    case "ping":
      return { type: "ping" };
    default:
      return null;
  }
}

/**
 * Applies a message to the store. Broadcasts happen inside the store; the
 * return value is the direct reply owed to *this* sender only (or null).
 */
export function applyClientMessage(message: ClientMessage): ServerMessage | null {
  switch (message.type) {
    case "patient:join":
      joinPatient(message.sessionId);
      return null;
    case "patient:update":
      updateSession(message.sessionId, {
        values: message.values,
        errors: message.errors,
        activeField: message.activeField,
      });
      return null;
    case "patient:blur":
      blurSession(message.sessionId);
      return null;
    case "patient:submit":
      submitSession(message.sessionId, message.values);
      return null;
    case "patient:reset":
      resetSession(message.sessionId);
      return null;
    case "staff:join":
      return snapshot();
    case "staff:clear-submitted":
      clearSubmitted();
      return null;
    case "ping":
      return { type: "pong", serverTime: Date.now() };
  }
}

export { asSessionId };
