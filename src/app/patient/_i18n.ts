/**
 * Every string the patient route renders that is not already shared in
 * `lib/i18n/common.ts`. Field labels, placeholders, group titles and enum
 * values come from there, because the staff board renders the same ones.
 */
import type { Locale } from "@/lib/i18n/locale";

interface PatientCopy {
  eyebrow: string;
  title: string;
  intro: string;

  referenceLabel: string;
  completionLabel: string;
  /** aria-label on the progress bar, which shows no text of its own. */
  completionAria: string;
  reassurance: string;
  startOver: string;
  resetPrompt: string;
  resetConfirm: string;
  resetCancel: string;

  submit: string;
  /** Short form for the mobile action bar, where width is scarce. */
  submitShort: string;
  submitHint: string;
  invalidAnnouncement: (count: number) => string;

  success: {
    title: string;
    body: string;
    summaryHeading: string;
    edit: string;
  };
}

export const PATIENT_COPY: Record<Locale, PatientCopy> = {
  en: {
    eyebrow: "Agnos Clinic",
    title: "Patient details",
    intro:
      "About two minutes. Everything you type reaches the care team straight away, so nothing is lost if you stop halfway.",

    referenceLabel: "Your reference",
    completionLabel: "Required fields completed",
    completionAria: "Form completion",
    reassurance:
      "Your details are visible to the care team as you type, so you can pause at any point and someone will pick up where you left off.",
    startOver: "Start over",
    resetPrompt: "Clear every answer and start a new record? The care team will stop seeing this one.",
    resetConfirm: "Yes, start over",
    resetCancel: "Keep my answers",

    submit: "Submit details",
    submitShort: "Submit",
    submitHint: "Submitting confirms your details. The care team can already read everything above.",
    invalidAnnouncement: (count) =>
      count === 1
        ? "1 field still needs your attention before we can submit."
        : `${count} fields still need your attention before we can submit.`,

    success: {
      title: "Thank you — your details are with the care team",
      body: "Please give this reference at the front desk. You can still change anything below.",
      summaryHeading: "What you sent",
      edit: "Edit my answers",
    },
  },
  th: {
    eyebrow: "คลินิก Agnos",
    title: "ข้อมูลผู้ป่วย",
    intro:
      "ใช้เวลาประมาณ 2 นาที ข้อมูลที่กรอกจะส่งถึงทีมผู้ดูแลทันที หากหยุดกลางคันข้อมูลจะไม่หายไป",

    referenceLabel: "รหัสอ้างอิงของคุณ",
    completionLabel: "ความคืบหน้าข้อมูลที่จำเป็น",
    completionAria: "ความคืบหน้าการกรอกแบบฟอร์ม",
    reassurance:
      "ทีมผู้ดูแลเห็นข้อมูลของคุณระหว่างที่กรอก จึงหยุดพักได้ทุกเมื่อ แล้วเจ้าหน้าที่จะดูแลต่อจากจุดที่ค้างไว้",
    startOver: "เริ่มกรอกใหม่",
    resetPrompt: "ล้างข้อมูลทั้งหมดและเริ่มระเบียนใหม่หรือไม่ ทีมผู้ดูแลจะไม่เห็นระเบียนนี้อีกต่อไป",
    resetConfirm: "ใช่ เริ่มใหม่",
    resetCancel: "เก็บข้อมูลเดิมไว้",

    submit: "ส่งข้อมูล",
    submitShort: "ส่ง",
    submitHint: "การส่งเป็นการยืนยันข้อมูล ทั้งนี้ทีมผู้ดูแลเห็นข้อมูลด้านบนอยู่แล้ว",
    invalidAnnouncement: (count) => `ยังมีข้อมูลที่ต้องแก้ไขอีก ${count} รายการก่อนส่ง`,

    success: {
      title: "ขอบคุณ ข้อมูลของคุณถึงทีมผู้ดูแลแล้ว",
      body: "กรุณาแจ้งรหัสอ้างอิงนี้ที่จุดลงทะเบียน หากต้องการแก้ไข สามารถกดแก้ไขด้านล่างได้",
      summaryHeading: "ข้อมูลที่ส่ง",
      edit: "แก้ไขข้อมูล",
    },
  },
};

/**
 * Thai stacks vowels and tone marks above and below the consonant, so tracking
 * pulls the marks away from their base letter. Latin-only tracking is dropped
 * rather than tuned.
 */
export function latinTracking(locale: Locale, classes: string): string {
  return locale === "th" ? "" : classes;
}

/** Thai ascenders and descenders need more room at the same font size. */
export function bodyLeading(locale: Locale): string {
  return locale === "th" ? "leading-loose" : "leading-relaxed";
}
