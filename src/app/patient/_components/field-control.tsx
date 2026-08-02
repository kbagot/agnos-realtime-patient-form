"use client";

/**
 * The only place a patient input is rendered. Every widget is driven by the
 * FieldMeta contract, so adding a field to `FIELDS` is enough to ship it.
 */
import { ChevronDown, CircleAlert } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/components/ui";
import { formatFieldValue, type FieldKey, type FieldMeta } from "@/lib/patient-form";

export function fieldDomId(key: FieldKey): string {
  return `patient-${key}`;
}

function errorDomId(key: FieldKey): string {
  return `patient-${key}-error`;
}

const CONTROL_BASE =
  "w-full rounded-field border bg-surface px-3.5 text-[15px] text-ink transition-colors duration-150 " +
  "placeholder:text-ink-faint hover:border-line-strong focus:border-brand-ring";

/* 44px minimum: the form is filled one-handed on a phone in a waiting room. */
const CONTROL_HEIGHT = "h-11";

const CONTROL_TONE = {
  normal: "border-line",
  invalid: "border-danger bg-danger-soft/40",
} as const;

export interface FieldControlProps {
  meta: FieldMeta;
  registration: UseFormRegisterReturn<FieldKey>;
  error?: string;
}

export function FieldControl({ meta, registration, error }: FieldControlProps) {
  const id = fieldDomId(meta.key);
  const describedBy = error ? errorDomId(meta.key) : undefined;

  const shared = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": meta.required ? true : undefined,
    autoComplete: meta.autoComplete,
    ...registration,
  } as const;

  const tone = error ? CONTROL_TONE.invalid : CONTROL_TONE.normal;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", meta.wide && "sm:col-span-2")}>
      <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
        {meta.label}
        {meta.required ? null : (
          <span className="rounded-full border border-line bg-sunken px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-ink-faint uppercase">
            Optional
          </span>
        )}
      </label>

      {meta.control === "select" ? (
        <div className="relative">
          <select
            {...shared}
            // `required` is only here so `invalid:` can grey out the unchosen
            // state like a placeholder; the form is noValidate and zod decides.
            required={meta.required || undefined}
            className={cn(
              CONTROL_BASE,
              CONTROL_HEIGHT,
              tone,
              "appearance-none pr-10 invalid:text-ink-faint",
            )}
          >
            <option value="">Select…</option>
            {meta.options?.map((option) => (
              <option key={option} value={option}>
                {formatFieldValue(meta.key, option)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
        </div>
      ) : meta.control === "textarea" ? (
        <textarea
          {...shared}
          rows={3}
          placeholder={meta.placeholder}
          className={cn(CONTROL_BASE, tone, "min-h-24 resize-y py-2.5 leading-relaxed")}
        />
      ) : (
        <input
          {...shared}
          type={meta.control === "date" ? "date" : meta.control === "email" ? "email" : meta.control === "tel" ? "tel" : "text"}
          inputMode={meta.control === "tel" ? "tel" : undefined}
          placeholder={meta.placeholder}
          className={cn(CONTROL_BASE, CONTROL_HEIGHT, tone)}
        />
      )}

      {error ? (
        <p
          id={describedBy}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-danger"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
