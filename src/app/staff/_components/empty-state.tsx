"use client";

import Link from "next/link";
import { ArrowRight, MonitorSmartphone } from "lucide-react";

import { STAFF_COPY } from "@/app/staff/_i18n";
import { buttonStyles, cn } from "@/components/ui";
import { useCopy } from "@/lib/i18n/locale";

/** Shown when the board holds no sessions at all — the normal state at 07:00. */
export function EmptyState({ className }: { className?: string }) {
  const copy = useCopy(STAFF_COPY);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center animate-rise sm:py-24",
        className,
      )}
    >
      <span
        className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand"
        aria-hidden
      >
        <MonitorSmartphone className="size-5" />
      </span>

      <h2 className="mt-5 text-base leading-relaxed font-semibold tracking-tight text-ink">
        {copy.empty.title}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{copy.empty.body}</p>

      <Link
        href="/patient"
        target="_blank"
        rel="noopener"
        className={cn(buttonStyles.secondary, "mt-6")}
      >
        {copy.empty.cta}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">{copy.empty.note}</p>
    </div>
  );
}
