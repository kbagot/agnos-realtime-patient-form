import Link from "next/link";
import { ArrowRight, MonitorSmartphone } from "lucide-react";

import { buttonStyles, cn } from "@/components/ui";

/** Shown when the board holds no sessions at all — the normal state at 07:00. */
export function EmptyState({ className }: { className?: string }) {
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

      <h2 className="mt-5 text-base font-semibold tracking-tight text-ink">
        No patients on the board
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        A record appears here the moment a patient opens the intake form, and every keystroke
        they type shows up live. Nothing to refresh — leave this screen up.
      </p>

      <Link
        href="/patient"
        target="_blank"
        rel="noopener"
        className={cn(buttonStyles.secondary, "mt-6")}
      >
        Open the patient form
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      <p className="mt-3 text-xs text-ink-faint">
        Opens in a new tab so you can watch both screens side by side.
      </p>
    </div>
  );
}
