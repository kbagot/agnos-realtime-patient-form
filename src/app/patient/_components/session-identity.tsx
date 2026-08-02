"use client";

/**
 * The patient's side of the live link: who they are on the board, how much is
 * left, and the fact that staff can already read along.
 */
import { useState } from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";

import { bodyLeading, latinTracking, PATIENT_COPY } from "@/app/patient/_i18n";
import { Card, CompletionBar, ConnectionBadge, buttonStyles, cn } from "@/components/ui";
import { COMMON_COPY } from "@/lib/i18n/common";
import { useCopy, useLocale } from "@/lib/i18n/locale";
import type { ConnectionState } from "@/lib/realtime/protocol";

export interface SessionIdentityProps {
  reference: string | null;
  connection: ConnectionState;
  transport: "websocket" | "sse";
  completion: number;
  onReset: () => void;
  className?: string;
}

export function SessionIdentity({
  reference,
  connection,
  transport,
  completion,
  onReset,
  className,
}: SessionIdentityProps) {
  const { locale } = useLocale();
  const copy = useCopy(PATIENT_COPY);
  const [confirming, setConfirming] = useState(false);

  return (
    <Card as="aside" className={cn("animate-rise p-5", className)}>
      {/* Wraps rather than shrinks: the Thai connection labels are long and this
          card is only 288px wide on a 320px phone. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] font-semibold text-ink-faint uppercase",
              latinTracking(locale, "tracking-[0.14em]"),
            )}
          >
            {copy.referenceLabel}
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-tight text-ink tabular-nums">
            {reference ?? "—"}
          </p>
        </div>
        <ConnectionBadge
          state={connection}
          label={COMMON_COPY[locale].connection[connection]}
          transport={transport}
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs leading-relaxed font-medium text-ink-soft">
          {copy.completionLabel}
        </p>
        <CompletionBar value={completion} label={copy.completionAria} />
      </div>

      <p
        className={cn(
          "mt-5 flex gap-2.5 rounded-field bg-brand-soft px-3 py-2.5 text-xs text-ink-soft",
          bodyLeading(locale),
        )}
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>{copy.reassurance}</span>
      </p>

      {confirming ? (
        <div className="mt-4 rounded-field border border-line bg-sunken p-3">
          <p className={cn("text-xs text-ink-soft", bodyLeading(locale))}>{copy.resetPrompt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onReset();
              }}
              className={cn(
                buttonStyles.secondary,
                // h-auto + min-h keeps the 44px target while letting Thai wrap.
                "h-auto min-h-11 flex-1 border-danger/40 px-3 py-2 text-xs leading-relaxed text-danger hover:bg-danger-soft",
              )}
            >
              {copy.resetConfirm}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={cn(
                buttonStyles.ghost,
                "h-auto min-h-11 flex-1 px-3 py-2 text-xs leading-relaxed",
              )}
            >
              {copy.resetCancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={cn(buttonStyles.ghost, "mt-4 h-11 w-full justify-start px-3")}
        >
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          {copy.startOver}
        </button>
      )}
    </Card>
  );
}
