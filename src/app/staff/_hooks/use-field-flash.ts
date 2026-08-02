"use client";

import { useEffect, useRef, useState } from "react";

import type { FieldKey } from "@/lib/patient-form";
import type { FieldValues } from "@/lib/realtime/protocol";

/** Slightly longer than the `flash` keyframe in globals.css so it never cuts off. */
const FLASH_MS = 1_200;

const NO_FLASH: ReadonlyMap<FieldKey, number> = new Map();

/**
 * Reports which fields changed since the previous update of a session.
 *
 * Returns a token per field rather than a plain set: a patient usually types
 * several characters into the same field while it is still flashing, and only a
 * fresh React `key` restarts a CSS animation that is already running. Consumers
 * render the highlight as `<span key={token} className="animate-flash" />`.
 */
export function useFieldFlash(
  sessionId: string | null,
  values: FieldValues,
): ReadonlyMap<FieldKey, number> {
  const [flashes, setFlashes] = useState<ReadonlyMap<FieldKey, number>>(NO_FLASH);
  const previous = useRef<{ sessionId: string | null; values: FieldValues }>({
    sessionId: null,
    values: {},
  });
  const timers = useRef(new Map<FieldKey, ReturnType<typeof setTimeout>>());
  const token = useRef(0);

  // One cleanup for the whole hook: no pending timeout outlives the component.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = { sessionId, values };

    // First sight of a session is a baseline, not thirteen simultaneous edits.
    if (before.sessionId !== sessionId) {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
      setFlashes((current) => (current.size === 0 ? current : NO_FLASH));
      return;
    }

    const keys = new Set<FieldKey>([
      ...(Object.keys(before.values) as FieldKey[]),
      ...(Object.keys(values) as FieldKey[]),
    ]);
    const changed: FieldKey[] = [];
    for (const key of keys) {
      if ((before.values[key] ?? "") !== (values[key] ?? "")) changed.push(key);
    }
    if (changed.length === 0) return;

    // Stamp outside the updater — StrictMode calls updaters twice.
    const stamped = changed.map((key) => {
      token.current += 1;
      return [key, token.current] as const;
    });
    setFlashes((current) => {
      const next = new Map(current);
      for (const [key, value] of stamped) next.set(key, value);
      return next;
    });

    for (const key of changed) {
      const running = timers.current.get(key);
      if (running) clearTimeout(running);
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          setFlashes((current) => {
            if (!current.has(key)) return current;
            const next = new Map(current);
            next.delete(key);
            return next;
          });
        }, FLASH_MS),
      );
    }
  }, [sessionId, values]);

  return flashes;
}
