import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  dateSchema,
  dateSlotsSchema,
  datesSchema,
  durationSchema,
  fail,
  json,
  parseBody,
  requireAdmin,
  scheduleError,
} from "@/lib/api";
import { deleteRoom, getAdminSnapshot, setRoomSchedule, toRoomPublic, updateRoom } from "@/lib/rooms";
import { blockSlots, cleanDateSlots, getDates } from "@/lib/slots";

type Ctx = RouteContext<"/api/rooms/[slug]/admin">;

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  return json(await getAdminSnapshot(auth.room));
}

const UpdateRoom = z.object({
  title: z.string().trim().min(1, "กรุณากรอกหัวข้อการประชุม").max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  allowNewMembers: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  final: z.object({ date: dateSchema, slot: z.number().int() }).nullable().optional(),
  dates: datesSchema.optional(),
  durationDays: durationSchema.optional(),
  dateSlots: dateSlotsSchema.optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  const body = await parseBody(req, UpdateRoom);
  if (!body.ok) return body.res;

  const { final, dates, durationDays, dateSlots } = body.data;
  const current = toRoomPublic(auth.room);
  const next = {
    ...current,
    dates: dates ?? current.dates,
    durationDays: durationDays ?? current.durationDays,
  };
  next.dateSlots = cleanDateSlots(next, dateSlots ?? current.dateSlots);
  const scheduleChanged = dates !== undefined || dateSlots !== undefined;
  const problem = scheduleError(next);
  if ((scheduleChanged || durationDays) && problem) return fail(400, problem);

  // A confirmed meeting must start a full run of consecutive offered days at a slot offered on each of them.
  const isValid = (f: { date: string; slot: number }) => blockSlots(next, f.date).some((s) => s.key === f.slot);
  if (final && !isValid(final)) return fail(400, "ช่วงเวลาที่เลือกไม่อยู่ในห้องนี้");

  // Changing dates or length can invalidate an earlier confirmation — clear it rather than keep a bad one.
  let finalUpdate = final;
  if (final === undefined && current.finalDate && current.finalSlot !== null) {
    if (!isValid({ date: current.finalDate, slot: current.finalSlot })) finalUpdate = null;
  }

  const removedAnswers = scheduleChanged ? await setRoomSchedule(auth.room, getDates(next), next.dateSlots) : 0;
  await updateRoom(auth.room, { ...body.data, final: finalUpdate });
  return json({ ok: true, removedAnswers });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  await deleteRoom(auth.room);
  return json({ ok: true });
}
