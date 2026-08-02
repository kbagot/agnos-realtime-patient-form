import type { Metadata } from "next";

import { StaffBoard } from "@/app/staff/_components/staff-board";

export const metadata: Metadata = {
  title: "Intake board · Agnos",
  description:
    "Live staff view of every patient registration form, updating as the patient types.",
  robots: { index: false, follow: false },
};

export default function StaffPage() {
  return <StaffBoard />;
}
