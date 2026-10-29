import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  datesSchema,
  durationSchema,
  fail,
  json,
  nameSchema,
  noBlockMessage,
  parseBody,
  uniqueNames,
} from "@/lib/api";
import { createRoom } from "@/lib/rooms";
import { blockStarts } from "@/lib/slots";

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
    allowNewMembers: z.boolean().default(true),
    members: z.array(nameSchema).max(200, "รายชื่อสมาชิกมากเกินไป (ไม่เกิน 200 คน)").default([]),
  })
  .refine((v) => v.timeMode !== "hour" || v.dayEndMin - v.dayStartMin >= v.slotMinutes, {
    message: "เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น",
  });

export async function POST(req: NextRequest) {
  const body = await parseBody(req, CreateRoom);
  if (!body.ok) return body.res;
  const { dates, durationDays } = body.data;
  if (!blockStarts({ dates, durationDays, startDate: "", endDate: "", excludeWeekends: false }).length) {
    return fail(400, noBlockMessage(durationDays));
  }
  const result = await createRoom({ ...body.data, members: uniqueNames(body.data.members) });
  return json(result, 201);
}
