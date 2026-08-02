"use client";

import Link from "next/link";
import { Activity, ArrowRight, ClipboardList, MonitorSmartphone } from "lucide-react";

import { HOME_COPY } from "@/app/_i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonStyles, Card } from "@/components/ui";
import { useCopy } from "@/lib/i18n/locale";

/**
 * Entry point for reviewers: the demo only makes sense with both interfaces
 * open at once, so this page's job is to get you there in one click.
 */
export default function Home() {
  const copy = useCopy(HOME_COPY);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-5 py-14 sm:px-8 sm:py-20">
      <header className="animate-rise max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
            <Activity className="size-3.5 text-brand" aria-hidden />
            {copy.badge}
          </span>
          <LocaleSwitcher />
        </div>
        <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight text-balance text-ink sm:text-5xl sm:leading-tight">
          {copy.headlineLead} <span className="text-brand">{copy.headlineAccent}</span>.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-pretty text-ink-soft">{copy.intro}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="animate-rise flex flex-col gap-4 p-6" as="article">
          <div className="flex size-10 items-center justify-center rounded-field bg-brand-soft text-brand">
            <ClipboardList className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">{copy.patientTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{copy.patientBody}</p>
          </div>
          <Link href="/patient" className={`${buttonStyles.primary} mt-auto w-full sm:w-fit`}>
            {copy.patientCta}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </Card>

        <Card className="animate-rise flex flex-col gap-4 p-6" as="article">
          <div className="flex size-10 items-center justify-center rounded-field bg-live-soft text-live">
            <MonitorSmartphone className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">{copy.staffTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{copy.staffBody}</p>
          </div>
          <Link
            href="/staff"
            target="_blank"
            rel="noreferrer"
            className={`${buttonStyles.secondary} mt-auto w-full sm:w-fit`}
          >
            {copy.staffCta}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </Card>
      </div>

      <p className="text-sm leading-relaxed text-ink-faint">{copy.footnote}</p>
    </main>
  );
}
