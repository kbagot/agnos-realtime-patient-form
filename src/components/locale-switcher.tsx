"use client";

import { cn } from "@/components/ui";
import { LOCALES, LOCALE_NAMES, useLocale } from "@/lib/i18n/locale";

/**
 * Two languages, so a segmented control beats a dropdown: both options are
 * visible and it is one tap on a phone.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full border border-line bg-sunken p-0.5",
        className,
      )}
      role="group"
      aria-label="Language / ภาษา"
    >
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            lang={option}
            className={cn(
              "min-w-11 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-surface text-ink shadow-card"
                : "text-ink-faint hover:text-ink-soft",
            )}
          >
            {LOCALE_NAMES[option].label}
            <span className="sr-only"> — {LOCALE_NAMES[option].long}</span>
          </button>
        );
      })}
    </div>
  );
}
