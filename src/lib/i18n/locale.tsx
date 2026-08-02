"use client";

/**
 * Two-language support without a routing library: the assignment is a demo, and
 * locale-prefixed routes would buy nothing here. The trade-off is deliberate —
 * see docs/development-planning.md.
 *
 * Copy lives in a dictionary per route (`_i18n.ts` beside the route) plus the
 * shared one in this folder, so a route owns its own strings the same way it
 * owns its components.
 *
 * The choice is an external store rather than component state: it is read from
 * `localStorage`, shared by every screen, and must render as English on the
 * server. `useSyncExternalStore` is exactly that contract, and it keeps
 * hydration honest without a "did I mount yet" flag.
 */
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, { label: string; long: string }> = {
  en: { label: "EN", long: "English" },
  th: { label: "ไทย", long: "ภาษาไทย" },
};

const STORAGE_KEY = "agnos.locale.v1";

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "th";
}

let current: Locale | null = null;
const listeners = new Set<() => void>();

function readLocale(): Locale {
  if (current) return current;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  current = isLocale(stored)
    ? stored
    : window.navigator.language.toLowerCase().startsWith("th")
      ? "th"
      : "en";
  return current;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep two tabs of the same demo in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !isLocale(event.newValue)) return;
    current = event.newValue;
    for (const listener of listeners) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The server has no browser preference to read, so it always renders English. */
function serverSnapshot(): Locale {
  return "en";
}

export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const locale = useSyncExternalStore(subscribe, readLocale, serverSnapshot);

  const setLocale = useCallback((next: Locale) => {
    if (next === current) return;
    current = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    for (const listener of listeners) listener();
  }, []);

  return { locale, setLocale };
}

/** Pick the active language out of a `Record<Locale, T>` copy table. */
export function useCopy<T>(table: Record<Locale, T>): T {
  const { locale } = useLocale();
  return table[locale];
}

/** Keeps `<html lang>` truthful for screen readers and Thai line breaking. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return children;
}
