"use client";

import { HeartPulse } from "lucide-react";

import { bodyLeading, latinTracking, PATIENT_COPY } from "@/app/patient/_i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { cn } from "@/components/ui";
import { useCopy, useLocale } from "@/lib/i18n/locale";

/**
 * Client only because the heading is translated; the page around it stays a
 * server component so the route keeps its static metadata.
 */
export function PatientHeader() {
  const { locale } = useLocale();
  const copy = useCopy(PATIENT_COPY);

  return (
    <header className="mb-6 lg:mb-8">
      <div className="flex items-start justify-between gap-4">
        <p
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold text-brand uppercase",
            latinTracking(locale, "tracking-[0.18em]"),
          )}
        >
          <HeartPulse className="size-3.5 shrink-0" aria-hidden />
          {copy.eyebrow}
        </p>
        {/* Both labels always render, so the control keeps one width and the
            header does not reflow when the language changes. */}
        <LocaleSwitcher />
      </div>

      <h1
        className={cn(
          "mt-3 text-2xl leading-snug font-semibold text-ink sm:text-3xl",
          latinTracking(locale, "tracking-tight"),
        )}
      >
        {copy.title}
      </h1>
      <p className={cn("mt-2 max-w-2xl text-sm text-ink-soft", bodyLeading(locale))}>{copy.intro}</p>
    </header>
  );
}
