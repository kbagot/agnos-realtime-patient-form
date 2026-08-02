/**
 * Shared primitives for both interfaces. Small on purpose: enough to keep the
 * patient form and the staff board visually identical, not a component library.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReactNode } from "react";

import type { ConnectionState, SessionStatus } from "@/lib/realtime/protocol";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ── status vocabulary ───────────────────────────────────────────────────── */

export const STATUS_COPY: Record<SessionStatus, { label: string; help: string }> = {
  typing: { label: "Filling in", help: "Patient is actively typing" },
  idle: { label: "Inactive", help: "No input for a few seconds" },
  submitted: { label: "Submitted", help: "Form submitted by the patient" },
};

const STATUS_CLASS: Record<SessionStatus, string> = {
  typing: "bg-live-soft text-live border-live/25",
  idle: "bg-idle-soft text-idle border-idle/30",
  submitted: "bg-done-soft text-done border-done/25",
};

const DOT_CLASS: Record<SessionStatus, string> = {
  typing: "bg-live animate-pulse-live",
  idle: "bg-idle",
  submitted: "bg-done",
};

export function StatusPill({
  status,
  className,
  compact = false,
}: {
  status: SessionStatus;
  className?: string;
  compact?: boolean;
}) {
  const copy = STATUS_COPY[status];
  return (
    <span
      title={copy.help}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        STATUS_CLASS[status],
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[status])} aria-hidden />
      {copy.label}
      <span className="sr-only">. {copy.help}</span>
    </span>
  );
}

/* ── connection badge ────────────────────────────────────────────────────── */

const CONNECTION_COPY: Record<ConnectionState, { label: string; dot: string; tone: string }> = {
  connecting: { label: "Connecting", dot: "bg-idle animate-pulse-live", tone: "text-ink-soft" },
  open: { label: "Live", dot: "bg-live animate-pulse-live", tone: "text-ink-soft" },
  reconnecting: { label: "Reconnecting", dot: "bg-idle animate-pulse-live", tone: "text-idle" },
  closed: { label: "Offline", dot: "bg-danger", tone: "text-danger" },
};

export function ConnectionBadge({
  state,
  transport,
  className,
}: {
  state: ConnectionState;
  transport?: "websocket" | "sse";
  className?: string;
}) {
  const copy = CONNECTION_COPY[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium",
        copy.tone,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn("size-1.5 rounded-full", copy.dot)} aria-hidden />
      {copy.label}
      {transport ? (
        <span className="hidden font-mono text-[10px] tracking-tight text-ink-faint uppercase sm:inline">
          {transport === "websocket" ? "ws" : "sse"}
        </span>
      ) : null}
    </span>
  );
}

/* ── layout ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  hint,
  right,
  className,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
      </div>
      {right}
    </div>
  );
}

/* ── progress ────────────────────────────────────────────────────────────── */

export function CompletionBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Completion"}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            pct === 100 ? "bg-live" : "bg-brand",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-[11px] text-ink-faint tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

/* ── buttons ─────────────────────────────────────────────────────────────── */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-field text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export const buttonStyles = {
  primary: cn(
    BUTTON_BASE,
    "h-11 px-5 bg-brand text-on-brand hover:bg-brand-strong active:bg-brand-strong",
  ),
  secondary: cn(
    BUTTON_BASE,
    "h-11 px-5 border border-line-strong bg-surface text-ink hover:bg-sunken",
  ),
  ghost: cn(
    BUTTON_BASE,
    "h-9 px-3 text-ink-soft hover:bg-sunken hover:text-ink",
  ),
} as const;

/* ── misc ────────────────────────────────────────────────────────────────── */

export function relativeTime(from: number, now: number): string {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}
