"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Activity, CloudOff, Stethoscope, Trash2 } from "lucide-react";

import { EmptyState } from "@/app/staff/_components/empty-state";
import { SessionCard } from "@/app/staff/_components/session-card";
import { SessionDetail } from "@/app/staff/_components/session-detail";
import { Card, ConnectionBadge, cn } from "@/components/ui";
import type { ClientMessage, PatientSession } from "@/lib/realtime/protocol";
import { useRealtime } from "@/lib/realtime/use-realtime";

/** Replayed on every (re)connect so a dropped socket re-subscribes itself. */
const STAFF_JOIN: ClientMessage = { type: "staff:join" };

type Filter = "all" | "typing" | "submitted";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "typing", label: "Filling in" },
  { value: "submitted", label: "Submitted" },
];

/* ── header pieces ───────────────────────────────────────────────────────── */

/**
 * Two shapes, one tile: label beside the count on a phone (two per row, so the
 * word "Filling in" is never clipped), label above the count from `sm` up where
 * four fit across.
 */
function StatTile({
  label,
  value,
  dot,
  tone,
}: {
  label: string;
  value: number;
  dot?: string;
  tone?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-field border border-line bg-surface px-2.5 py-2 sm:flex-col sm:items-start sm:gap-0 sm:py-1.5">
      <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold tracking-wider text-ink-faint uppercase">
        {dot ? <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden /> : null}
        {label}
      </span>
      {/* Remounting on change replays `rise`, so the number visibly ticks over. */}
      <span
        key={value}
        className={cn(
          "ml-auto animate-rise font-mono text-base leading-none font-semibold tabular-nums sm:ml-0 sm:text-lg sm:leading-tight",
          tone ?? "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ClearSubmittedButton({
  disabled,
  onClick,
  className,
}: {
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Remove submitted records whose patient has closed the form"
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-45 lg:h-9",
        className,
      )}
    >
      <Trash2 className="size-4" aria-hidden />
      <span className="hidden lg:inline">Clear submitted</span>
      <span className="sr-only lg:hidden">Clear submitted</span>
    </button>
  );
}

/* ── board ───────────────────────────────────────────────────────────────── */

export function StaffBoard() {
  const { sessions, connection, transport, send } = useRealtime({ onReconnect: STAFF_JOIN });

  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // One clock for the whole board — 30 cards must not mean 30 intervals.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    let typing = 0;
    let idle = 0;
    let submitted = 0;
    for (const session of sessions) {
      if (session.status === "typing") typing += 1;
      else if (session.status === "idle") idle += 1;
      else submitted += 1;
    }
    return { total: sessions.length, typing, idle, submitted };
  }, [sessions]);

  const visible = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((s) => s.status === filter)),
    [sessions, filter],
  );

  // Derived, not stored: the list re-sorts on every keystroke and selection has
  // to survive that. Falling back to the head also gives us auto-select.
  const selected: PatientSession | null =
    visible.find((session) => session.id === selectedId) ?? visible[0] ?? null;

  /* Announce arrivals, submissions and drop-outs — not typing/idle churn, which
     would make a screen reader unusable at a busy desk. Written straight into
     the live region: the announcement is output for assistive tech, not state
     the board renders from, and setState here would re-render on every frame. */
  const liveRegion = useRef<HTMLParagraphElement>(null);
  const seen = useRef(new Map<string, { submitted: boolean; connected: boolean }>());
  const primed = useRef(false);
  useEffect(() => {
    const previous = seen.current;
    const messages: string[] = [];
    const next = new Map<string, { submitted: boolean; connected: boolean }>();

    for (const session of sessions) {
      const state = { submitted: session.submittedAt !== null, connected: session.connected };
      next.set(session.id, state);
      const before = previous.get(session.id);
      if (!before) {
        if (primed.current) messages.push(`${session.reference} started a form`);
        continue;
      }
      if (!before.submitted && state.submitted) messages.push(`${session.reference} submitted`);
      else if (before.connected && !state.connected) {
        messages.push(`${session.reference} disconnected`);
      }
    }

    seen.current = next;
    primed.current = true;
    if (messages.length > 0 && liveRegion.current) {
      liveRegion.current.textContent = messages.join(". ");
    }
  }, [sessions]);

  function select(sessionId: string): void {
    setSelectedId(sessionId);
    setDetailOpen(true);
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
    if (visible.length === 0) return;
    const current = Math.max(
      0,
      visible.findIndex((session) => session.id === selected?.id),
    );
    let next = current;

    if (event.key === "ArrowDown") next = Math.min(current + 1, visible.length - 1);
    else if (event.key === "ArrowUp") next = Math.max(current - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visible.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDetailOpen(true);
      return;
    } else return;

    event.preventDefault();
    const target = visible[next];
    if (!target) return;
    setSelectedId(target.id);
    // aria-activedescendant moves no real focus, so nothing scrolls the option
    // into view for us. The node is already mounted, so do it now.
    document.getElementById(`session-option-${target.id}`)?.scrollIntoView({ block: "nearest" });
  }

  const degraded = connection === "reconnecting" || connection === "closed";

  return (
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">
      <p ref={liveRegion} aria-live="polite" role="status" className="sr-only" />

      <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-canvas/85 backdrop-blur lg:static">
        <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-center gap-3">
            <span
              className="hidden size-9 shrink-0 items-center justify-center rounded-field bg-brand-soft text-brand sm:flex"
              aria-hidden
            >
              <Stethoscope className="size-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base leading-tight font-semibold tracking-tight text-ink sm:text-lg">
                Intake board
              </h1>
              {/* Below sm there is no room for a subtitle that is not clipped. */}
              <p className="hidden truncate text-xs text-ink-faint sm:block">
                Patient registration, live as it is typed
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
              <ConnectionBadge state={connection} transport={transport} />
              <ClearSubmittedButton
                disabled={counts.submitted === 0}
                onClick={() => send({ type: "staff:clear-submitted" })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="grid flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex lg:flex-none">
              <StatTile label="Total" value={counts.total} />
              <StatTile
                label="Filling in"
                value={counts.typing}
                dot="bg-live animate-pulse-live"
                tone="text-live"
              />
              <StatTile label="Inactive" value={counts.idle} dot="bg-idle" tone="text-idle" />
              <StatTile
                label="Submitted"
                value={counts.submitted}
                dot="bg-done"
                tone="text-done"
              />
            </div>

            <ConnectionBadge
              state={connection}
              transport={transport}
              className="hidden lg:inline-flex"
            />

            <ClearSubmittedButton
              disabled={counts.submitted === 0}
              onClick={() => send({ type: "staff:clear-submitted" })}
              className="hidden lg:inline-flex"
            />
          </div>
        </div>

        {degraded ? (
          <div
            role="alert"
            className="flex items-center gap-2 border-t border-danger/25 bg-danger-soft px-4 py-2 text-xs font-medium text-danger sm:px-6"
          >
            <CloudOff className="size-4 shrink-0" aria-hidden />
            {connection === "reconnecting"
              ? "Reconnecting to the intake service — what you see may be a few seconds stale."
              : "Disconnected from the intake service. This board is frozen until the connection returns."}
          </div>
        ) : null}
      </header>

      {sessions.length === 0 ? (
        <main className="mx-auto flex w-full max-w-[110rem] flex-1 items-center justify-center px-4 sm:px-6">
          <Card className="w-full max-w-xl">
            <EmptyState />
          </Card>
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-[110rem] flex-1 flex-col gap-4 px-4 pt-4 pb-6 sm:px-6 lg:min-h-0 lg:flex-row lg:gap-5 lg:overflow-hidden lg:py-5">
          {/* list pane */}
          <section
            aria-label="Patient sessions"
            className={cn(
              "flex-col lg:flex lg:min-h-0 lg:w-[23rem] lg:shrink-0 xl:w-[25rem]",
              detailOpen ? "hidden" : "flex",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div
                role="radiogroup"
                aria-label="Filter by status"
                className="inline-flex rounded-field border border-line bg-sunken p-0.5"
              >
                {FILTERS.map((option) => {
                  const active = filter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFilter(option.value)}
                      className={cn(
                        "h-10 rounded-lg px-3 text-xs font-semibold transition-colors lg:h-8",
                        active
                          ? "bg-surface text-ink shadow-card"
                          : "text-ink-soft hover:text-ink",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <span className="shrink-0 font-mono text-[11px] text-ink-faint tabular-nums">
                {visible.length}/{sessions.length}
              </span>
            </div>

            {visible.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
                No patients match this filter right now.
              </p>
            ) : (
              <ul
                role="listbox"
                aria-label="Patient sessions"
                aria-activedescendant={selected ? `session-option-${selected.id}` : undefined}
                tabIndex={0}
                onKeyDown={onListKeyDown}
                className="flex flex-col gap-2 rounded-card lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
              >
                {visible.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    selected={selected?.id === session.id}
                    now={now}
                    optionId={`session-option-${session.id}`}
                    onSelect={select}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* detail pane */}
          <section
            aria-label="Patient record"
            className={cn(
              "flex-1 lg:flex lg:min-h-0",
              detailOpen ? "flex" : "hidden lg:flex",
            )}
          >
            {selected ? (
              <Card className="flex w-full min-h-0 flex-col overflow-hidden">
                <SessionDetail
                  session={selected}
                  now={now}
                  onBack={() => setDetailOpen(false)}
                />
              </Card>
            ) : (
              <Card className="flex w-full items-center justify-center p-10 text-center">
                <p className="flex items-center gap-2 text-sm text-ink-faint">
                  <Activity className="size-4" aria-hidden />
                  Select a patient to see every field they have entered.
                </p>
              </Card>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
