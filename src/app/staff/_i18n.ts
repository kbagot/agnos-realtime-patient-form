import type { Locale } from "@/lib/i18n/locale";

/**
 * Every string on the staff route. Field labels, group titles, statuses and
 * validation messages come from COMMON_COPY instead — they are shared with the
 * patient form and must not drift.
 */
export interface StaffCopy {
  title: string;
  subtitle: string;

  stats: { total: string; typing: string; idle: string; submitted: string };
  filters: { all: string; typing: string; submitted: string };

  clearSubmitted: string;
  clearSubmittedHint: string;

  empty: { title: string; body: string; cta: string; note: string };

  awaitingName: string;
  notProvided: string;
  editingNow: string;
  disconnected: string;
  disconnectedHint: string;

  reveal: string;
  hide: string;
  maskNote: string;
  maskedForScreenReader: string;

  banner: { reconnecting: string; closed: string };

  noMatch: string;
  selectPrompt: string;
  backToList: string;

  /** Relative timestamps, driven by the board's shared 1s clock. */
  time: {
    justNow: string;
    seconds: (n: number) => string;
    minutes: (n: number) => string;
    hours: (n: number) => string;
  };
  lastInput: (when: string) => string;
  submittedAt: (when: string) => string;
  openedAt: (when: string) => string;

  issues: (n: number) => string;
  validationIssues: (n: number) => string;

  /** Polite live-region announcements. */
  announce: {
    started: (reference: string) => string;
    submitted: (reference: string) => string;
    disconnected: (reference: string) => string;
  };

  aria: {
    sessions: string;
    record: string;
    filter: string;
    completion: (reference: string) => string;
    requiredComplete: (reference: string) => string;
    announcements: string;
  };
}

export const STAFF_COPY: Record<Locale, StaffCopy> = {
  en: {
    title: "Intake board",
    subtitle: "Patient registration, live as it is typed",

    stats: { total: "Total", typing: "Filling in", idle: "Inactive", submitted: "Submitted" },
    filters: { all: "All", typing: "Filling in", submitted: "Submitted" },

    clearSubmitted: "Clear submitted",
    clearSubmittedHint: "Remove submitted records whose patient has closed the form",

    empty: {
      title: "No patients on the board",
      body: "A record appears here the moment a patient opens the intake form, and every keystroke they type shows up live. Nothing to refresh — leave this screen up.",
      cta: "Open the patient form",
      note: "Opens in a new tab so you can watch both screens side by side.",
    },

    awaitingName: "Awaiting name",
    notProvided: "Not provided yet",
    editingNow: "editing now",
    disconnected: "Disconnected",
    disconnectedHint:
      "The patient's device is no longer connected — the values below are the last we received.",

    reveal: "Reveal contact details",
    hide: "Hide contact details",
    maskNote:
      "Phone, email, address and religion stay masked so the board can sit on a shared screen. Revealing applies to this record only.",
    maskedForScreenReader: "hidden, use reveal to show",

    banner: {
      reconnecting:
        "Reconnecting to the intake service — what you see may be a few seconds stale.",
      closed:
        "Disconnected from the intake service. This board is frozen until the connection returns.",
    },

    noMatch: "No patients match this filter right now.",
    selectPrompt: "Select a patient to see every field they have entered.",
    backToList: "All patients",

    time: {
      justNow: "just now",
      seconds: (n) => `${n}s ago`,
      minutes: (n) => `${n} min ago`,
      hours: (n) => `${n} h ago`,
    },
    lastInput: (when) => `Last input ${when}`,
    submittedAt: (when) => `Submitted ${when}`,
    openedAt: (when) => `opened ${when}`,

    issues: (n) => `${n} ${n === 1 ? "issue" : "issues"}`,
    validationIssues: (n) => `${n} validation ${n === 1 ? "issue" : "issues"}`,

    announce: {
      started: (reference) => `${reference} started a form`,
      submitted: (reference) => `${reference} submitted`,
      disconnected: (reference) => `${reference} disconnected`,
    },

    aria: {
      sessions: "Patient sessions",
      record: "Patient record",
      filter: "Filter by status",
      completion: (reference) => `${reference} completion`,
      requiredComplete: (reference) => `${reference} required fields complete`,
      announcements: "Board announcements",
    },
  },

  th: {
    title: "หน้าจอลงทะเบียนผู้ป่วย",
    subtitle: "ข้อมูลการลงทะเบียนผู้ป่วย อัปเดตทันทีที่ผู้ป่วยพิมพ์",

    stats: {
      total: "ทั้งหมด",
      typing: "กำลังกรอก",
      idle: "ไม่มีการกรอก",
      submitted: "ส่งแล้ว",
    },
    filters: { all: "ทั้งหมด", typing: "กำลังกรอก", submitted: "ส่งแล้ว" },

    clearSubmitted: "ล้างรายการที่ส่งแล้ว",
    clearSubmittedHint: "ลบรายการที่ส่งแล้วของผู้ป่วยที่ปิดแบบฟอร์มไปแล้ว",

    empty: {
      title: "ยังไม่มีผู้ป่วยในระบบ",
      body: "รายการจะขึ้นที่นี่ทันทีที่ผู้ป่วยเปิดแบบฟอร์ม และทุกตัวอักษรที่พิมพ์จะแสดงแบบเรียลไทม์ ไม่ต้องรีเฟรชหน้าจอ เปิดหน้านี้ค้างไว้ได้เลย",
      cta: "เปิดแบบฟอร์มผู้ป่วย",
      note: "จะเปิดในแท็บใหม่ เพื่อให้ดูทั้งสองหน้าจอพร้อมกันได้",
    },

    awaitingName: "ยังไม่ระบุชื่อ",
    notProvided: "ยังไม่ได้กรอก",
    editingNow: "กำลังพิมพ์",
    disconnected: "ขาดการเชื่อมต่อ",
    disconnectedHint:
      "อุปกรณ์ของผู้ป่วยไม่ได้เชื่อมต่ออยู่แล้ว ข้อมูลด้านล่างคือข้อมูลล่าสุดที่ได้รับ",

    reveal: "แสดงข้อมูลติดต่อ",
    hide: "ซ่อนข้อมูลติดต่อ",
    maskNote:
      "เบอร์โทรศัพท์ อีเมล ที่อยู่ และศาสนาถูกซ่อนไว้ เพื่อให้เปิดหน้าจอนี้ในพื้นที่ส่วนกลางได้ การแสดงข้อมูลมีผลเฉพาะรายการนี้เท่านั้น",
    maskedForScreenReader: "ซ่อนอยู่ กดแสดงข้อมูลติดต่อเพื่อดู",

    banner: {
      reconnecting: "กำลังเชื่อมต่อกับระบบลงทะเบียนใหม่ ข้อมูลที่เห็นอาจช้ากว่าจริงเล็กน้อย",
      closed: "ขาดการเชื่อมต่อกับระบบลงทะเบียน หน้าจอนี้จะหยุดอัปเดตจนกว่าจะเชื่อมต่อได้อีกครั้ง",
    },

    noMatch: "ไม่มีผู้ป่วยที่ตรงกับตัวกรองนี้",
    selectPrompt: "เลือกผู้ป่วยเพื่อดูข้อมูลทุกช่องที่กรอกไว้",
    backToList: "ผู้ป่วยทั้งหมด",

    time: {
      justNow: "เมื่อสักครู่",
      seconds: (n) => `${n} วินาทีที่แล้ว`,
      minutes: (n) => `${n} นาทีที่แล้ว`,
      hours: (n) => `${n} ชั่วโมงที่แล้ว`,
    },
    lastInput: (when) => `กรอกล่าสุด ${when}`,
    submittedAt: (when) => `ส่งเมื่อ ${when}`,
    openedAt: (when) => `เปิดเมื่อ ${when}`,

    // Thai has no plural inflection, so one form covers every count.
    issues: (n) => `ข้อมูลไม่ถูกต้อง ${n} จุด`,
    validationIssues: (n) => `ข้อมูลไม่ถูกต้อง ${n} จุด`,

    announce: {
      started: (reference) => `${reference} เริ่มกรอกแบบฟอร์ม`,
      submitted: (reference) => `${reference} ส่งแบบฟอร์มแล้ว`,
      disconnected: (reference) => `${reference} ขาดการเชื่อมต่อ`,
    },

    aria: {
      sessions: "รายการผู้ป่วย",
      record: "ข้อมูลผู้ป่วย",
      filter: "กรองตามสถานะ",
      completion: (reference) => `ความคืบหน้าของ ${reference}`,
      requiredComplete: (reference) => `ช่องที่จำเป็นของ ${reference} ที่กรอกครบแล้ว`,
      announcements: "ประกาศจากหน้าจอ",
    },
  },
};

/**
 * Localized twin of `relativeTime` in components/ui.tsx, which is English-only.
 * Same thresholds so both screens age timestamps identically.
 */
export function relativeTime(copy: StaffCopy, from: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 5) return copy.time.justNow;
  if (seconds < 60) return copy.time.seconds(seconds);
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return copy.time.minutes(minutes);
  return copy.time.hours(Math.round(minutes / 60));
}
