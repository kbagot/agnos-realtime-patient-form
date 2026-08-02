import Link from "next/link";
import { Activity, ArrowRight, ClipboardList, MonitorSmartphone } from "lucide-react";

import { buttonStyles, Card } from "@/components/ui";

/**
 * Entry point for reviewers: the demo only makes sense with both interfaces
 * open at once, so this page's job is to get you there in one click.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-5 py-14 sm:px-8 sm:py-20">
      <header className="animate-rise max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
          <Activity className="size-3.5 text-brand" aria-hidden />
          Agnos candidate assignment
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">
          Patient intake the care team can watch{" "}
          <span className="text-brand">as it happens</span>.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-pretty text-ink-soft">
          A patient fills in the form on their phone. Every keystroke reaches the staff board
          instantly over a WebSocket — including which field they are on right now, whether they
          have stalled, and any validation problem blocking their submission.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="animate-rise flex flex-col gap-4 p-6" as="article">
          <div className="flex size-10 items-center justify-center rounded-field bg-brand-soft text-brand">
            <ClipboardList className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Patient form</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Thirteen fields, validated as you go, designed for one thumb on a phone.
            </p>
          </div>
          <Link href="/patient" className={`${buttonStyles.primary} mt-auto w-full sm:w-fit`}>
            Open the form
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Card>

        <Card className="animate-rise flex flex-col gap-4 p-6" as="article">
          <div className="flex size-10 items-center justify-center rounded-field bg-live-soft text-live">
            <MonitorSmartphone className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Staff view</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Every open intake, a live status per patient, and the record filling in field by
              field.
            </p>
          </div>
          <Link
            href="/staff"
            target="_blank"
            rel="noreferrer"
            className={`${buttonStyles.secondary} mt-auto w-full sm:w-fit`}
          >
            Open the board
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Card>
      </div>

      <p className="text-sm text-ink-faint">
        Best experienced with both open side by side — the board opens in a separate tab on purpose.
        Nothing is persisted: records live in server memory for the length of the session.
      </p>
    </main>
  );
}
