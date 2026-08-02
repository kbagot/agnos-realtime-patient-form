"use client";

import { ChevronRight, TriangleAlert, WifiOff } from "lucide-react";

import { STAFF_COPY, relativeTime } from "@/app/staff/_i18n";
import { CompletionBar, StatusPill, cn } from "@/components/ui";
import { COMMON_COPY } from "@/lib/i18n/common";
import { useCopy, useLocale } from "@/lib/i18n/locale";
import type { PatientSession } from "@/lib/realtime/protocol";

/** Exactly the fields `patientName` renders — the caret must not fire for a
 *  field this card never shows. */
const NAME_FIELDS = ["firstName", "lastName"] as const;

/** First + last as typed so far; empty until the patient starts. */
function patientName(session: PatientSession): string {
  return [session.values.firstName, session.values.lastName]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

export function SessionCard({
  session,
  selected,
  now,
  optionId,
  onSelect,
}: {
  session: PatientSession;
  selected: boolean;
  /** Shared board clock, so every card ages on the same tick. */
  now: number;
  optionId: string;
  onSelect: (sessionId: string) => void;
}) {
  const { locale } = useLocale();
  const copy = useCopy(STAFF_COPY);
  const status = COMMON_COPY[locale].status[session.status];

  const name = patientName(session);
  const issues = Object.keys(session.errors).length;
  const typingName =
    session.status === "typing" &&
    session.activeField !== null &&
    (NAME_FIELDS as readonly string[]).includes(session.activeField);

  return (
    <li
      id={optionId}
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(session.id)}
      className={cn(
        "group relative cursor-pointer rounded-card border px-3.5 py-3 transition-colors",
        selected
          ? "border-brand-ring bg-brand-soft"
          : "border-line bg-surface hover:border-line-strong hover:bg-sunken",
      )}
    >
      {selected ? (
        <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-brand" aria-hidden />
      ) : null}

      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-medium tracking-wider text-ink-faint tabular-nums">
          {session.reference}
        </span>
        <StatusPill
          status={session.status}
          label={status.label}
          help={status.help}
          compact
          className="ml-auto"
        />
        <ChevronRight className="size-4 shrink-0 text-ink-faint lg:hidden" aria-hidden />
      </div>

      <p
        className={cn(
          "mt-1.5 truncate text-[15px] font-semibold tracking-tight",
          // Thai stacks vowels and tone marks above and below the baseline, so
          // it needs the extra leading and must not be tracked in.
          locale === "th" ? "leading-normal tracking-normal" : "leading-snug",
          name ? "text-ink" : "text-ink-faint italic",
        )}
      >
        {name || copy.awaitingName}
        {typingName ? (
          <span
            className="ml-1 inline-block h-3.5 w-0.5 translate-y-0.5 bg-live animate-pulse-live"
            aria-hidden
          />
        ) : null}
      </p>

      <CompletionBar
        value={session.completion}
        className="mt-2.5"
        label={copy.aria.completion(session.reference)}
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
        <span className="tabular-nums">{relativeTime(copy, session.updatedAt, now)}</span>

        {!session.connected ? (
          <span className="inline-flex items-center gap-1 text-ink-soft">
            <WifiOff className="size-3" aria-hidden />
            {copy.disconnected}
          </span>
        ) : null}

        {issues > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium text-danger">
            <TriangleAlert className="size-3" aria-hidden />
            {copy.issues(issues)}
          </span>
        ) : null}
      </div>
    </li>
  );
}
