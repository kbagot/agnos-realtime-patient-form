import type { Locale } from "@/lib/i18n/locale";

export const HOME_COPY: Record<
  Locale,
  {
    badge: string;
    headlineLead: string;
    headlineAccent: string;
    intro: string;
    patientTitle: string;
    patientBody: string;
    patientCta: string;
    staffTitle: string;
    staffBody: string;
    staffCta: string;
    footnote: string;
  }
> = {
  en: {
    badge: "Agnos candidate assignment",
    headlineLead: "Patient intake the care team can watch",
    headlineAccent: "as it happens",
    intro:
      "A patient fills in the form on their phone. Every keystroke reaches the staff board instantly over a WebSocket — including which field they are on right now, whether they have stalled, and any validation problem blocking their submission.",
    patientTitle: "Patient form",
    patientBody: "Thirteen fields, validated as you go, designed for one thumb on a phone.",
    patientCta: "Open the form",
    staffTitle: "Staff view",
    staffBody:
      "Every open intake, a live status per patient, and the record filling in field by field.",
    staffCta: "Open the board",
    footnote:
      "Best experienced with both open side by side — the board opens in a separate tab on purpose. Nothing is persisted: records live in server memory for the length of the session.",
  },
  th: {
    badge: "แบบทดสอบผู้สมัคร Agnos",
    headlineLead: "การลงทะเบียนผู้ป่วยที่ทีมดูแลเห็นได้",
    headlineAccent: "แบบเรียลไทม์",
    intro:
      "ผู้ป่วยกรอกแบบฟอร์มจากมือถือ ทุกตัวอักษรที่พิมพ์จะไปถึงหน้าจอของเจ้าหน้าที่ทันทีผ่าน WebSocket ทั้งช่องที่กำลังกรอกอยู่ ช่วงที่หยุดกรอก และข้อผิดพลาดที่ทำให้ยังส่งฟอร์มไม่ได้",
    patientTitle: "แบบฟอร์มผู้ป่วย",
    patientBody: "13 ช่องข้อมูล ตรวจสอบความถูกต้องระหว่างกรอก ออกแบบให้ใช้มือเดียวบนมือถือได้",
    patientCta: "เปิดแบบฟอร์ม",
    staffTitle: "หน้าจอเจ้าหน้าที่",
    staffBody: "เห็นทุกรายการที่กำลังลงทะเบียน สถานะของผู้ป่วยแต่ละราย และข้อมูลที่กรอกทีละช่อง",
    staffCta: "เปิดหน้าจอเจ้าหน้าที่",
    footnote:
      "ควรเปิดทั้งสองหน้าคู่กันเพื่อดูการทำงาน หน้าจอเจ้าหน้าที่จึงเปิดในแท็บใหม่ ระบบไม่บันทึกข้อมูลลงฐานข้อมูล ข้อมูลอยู่ในหน่วยความจำของเซิร์ฟเวอร์เท่านั้น",
  },
};
