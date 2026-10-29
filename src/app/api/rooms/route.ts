import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  dateSlotsSchema,
  periodsSchema,
  datesSchema,
  durationSchema,
  fail,
  json,
  nameSchema,
  parseBody,
  scheduleError,
  uniqueNames,
} from "@/lib/api";
import { emailAdminLink } from "@/lib/admin-link-mail";
import { createRoom } from "@/lib/rooms";
import { cleanDateSlots, type SlotConfig } from "@/lib/slots";

const CreateRoom = z
  .object({
    title: z.string().trim().min(1, "กรุณากรอกหัวข้อการประชุม").max(120, "หัวข้อยาวเกินไป"),
    description: z.string().trim().max(1000, "รายละเอียดยาวเกินไป").default(""),
    organizerName: z.string().trim().max(60).default(""),
    dates: datesSchema,
    timeMode: z.enum(["day", "period", "hour"]),
    dayStartMin: z.number().int().min(0).max(1440).default(540),
    dayEndMin: z.number().int().min(0).max(1440).default(1080),
    slotMinutes: z.union([z.literal(30), z.literal(60)]).default(60),
    durationDays: durationSchema.default(1),
    dateSlots: dateSlotsSchema.default({}),
    periods: periodsSchema.default([]),
    allowNewMembers: z.boolean().default(true),
    members: z.array(nameSchema).max(200, "รายชื่อสมาชิกมากเกินไป (ไม่เกิน 200 คน)").default([]),
    required: z.array(nameSchema).max(200).default([]),
    // Only used to email the admin link right now — never stored.
    organizerEmail: z.email("อีเมลไม่ถูกต้อง").max(254).optional(),
  })
  .refine((v) => v.timeMode !== "hour" || v.dayEndMin - v.dayStartMin >= v.slotMinutes, {
    message: "เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น",
  });

export async function POST(req: NextRequest) {
  const body = await parseBody(req, CreateRoom);
  if (!body.ok) return body.res;
  const { dates } = body.data;
  const config: SlotConfig = {
    ...body.data,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    excludeWeekends: false,
  };
  config.dateSlots = cleanDateSlots(config, body.data.dateSlots);
  const problem = scheduleError(config);
  if (problem) return fail(400, problem);
  const { organizerEmail, ...input } = body.data;
  const result = await createRoom({
    ...input,
    dateSlots: config.dateSlots,
    members: uniqueNames(input.members),
  });
  const mail = organizerEmail
    ? await emailAdminLink(req, { slug: result.slug, title: input.title, adminKey: result.adminKey }, organizerEmail)
    : null;
  return json({ ...result, mail }, 201);
}
