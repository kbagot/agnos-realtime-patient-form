/**
 * Single source of truth for the patient record: field metadata + validation.
 *
 * Both interfaces read from here, so the staff view can never drift out of sync
 * with the patient form (same field order, same labels, same required set).
 */
import { z } from "zod";

export const PREFERRED_LANGUAGES = [
  "Thai",
  "English",
  "Mandarin",
  "Japanese",
  "Burmese",
  "Khmer",
  "Other",
] as const;

export const GENDERS = ["female", "male", "non-binary", "prefer-not-to-say"] as const;

/** ISO-ish phone: digits, spaces, dashes, parens, optional leading +. 6-20 digits. */
const PHONE_RE = /^\+?[\d\s\-().]{6,20}$/;

export const patientFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60, "Too long"),
  middleName: z.string().trim().max(60, "Too long").optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60, "Too long"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Use a valid date")
    .refine((v) => Date.parse(v) <= Date.now(), "Date of birth cannot be in the future")
    .refine(
      (v) => Date.now() - Date.parse(v) < 150 * 365.25 * 24 * 3600 * 1000,
      "Please check the year",
    ),
  gender: z.enum(GENDERS, { message: "Select a gender" }),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(PHONE_RE, "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email")),
  address: z.string().trim().min(5, "Please enter a full address").max(240, "Too long"),
  preferredLanguage: z.enum(PREFERRED_LANGUAGES, { message: "Select a language" }),
  nationality: z.string().trim().min(2, "Nationality is required").max(60, "Too long"),
  emergencyContactName: z.string().trim().max(80, "Too long").optional().or(z.literal("")),
  emergencyContactRelationship: z
    .string()
    .trim()
    .max(40, "Too long")
    .optional()
    .or(z.literal("")),
  religion: z.string().trim().max(60, "Too long").optional().or(z.literal("")),
});

export type PatientForm = z.infer<typeof patientFormSchema>;
export type FieldKey = keyof PatientForm;

export type FieldGroupId = "identity" | "contact" | "background" | "emergency";

export interface FieldMeta {
  key: FieldKey;
  label: string;
  group: FieldGroupId;
  required: boolean;
  /** Widget the patient form renders and the staff view mirrors. */
  control: "text" | "email" | "tel" | "date" | "select" | "textarea";
  options?: readonly string[];
  placeholder?: string;
  autoComplete?: string;
  /** Field holds sensitive data → staff view masks it until revealed. */
  sensitive?: boolean;
  /** Tailwind col-span hint on the desktop 2-col grid. */
  wide?: boolean;
}

export const FIELD_GROUPS: { id: FieldGroupId; title: string; hint: string }[] = [
  { id: "identity", title: "Identity", hint: "Legal name and date of birth" },
  { id: "contact", title: "Contact", hint: "How the clinic reaches the patient" },
  { id: "background", title: "Background", hint: "Helps us prepare the right care team" },
  { id: "emergency", title: "Emergency contact", hint: "Optional, but strongly recommended" },
];

export const FIELDS: FieldMeta[] = [
  {
    key: "firstName",
    label: "First name",
    group: "identity",
    required: true,
    control: "text",
    placeholder: "Somchai",
    autoComplete: "given-name",
  },
  {
    key: "middleName",
    label: "Middle name",
    group: "identity",
    required: false,
    control: "text",
    placeholder: "Optional",
    autoComplete: "additional-name",
  },
  {
    key: "lastName",
    label: "Last name",
    group: "identity",
    required: true,
    control: "text",
    placeholder: "Ratchada",
    autoComplete: "family-name",
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    group: "identity",
    required: true,
    control: "date",
    autoComplete: "bday",
  },
  {
    key: "gender",
    label: "Gender",
    group: "identity",
    required: true,
    control: "select",
    options: GENDERS,
  },
  {
    key: "phone",
    label: "Phone number",
    group: "contact",
    required: true,
    control: "tel",
    placeholder: "+66 81 234 5678",
    autoComplete: "tel",
    sensitive: true,
  },
  {
    key: "email",
    label: "Email",
    group: "contact",
    required: true,
    control: "email",
    placeholder: "somchai@example.com",
    autoComplete: "email",
    sensitive: true,
  },
  {
    key: "address",
    label: "Address",
    group: "contact",
    required: true,
    control: "textarea",
    placeholder: "123 Sukhumvit Rd, Khlong Toei, Bangkok 10110",
    autoComplete: "street-address",
    sensitive: true,
    wide: true,
  },
  {
    key: "preferredLanguage",
    label: "Preferred language",
    group: "background",
    required: true,
    control: "select",
    options: PREFERRED_LANGUAGES,
  },
  {
    key: "nationality",
    label: "Nationality",
    group: "background",
    required: true,
    control: "text",
    placeholder: "Thai",
    autoComplete: "country-name",
  },
  {
    key: "religion",
    label: "Religion",
    group: "background",
    required: false,
    control: "text",
    placeholder: "Optional",
    sensitive: true,
  },
  {
    key: "emergencyContactName",
    label: "Contact name",
    group: "emergency",
    required: false,
    control: "text",
    placeholder: "Optional",
  },
  {
    key: "emergencyContactRelationship",
    label: "Relationship",
    group: "emergency",
    required: false,
    control: "text",
    placeholder: "e.g. Sister",
  },
];

export const FIELD_BY_KEY: Record<FieldKey, FieldMeta> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
) as Record<FieldKey, FieldMeta>;

export const REQUIRED_FIELDS: FieldKey[] = FIELDS.filter((f) => f.required).map((f) => f.key);

export const EMPTY_PATIENT_FORM: PatientForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "" as PatientForm["gender"],
  phone: "",
  email: "",
  address: "",
  preferredLanguage: "" as PatientForm["preferredLanguage"],
  nationality: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  religion: "",
};

/** Human label for the select/enum values, so both views render them the same. */
export function formatFieldValue(key: FieldKey, value: string | undefined): string {
  if (!value) return "";
  if (key === "gender") {
    return { female: "Female", male: "Male", "non-binary": "Non-binary", "prefer-not-to-say": "Prefer not to say" }[value] ?? value;
  }
  if (key === "dateOfBirth") {
    const t = Date.parse(value);
    if (Number.isNaN(t)) return value;
    return new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  return value;
}

/** 0..1 share of required fields that currently hold a non-empty value. */
export function completionRatio(fields: Partial<Record<FieldKey, string>>): number {
  const filled = REQUIRED_FIELDS.filter((k) => (fields[k] ?? "").trim().length > 0).length;
  return filled / REQUIRED_FIELDS.length;
}
