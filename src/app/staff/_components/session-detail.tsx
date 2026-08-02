"use client";

import { useState } from "react";
import { ChevronLeft, Eye, EyeOff, ShieldCheck, TriangleAlert, WifiOff } from "lucide-react";

import { useFieldFlash } from "@/app/staff/_hooks/use-field-flash";
import { STAFF_COPY, relativeTime, type StaffCopy } from "@/app/staff/_i18n";
import { CompletionBar, SectionHeading, StatusPill, cn } from "@/components/ui";
import { COMMON_COPY, formatValue, translateError } from "@/lib/i18n/common";
import { useCopy, useLocale, type Locale } from "@/lib/i18n/locale";
import { FIELDS, FIELD_GROUPS, type FieldMeta } from "@/lib/patient-form";
import type { PatientSession } from "@/lib/realtime/protocol";

/** Fixed-ish dot run: never leaks the real length of a phone number or address. */
function mask(value: string): string {
  const length = Math.min(Math.max(value.trim().length, 6), 14);
  return "•".repeat(length);
}

function fullName(session: PatientSession): string {
  return [session.values.firstName, session.values.middleName, session.values.lastName]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

function FieldRow({
  field,
  session,
  revealed,
  flashToken,
  locale,
  copy,
}: {
  field: FieldMeta;
  session: PatientSession;
  revealed: boolean;
  flashToken: number | undefined;
  locale: Locale;
  copy: StaffCopy;
}) {
  const common = COMMON_COPY[locale];
  const raw = (session.values[field.key] ?? "").trim();
  const error = translateError(locale, session.errors[field.key]);
  const editing = session.activeField === field.key && session.status === "typing";
  const hidden = field.sensitive && !revealed && raw.length > 0;
  const display = hidden ? mask(raw) : formatValue(locale, field.key, raw);

  return (
    <div
      className={cn(
        "relative border-b border-line px-3.5 py-2.5 last:border-b-0",
        editing && "rounded-field ring-1 ring-live/50 ring-inset",
      )}
    >
      {/* Keyed so a second edit restarts the animation instead of ignoring it. */}
      {flashToken !== undefined ? (
        <span
          key={flashToken}
          className="pointer-events-none absolute inset-0 animate-flash"
          aria-hidden
        />
      ) : null}

      <div className="relative sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline sm:gap-4">
        <dt className="flex items-baseline gap-1 text-xs leading-relaxed font-medium text-ink-soft sm:text-[13px]">
          {common.fields[field.key]}
          {field.required ? (
            <>
              <span className="text-danger" aria-hidden>
                *
              </span>
              <span className="sr-only">({common.required})</span>
            </>
          ) : null}
        </dt>

        <dd className="mt-0.5 min-w-0 sm:mt-0">
          <span
            className={cn(
              "text-sm leading-relaxed break-words",
              raw.length > 0 ? "font-medium text-ink" : "text-ink-faint italic",
              hidden && "font-mono tracking-widest text-ink-soft",
            )}
          >
            {raw.length > 0 ? display : copy.notProvided}
          </span>
          {hidden ? <span className="sr-only"> — {copy.maskedForScreenReader}</span> : null}

          {editing ? (
            <>
              <span
                className="ml-1 inline-block h-4 w-0.5 translate-y-0.5 bg-live animate-pulse-live"
                aria-hidden
              />
              <span className="ml-2 align-middle text-[11px] font-medium text-live">
                {copy.editingNow}
              </span>
            </>
          ) : null}

          {error ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed font-medium text-danger">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </dd>
      </div>
    </div>
  );
}

export function SessionDetail({
  session,
  now,
  onBack,
}: {
  session: PatientSession;
  now: number;
  onBack: () => void;
}) {
  const { locale } = useLocale();
  const copy = useCopy(STAFF_COPY);
  const common = COMMON_COPY[locale];

  // Keyed by session id rather than reset in an effect: switching patient can
  // never leave the next record's contact details exposed.
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const revealed = revealedFor === session.id;

  const flashes = useFieldFlash(session.id, session.values);
  const status = common.status[session.status];
  const name = fullName(session);
  const issues = Object.keys(session.errors).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-line px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 rounded-field px-2 text-sm font-medium text-ink-soft hover:bg-sunken hover:text-ink lg:hidden"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {copy.backToList}
        </button>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-xs font-medium tracking-wider text-ink-faint tabular-nums">
            {session.reference}
          </span>
          <StatusPill status={session.status} label={status.label} help={status.help} />
          {!session.connected ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-xs font-medium text-ink-soft"
              title={copy.disconnectedHint}
            >
              <WifiOff className="size-3.5" aria-hidden />
              {copy.disconnected}
            </span>
          ) : null}
          {issues > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
              <TriangleAlert className="size-3.5" aria-hidden />
              {copy.validationIssues(issues)}
            </span>
          ) : null}
        </div>

        <h2
          className={cn(
            "mt-2 text-xl font-semibold tracking-tight sm:text-2xl",
            locale === "th" ? "leading-snug tracking-normal" : "leading-tight",
            name ? "text-ink" : "text-ink-faint italic",
          )}
        >
          {name || copy.awaitingName}
        </h2>

        <p className="mt-1 text-xs leading-relaxed text-ink-faint tabular-nums">
          {session.submittedAt !== null
            ? copy.submittedAt(relativeTime(copy, session.submittedAt, now))
            : copy.lastInput(relativeTime(copy, session.updatedAt, now))}
          {" · "}
          {copy.openedAt(relativeTime(copy, session.createdAt, now))}
        </p>

        <CompletionBar
          value={session.completion}
          className="mt-3 max-w-md"
          label={copy.aria.requiredComplete(session.reference)}
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={() => setRevealedFor(revealed ? null : session.id)}
            aria-pressed={revealed}
            className="inline-flex h-11 items-center gap-2 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink hover:bg-sunken lg:h-9"
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            {revealed ? copy.hide : copy.reveal}
          </button>
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
            <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
            <span className="max-w-xs">{copy.maskNote}</span>
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        {FIELD_GROUPS.map((group) => {
          const fields = FIELDS.filter((field) => field.group === group.id);
          if (fields.length === 0) return null;
          const groupCopy = common.groups[group.id];
          return (
            <section key={group.id} className="border-b border-line last:border-b-0">
              <SectionHeading
                title={groupCopy.title}
                hint={groupCopy.hint}
                // SectionHeading tightens its own h2; Thai must not be tracked in.
                className={cn(
                  "bg-sunken px-4 py-2.5 sm:px-5",
                  locale === "th" && "[&_h2]:tracking-normal",
                )}
              />
              <dl className="px-1 py-1 sm:px-1.5">
                {fields.map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    session={session}
                    revealed={revealed}
                    flashToken={flashes.get(field.key)}
                    locale={locale}
                    copy={copy}
                  />
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
