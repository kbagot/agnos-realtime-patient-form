import type { Metadata } from "next";

import { PatientForm } from "@/app/patient/_components/patient-form";
import { PatientHeader } from "@/app/patient/_components/patient-header";

export const metadata: Metadata = {
  // Bilingual, because the locale is a client-side choice and metadata is not.
  title: "Patient details · ข้อมูลผู้ป่วย",
  description:
    "Share your details before your appointment. The care team can see them as you type, so nothing is lost if you stop halfway.",
};

export default function PatientPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-10 lg:pb-14">
      <PatientHeader />
      <PatientForm />
    </main>
  );
}
