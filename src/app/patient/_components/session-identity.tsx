"use client";

/**
 * The patient's side of the live link: who they are on the board, how much is
 * left, and the fact that staff can already read along.
 */
import { useState } from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";

import { Card, CompletionBar, ConnectionBadge, buttonStyles, cn } from "@/components/ui";
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
  const [confirming, setConfirming] = useState(false);

  return (
    <Card as="aside" className={cn("animate-rise p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            Your reference
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-tight text-ink tabular-nums">
            {reference ?? "—"}
          </p>
        </div>
        <ConnectionBadge state={connection} transport={transport} className="shrink-0" />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-ink-soft">Required fields completed</p>
        <CompletionBar value={completion} label="Form completion" />
      </div>

      <p className="mt-5 flex gap-2.5 rounded-field bg-brand-soft px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>
          Your details are visible to the care team as you type, so you can pause at any point and
          someone will pick up where you left off.
        </span>
      </p>

      {confirming ? (
        <div className="mt-4 rounded-field border border-line bg-sunken p-3">
          <p className="text-xs leading-relaxed text-ink-soft">
            Clear every answer and start a new record? The care team will stop seeing this one.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onReset();
              }}
              className={cn(
                buttonStyles.secondary,
                "h-11 flex-1 border-danger/40 px-3 text-xs text-danger hover:bg-danger-soft",
              )}
            >
              Yes, start over
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={cn(buttonStyles.ghost, "h-11 flex-1 text-xs")}
            >
              Keep my answers
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={cn(buttonStyles.ghost, "mt-4 h-11 w-full justify-start px-3")}
        >
          <RotateCcw className="size-4" aria-hidden />
          Start over
        </button>
      )}
    </Card>
  );
}
