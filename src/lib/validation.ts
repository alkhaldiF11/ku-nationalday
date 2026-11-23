import {z} from "zod";

import {GUEST_CATEGORIES, normalizeInternationalPhone, normalizePhone} from "@/lib/data/guests";
import {ACTIVITY_CATEGORIES} from "@/lib/data/content";
import {STAFF_ROLES} from "@/lib/data/staff";

/* Messages are i18n keys (validation.*), translated on the client. */

const text = (max: number) => z.string().trim().max(max, "validation.tooLong");
const required = (max: number) => text(max).min(1, "validation.required");
const optional = (max: number) => text(max).optional().transform((value) => value || null);
const checkbox = z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional().transform((value) => value === "on" || value === "true");
const int = (min: number, max: number) => z.coerce.number({error: "validation.number"}).int("validation.number").min(min, "validation.min").max(max, "validation.max");

export const phone = z.string().trim().min(1, "validation.required").refine((value) => normalizePhone(value) !== null, "validation.phone");
export const email = z
  .string()
  .trim()
  .max(120, "validation.tooLong")
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || z.email().safeParse(value).success, "validation.email");

export const newPassword = z
  .string()
  .min(8, "validation.passwordLength")
  .max(128, "validation.tooLong")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "validation.passwordStrength");

export const guestLoginSchema = z.object({identifier: required(40), password: z.string().min(1, "validation.required").max(128)});
export const staffLoginSchema = z.object({username: required(40), password: z.string().min(1, "validation.required").max(128)});

export const deskRegisterSchema = z.object({fullName: required(80), phone, email, notes: optional(300), checkIn: checkbox, category: z.enum(GUEST_CATEGORIES).default("visitor")});

export const guestEditSchema = z.object({fullName: required(80), phone, email, notes: optional(300)});

export const contactSchema = z.object({phone, email});

export const changePasswordSchema = z
  .object({currentPassword: z.string().min(1, "validation.required"), password: newPassword, confirmPassword: z.string()})
  .refine((value) => value.password === value.confirmPassword, {message: "validation.passwordMatch", path: ["confirmPassword"]});

export const guestCodeSchema = z.object({code: required(40)});

/** IT Desk: a guest's totals. Wins can't exceed games played (checked here for the form, and again in the data layer). */
export const gameResultSchema = z
  .object({code: required(40), gamesPlayed: int(0, 500), gamesWon: int(0, 500)})
  .refine((value) => value.gamesWon <= value.gamesPlayed, {message: "validation.wonExceedsPlayed", path: ["gamesWon"]});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.time");

export const activitySchema = z
  .object({
    id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    title: required(100),
    titleAr: optional(100),
    description: text(500).default(""),
    descriptionAr: optional(500),
    location: required(100),
    locationAr: optional(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date"),
    startTime: time,
    endTime: time,
    category: z.enum(ACTIVITY_CATEGORIES),
    isActive: checkbox,
  })
  .refine((value) => value.endTime > value.startTime, {message: "validation.endAfterStart", path: ["endTime"]});

export const announcementSchema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  title: required(100),
  body: required(1000),
  isPublished: checkbox,
});

export const galleryMetaSchema = z.object({title: required(100), caption: optional(240), category: required(40), albumYear: int(2000, 2100)});

export const staffCreateSchema = z.object({
  username: required(32).regex(/^[a-z0-9._-]{3,32}$/i, "validation.username"),
  fullName: required(80),
  role: z.enum(STAFF_ROLES),
  password: newPassword,
});

export const staffUpdateSchema = z.object({id: z.uuid(), fullName: required(80), role: z.enum(STAFF_ROLES), isActive: checkbox});

export const staffPasswordSchema = z.object({id: z.uuid(), password: newPassword});

export const settingsSchema = z.object({
  eventName: required(100),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date"),
  eventVenue: required(120),
  contactEmail: z.string().trim().pipe(z.email("validation.email")),
  contactPhone: text(40),
  countdownEnabled: checkbox,
  countdownDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date"),
  countdownLabelEn: text(60).default(""),
  countdownLabelAr: text(60).default(""),
  universityDomains: required(200),
});

/* Online registration. Type-specific rules (university email, duplicates) are enforced again in the data layer. */
const optionalText = (max: number) => text(max).optional().transform((value) => value || "");
export const registrationSchema = z
  .object({
    type: z.enum(GUEST_CATEGORIES),
    fullName: required(80),
    email: email,
    phone: optionalText(32).refine((value) => !value || normalizeInternationalPhone(value) !== null, "validation.phoneIntl"),
    studentId: optionalText(20),
    jobTitle: optionalText(80),
    password: newPassword,
    confirmPassword: z.string(),
    family: checkbox,
    children: z.array(required(80)).max(12, "validation.tooManyChildren").default([]),
  })
  .superRefine((value, ctx) => {
    const need = (path: string, ok: boolean, message = "validation.required") => {
      if (!ok) ctx.addIssue({code: "custom", path: [path], message});
    };
    if (value.type === "student" || value.type === "staff") need("email", Boolean(value.email));
    if (value.type === "visitor" || value.type === "graduate") need("phone", Boolean(value.phone));
    if (value.type === "graduate") need("studentId", /^[A-Za-z0-9-]{4,20}$/.test(value.studentId), value.studentId ? "validation.studentId" : "validation.required");
    if (value.type === "staff") need("jobTitle", Boolean(value.jobTitle));
    need("confirmPassword", value.password === value.confirmPassword, "validation.passwordMatch");
  });

export const rejectRegistrationSchema = z.object({id: z.uuid(), reason: optional(300)});

/* Ranks & winners (administrators). */
const year = int(2000, 2100);
export const attendanceSchema = z.object({guestId: z.uuid(), year});
export const thresholdsSchema = z
  .object({silver: int(1, 100), gold: int(1, 100), platinum: int(1, 100), crystal: int(1, 100)})
  .refine((value) => value.silver < value.gold && value.gold < value.platinum && value.platinum < value.crystal, {message: "validation.thresholdsOrder", path: ["crystal"]});
export const announceWinnerSchema = z.object({guestCode: required(20), prize: required(80), message: optional(300)});
