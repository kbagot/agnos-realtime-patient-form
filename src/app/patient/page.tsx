import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";

import { PatientForm } from "@/app/patient/_components/patient-form";

export const metadata: Metadata = {
  title: "Patient details · Agnos Clinic",
  description:
    "Share your details before your appointment. The care team can see them as you type, so nothing is lost if you stop halfway.",
};

export default function PatientPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-10 lg:pb-14">
      <header className="mb-6 lg:mb-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          <HeartPulse className="size-3.5" aria-hidden />
          Agnos Clinic
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Patient details
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          About two minutes. Everything you type reaches the care team straight away — you can stop
          at any point and someone will pick up where you left off.
        </p>
      </header>

      <PatientForm />
    </main>
  );
}
