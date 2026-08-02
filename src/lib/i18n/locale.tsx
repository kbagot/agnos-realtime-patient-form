"use client";

/**
 * Two-language support without a routing library: the assignment is a demo, and
 * locale-prefixed routes would buy nothing here. The trade-off is deliberate —
 * see docs/development-planning.md.
 *
 * Copy lives in a dictionary per route (`_i18n.ts` beside the route) plus the
 * shared one in this folder, so a route owns its own strings the same way it
 * owns its components.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, { label: string; long: string }> = {
  en: { label: "EN", long: "English" },
  th: { label: "ไทย", long: "ภาษาไทย" },
};

const STORAGE_KEY = "agnos.locale.v1";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "th";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always start at "en" so the client's first render matches the server HTML;
  // the stored choice is applied in an effect to avoid a hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      return;
    }
    if (window.navigator.language.toLowerCase().startsWith("th")) setLocaleState("th");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

/** Pick the active language out of a `Record<Locale, T>` copy table. */
export function useCopy<T>(table: Record<Locale, T>): T {
  const { locale } = useLocale();
  return table[locale];
}
