/**
 * Copy shared by both interfaces: field labels, groups, enum values, statuses
 * and connection states. Route-specific strings live in `_i18n.ts` beside the
 * route that owns them.
 */
import type { FieldGroupId, FieldKey } from "@/lib/patient-form";
import type { Locale } from "@/lib/i18n/locale";
import type { ConnectionState, SessionStatus } from "@/lib/realtime/protocol";

interface CommonCopy {
  fields: Record<FieldKey, string>;
  /** Placeholder shown inside an empty input. */
  placeholders: Partial<Record<FieldKey, string>>;
  groups: Record<FieldGroupId, { title: string; hint: string }>;
  gender: Record<string, string>;
  language: Record<string, string>;
  status: Record<SessionStatus, { label: string; help: string }>;
  connection: Record<ConnectionState, string>;
  optional: string;
  required: string;
  select: string;
  /** Locale tag for Intl date formatting. */
  dateLocale: string;
}

export const COMMON_COPY: Record<Locale, CommonCopy> = {
  en: {
    fields: {
      firstName: "First name",
      middleName: "Middle name",
      lastName: "Last name",
      dateOfBirth: "Date of birth",
      gender: "Gender",
      phone: "Phone number",
      email: "Email",
      address: "Address",
      preferredLanguage: "Preferred language",
      nationality: "Nationality",
      religion: "Religion",
      emergencyContactName: "Contact name",
      emergencyContactRelationship: "Relationship",
    },
    placeholders: {
      firstName: "Somchai",
      lastName: "Ratchada",
      phone: "+66 81 234 5678",
      email: "somchai@example.com",
      address: "123 Sukhumvit Rd, Khlong Toei, Bangkok 10110",
      nationality: "Thai",
      emergencyContactRelationship: "e.g. Sister",
    },
    groups: {
      identity: { title: "Identity", hint: "Legal name and date of birth" },
      contact: { title: "Contact", hint: "How the clinic reaches the patient" },
      background: { title: "Background", hint: "Helps us prepare the right care team" },
      emergency: { title: "Emergency contact", hint: "Optional, but strongly recommended" },
    },
    gender: {
      female: "Female",
      male: "Male",
      "non-binary": "Non-binary",
      "prefer-not-to-say": "Prefer not to say",
    },
    language: {
      Thai: "Thai",
      English: "English",
      Mandarin: "Mandarin",
      Japanese: "Japanese",
      Burmese: "Burmese",
      Khmer: "Khmer",
      Other: "Other",
    },
    status: {
      typing: { label: "Filling in", help: "Patient is actively typing" },
      idle: { label: "Inactive", help: "No input for a few seconds" },
      submitted: { label: "Submitted", help: "Form submitted by the patient" },
    },
    connection: {
      connecting: "Connecting",
      open: "Live",
      reconnecting: "Reconnecting",
      closed: "Offline",
    },
    optional: "Optional",
    required: "Required",
    select: "Select…",
    dateLocale: "en-GB",
  },
  th: {
    fields: {
      firstName: "ชื่อจริง",
      middleName: "ชื่อกลาง",
      lastName: "นามสกุล",
      dateOfBirth: "วันเกิด",
      gender: "เพศ",
      phone: "เบอร์โทรศัพท์",
      email: "อีเมล",
      address: "ที่อยู่",
      preferredLanguage: "ภาษาที่ต้องการใช้",
      nationality: "สัญชาติ",
      religion: "ศาสนา",
      emergencyContactName: "ชื่อผู้ติดต่อ",
      emergencyContactRelationship: "ความสัมพันธ์",
    },
    placeholders: {
      firstName: "สมชาย",
      lastName: "รัชดา",
      phone: "+66 81 234 5678",
      email: "somchai@example.com",
      address: "123 ถนนสุขุมวิท คลองเตย กรุงเทพฯ 10110",
      nationality: "ไทย",
      emergencyContactRelationship: "เช่น พี่สาว",
    },
    groups: {
      identity: { title: "ข้อมูลส่วนตัว", hint: "ชื่อตามกฎหมายและวันเกิด" },
      contact: { title: "ข้อมูลติดต่อ", hint: "ช่องทางที่คลินิกใช้ติดต่อผู้ป่วย" },
      background: { title: "ข้อมูลพื้นฐาน", hint: "ช่วยให้เราจัดทีมดูแลได้เหมาะสม" },
      emergency: { title: "ผู้ติดต่อกรณีฉุกเฉิน", hint: "ไม่บังคับ แต่แนะนำอย่างยิ่ง" },
    },
    gender: {
      female: "หญิง",
      male: "ชาย",
      "non-binary": "นอน-ไบนารี",
      "prefer-not-to-say": "ไม่ต้องการระบุ",
    },
    language: {
      Thai: "ไทย",
      English: "อังกฤษ",
      Mandarin: "จีนกลาง",
      Japanese: "ญี่ปุ่น",
      Burmese: "พม่า",
      Khmer: "เขมร",
      Other: "อื่น ๆ",
    },
    status: {
      typing: { label: "กำลังกรอก", help: "ผู้ป่วยกำลังพิมพ์อยู่" },
      idle: { label: "ไม่มีการกรอก", help: "ไม่มีการพิมพ์มาสักครู่" },
      submitted: { label: "ส่งแล้ว", help: "ผู้ป่วยส่งแบบฟอร์มแล้ว" },
    },
    connection: {
      connecting: "กำลังเชื่อมต่อ",
      open: "เชื่อมต่ออยู่",
      reconnecting: "กำลังเชื่อมต่อใหม่",
      closed: "ออฟไลน์",
    },
    optional: "ไม่บังคับ",
    required: "จำเป็น",
    select: "เลือก…",
    dateLocale: "th-TH",
  },
};

/** Validation messages, mirrored to the staff board, so they translate too. */
export const ERROR_COPY: Record<Locale, Record<string, string>> = {
  en: {
    "First name is required": "First name is required",
    "Last name is required": "Last name is required",
    "Date of birth is required": "Date of birth is required",
    "Use a valid date": "Use a valid date",
    "Date of birth cannot be in the future": "Date of birth cannot be in the future",
    "Please check the year": "Please check the year",
    "Select a gender": "Select a gender",
    "Phone number is required": "Phone number is required",
    "Enter a valid phone number": "Enter a valid phone number",
    "Email is required": "Email is required",
    "Enter a valid email": "Enter a valid email",
    "Please enter a full address": "Please enter a full address",
    "Select a language": "Select a language",
    "Nationality is required": "Nationality is required",
    "Too long": "Too long",
  },
  th: {
    "First name is required": "กรุณากรอกชื่อจริง",
    "Last name is required": "กรุณากรอกนามสกุล",
    "Date of birth is required": "กรุณาระบุวันเกิด",
    "Use a valid date": "กรุณาใส่วันที่ให้ถูกต้อง",
    "Date of birth cannot be in the future": "วันเกิดต้องไม่เป็นวันในอนาคต",
    "Please check the year": "กรุณาตรวจสอบปีอีกครั้ง",
    "Select a gender": "กรุณาเลือกเพศ",
    "Phone number is required": "กรุณากรอกเบอร์โทรศัพท์",
    "Enter a valid phone number": "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง",
    "Email is required": "กรุณากรอกอีเมล",
    "Enter a valid email": "กรุณากรอกอีเมลให้ถูกต้อง",
    "Please enter a full address": "กรุณากรอกที่อยู่ให้ครบถ้วน",
    "Select a language": "กรุณาเลือกภาษา",
    "Nationality is required": "กรุณาระบุสัญชาติ",
    "Too long": "ข้อความยาวเกินไป",
  },
};

/**
 * Zod messages are authored in English and carried over the wire that way, so
 * both screens can translate the same string at render time.
 */
export function translateError(locale: Locale, message: string | undefined): string | undefined {
  if (!message) return message;
  return ERROR_COPY[locale][message] ?? message;
}

/** Locale-aware version of `formatFieldValue` from the shared field metadata. */
export function formatValue(
  locale: Locale,
  key: FieldKey,
  value: string | undefined,
): string {
  if (!value) return "";
  const copy = COMMON_COPY[locale];
  if (key === "gender") return copy.gender[value] ?? value;
  if (key === "preferredLanguage") return copy.language[value] ?? value;
  if (key === "dateOfBirth") {
    const time = Date.parse(value);
    if (Number.isNaN(time)) return value;
    return new Date(time).toLocaleDateString(copy.dateLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return value;
}
