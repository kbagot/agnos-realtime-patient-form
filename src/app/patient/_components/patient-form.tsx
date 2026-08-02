"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleAlert,
  CircleCheckBig,
  Globe,
  HeartPulse,
  Pencil,
  Phone,
  Send,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { FieldControl } from "@/app/patient/_components/field-control";
import { SessionIdentity } from "@/app/patient/_components/session-identity";
import { Card, CompletionBar, SectionHeading, buttonStyles, cn } from "@/components/ui";
import {
  completionRatio,
  EMPTY_PATIENT_FORM,
  FIELDS,
  FIELD_GROUPS,
  formatFieldValue,
  patientFormSchema,
  type FieldGroupId,
  type FieldKey,
  type PatientForm as PatientFormValues,
} from "@/lib/patient-form";
import {
  UPDATE_THROTTLE_MS,
  type ClientMessage,
  type FieldErrors,
  type FieldValues,
} from "@/lib/realtime/protocol";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { usePatientSession } from "@/app/patient/_hooks/use-patient-session";

const GROUP_ICON: Record<FieldGroupId, LucideIcon> = {
  identity: UserRound,
  contact: Phone,
  background: Globe,
  emergency: HeartPulse,
};

/** Static classes so Tailwind can see them; index-keyed stagger on entrance. */
const RISE_DELAY = ["", "[animation-delay:70ms]", "[animation-delay:140ms]", "[animation-delay:210ms]"];

const GROUPED_FIELDS = FIELD_GROUPS.map((group) => ({
  group,
  fields: FIELDS.filter((field) => field.group === group.id),
}));

const FIELD_KEYS = new Set<string>(FIELDS.map((field) => field.key));

function isFieldKey(value: string): value is FieldKey {
  return FIELD_KEYS.has(value);
}

function invalidMessage(count: number): string {
  return count === 1
    ? "1 field still needs your attention before we can submit."
    : `${count} fields still need your attention before we can submit.`;
}

export function PatientForm() {
  const { sessionId, resetSessionId } = usePatientSession();

  // useRealtime owns joining: it replays this on every (re)connect and, on the
  // SSE fallback, binds the stream itself to the session id — so the form never
  // sends patient:join itself, which would double-count the socket.
  const rejoin = useMemo<ClientMessage | undefined>(
    () => (sessionId ? { type: "patient:join", sessionId } : undefined),
    [sessionId],
  );
  const { sessions, connection, transport, send } = useRealtime({
    onReconnect: rejoin,
    enabled: sessionId !== null,
  });

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: EMPTY_PATIENT_FORM,
    // Don't shout at a patient mid-word; correct them the moment they've had a go.
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { control, register, handleSubmit, formState, reset, setFocus } = form;
  const { errors, submitCount } = formState;

  const watched = useWatch({ control, defaultValue: EMPTY_PATIENT_FORM });

  const values = useMemo<FieldValues>(() => {
    const out: FieldValues = {};
    for (const field of FIELDS) {
      const value = watched[field.key];
      if (typeof value === "string") out[field.key] = value;
    }
    return out;
  }, [watched]);

  const fieldErrors = useMemo<FieldErrors>(() => {
    const out: FieldErrors = {};
    for (const field of FIELDS) {
      const message = errors[field.key]?.message;
      if (message) out[field.key] = message;
    }
    return out;
  }, [errors]);

  const completion = completionRatio(values);
  const invalidCount = submitCount > 0 ? Object.keys(fieldErrors).length : 0;

  const [submitted, setSubmitted] = useState<PatientFormValues | null>(null);
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const reference = session?.reference ?? null;

  /* ── throttled outbound updates ────────────────────────────────────────── */

  const pendingRef = useRef<ClientMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef(0);
  const signatureRef = useRef<string | null>(null);
  const activeFieldRef = useRef<FieldKey | null>(null);
  const focusedRef = useRef(false);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      lastSentAtRef.current = Date.now();
      send(pending);
    }
    // A keystroke queued just before the patient walked away must not resurrect
    // "typing" on the board — re-assert the blur behind it.
    if (!focusedRef.current && sessionId) {
      send({ type: "patient:blur", sessionId });
    }
  }, [send, sessionId]);

  const schedule = useCallback(
    (message: ClientMessage) => {
      pendingRef.current = message;
      if (timerRef.current) return; // a flush is already queued: coalesce into it
      const wait = Math.max(0, UPDATE_THROTTLE_MS - (Date.now() - lastSentAtRef.current));
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush();
      }, wait);
    },
    [flush],
  );

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  // Intentionally un-keyed: the signature check is the dependency comparison, and
  // it is the only one that survives react-hook-form handing back fresh objects.
  useEffect(() => {
    if (!sessionId || submitted) return;
    const signature = JSON.stringify([sessionId, values, fieldErrors]);
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    schedule({
      type: "patient:update",
      sessionId,
      values,
      errors: fieldErrors,
      activeField: activeFieldRef.current,
    });
  });

  /* ── focus tracking ────────────────────────────────────────────────────── */

  function handleFocus(event: React.FocusEvent<HTMLFormElement>) {
    const name = event.target.getAttribute("name");
    const key = name && isFieldKey(name) ? name : null;
    focusedRef.current = true;
    activeFieldRef.current = key;
    if (!key || !sessionId || submitted) return;
    schedule({
      type: "patient:update",
      sessionId,
      values,
      errors: fieldErrors,
      activeField: key,
    });
  }

  function handleBlur(event: React.FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget;
    if (next && event.currentTarget.contains(next)) return; // still inside the form
    focusedRef.current = false;
    activeFieldRef.current = null;
    flush();
  }

  /* ── submit ────────────────────────────────────────────────────────────── */

  function onValid(parsed: PatientFormValues) {
    if (!sessionId) return;
    cancelPending();
    focusedRef.current = false;
    activeFieldRef.current = null;
    send({ type: "patient:submit", sessionId, values: parsed });
    setSubmitted(parsed);
  }

  const onInvalid: SubmitErrorHandler<PatientFormValues> = (invalid) => {
    const first = FIELDS.find((field) => invalid[field.key]);
    if (first) setFocus(first.key);
  };

  const successRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  function handleEdit() {
    setSubmitted(null);
    // Force the next render to publish, so staff see the record reopen.
    signatureRef.current = null;
  }

  function handleReset() {
    if (sessionId) send({ type: "patient:reset", sessionId });
    cancelPending();
    signatureRef.current = null;
    activeFieldRef.current = null;
    focusedRef.current = false;
    setSubmitted(null);
    reset(EMPTY_PATIENT_FORM);
    resetSessionId();
  }

  /* ── render ────────────────────────────────────────────────────────────── */

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-8">
      <SessionIdentity
        reference={reference}
        // Before hydration resolves the id the channel is disabled, which reads
        // as "closed" — but the honest state for the patient is still setting up.
        connection={sessionId ? connection : "connecting"}
        transport={transport}
        completion={submitted ? 1 : completion}
        onReset={handleReset}
        className="lg:sticky lg:top-8 lg:order-2 lg:self-start"
      />

      <div className="min-w-0 lg:order-1">
        {submitted ? (
          <SubmittedCard
            ref={successRef}
            reference={reference}
            values={submitted}
            onEdit={handleEdit}
          />
        ) : (
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(onValid, onInvalid)(event)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="flex flex-col gap-5 pb-24 lg:pb-0"
          >
            {/* Always mounted so the announcement isn't lost to a display:none
                region the moment a failed submit populates it. */}
            <p className="sr-only" aria-live="assertive">
              {invalidCount > 0 ? invalidMessage(invalidCount) : ""}
            </p>

            {GROUPED_FIELDS.map(({ group, fields }, index) => {
              const Icon = GROUP_ICON[group.id];
              return (
                <Card key={group.id} className={cn("animate-rise p-5 sm:p-6", RISE_DELAY[index])}>
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-field bg-brand-soft text-brand"
                      aria-hidden
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <SectionHeading title={group.title} hint={group.hint} className="min-w-0 flex-1" />
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {fields.map((field) => (
                      <FieldControl
                        key={field.key}
                        meta={field}
                        registration={register(field.key)}
                        error={fieldErrors[field.key]}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}

            {invalidCount > 0 ? (
              <p className="flex items-start gap-2.5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {invalidMessage(invalidCount)}
              </p>
            ) : null}

            {/* Desktop action row. */}
            <div className="hidden items-center justify-between gap-6 rounded-card border border-line bg-surface px-5 py-4 shadow-card lg:flex">
              <p className="text-xs leading-relaxed text-ink-soft">
                Submitting confirms your details. The care team can already read everything above.
              </p>
              <button type="submit" className={cn(buttonStyles.primary, "shrink-0")}>
                <Send className="size-4" aria-hidden />
                Submit details
              </button>
            </div>

            {/* Thumb-reachable CTA on phones; stays out of the way on desktop. */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <div className="min-w-0 flex-1">
                  <CompletionBar value={completion} label="Form completion" />
                </div>
                <button type="submit" className={cn(buttonStyles.primary, "shrink-0")}>
                  <Send className="size-4" aria-hidden />
                  Submit
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── success state ───────────────────────────────────────────────────────── */

function SubmittedCard({
  ref,
  reference,
  values,
  onEdit,
}: {
  ref: React.Ref<HTMLDivElement>;
  reference: string | null;
  values: PatientFormValues;
  onEdit: () => void;
}) {
  const filled = FIELDS.filter((field) => (values[field.key] ?? "").trim().length > 0);

  return (
    <Card className="animate-rise p-6 sm:p-8">
      <div ref={ref} tabIndex={-1} className="flex items-start gap-4 outline-none">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-live-soft text-live">
          <CircleCheckBig className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Thank you — your details are with the care team
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Please give this reference at the front desk. You can still change anything below.
          </p>
        </div>
      </div>

      <p className="mt-6 rounded-card border border-line bg-sunken px-4 py-3 text-center font-mono text-2xl font-semibold tracking-tight text-ink tabular-nums">
        {reference ?? "—"}
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {filled.map((field) => (
          <div key={field.key} className="flex flex-col gap-0.5 border-t border-line pt-3">
            <dt className="text-[11px] font-medium tracking-wide text-ink-faint uppercase">
              {field.label}
            </dt>
            <dd className="text-sm break-words text-ink">
              {formatFieldValue(field.key, values[field.key])}
            </dd>
          </div>
        ))}
      </dl>

      <button type="button" onClick={onEdit} className={cn(buttonStyles.secondary, "mt-7 w-full sm:w-auto")}>
        <Pencil className="size-4" aria-hidden />
        Edit my answers
      </button>
    </Card>
  );
}
