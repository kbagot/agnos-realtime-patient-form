"use client";

/**
 * Owns the patient's session identity.
 *
 * sessionStorage (not localStorage) is deliberate: a refresh or an accidental
 * back-navigation keeps the same record on the staff board, but closing the tab
 * ends the visit — a shared waiting-room tablet must not hand the next patient
 * the previous one's draft.
 *
 * Modelled as an external store rather than state-in-an-effect: sessionStorage
 * *is* the source of truth, and useSyncExternalStore is the one hook that can
 * read it without either a hydration mismatch or a cascading render.
 */
import { useSyncExternalStore } from "react";
import { nanoid } from "nanoid";

/** Bump the suffix to invalidate identities from an older wire protocol. */
const STORAGE_KEY = "agnos:patient-session:v1";

function createId(): string {
  // randomUUID needs a secure context; nanoid keeps this working when the demo
  // is opened from a phone over plain http on a LAN address.
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : nanoid();
}

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, embedded webview) — fall back to memory only.
    return null;
  }
}

function writeStored(id: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Non-fatal: the id still lives in the module cache for this page view.
  }
}

let cachedId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Must be referentially stable between renders, hence the module-level cache. */
function getSnapshot(): string {
  if (cachedId) return cachedId;
  cachedId = readStored() ?? createId();
  writeStored(cachedId);
  return cachedId;
}

/** No identity exists server-side; the client fills it in after hydration. */
function getServerSnapshot(): null {
  return null;
}

function resetSessionId(): string {
  cachedId = createId();
  writeStored(cachedId);
  for (const listener of listeners) listener();
  return cachedId;
}

export interface PatientSessionHandle {
  /** `null` until the client has hydrated — nothing may be sent before then. */
  sessionId: string | null;
  /** Abandons the current record and returns the freshly minted id. */
  resetSessionId: () => string;
}

export function usePatientSession(): PatientSessionHandle {
  const sessionId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { sessionId, resetSessionId };
}
