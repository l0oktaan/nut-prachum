import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  dateSchema,
  datesSchema,
  durationSchema,
  fail,
  json,
  noBlockMessage,
  parseBody,
  requireAdmin,
} from "@/lib/api";
import { deleteRoom, getAdminSnapshot, setRoomDates, toRoomPublic, updateRoom } from "@/lib/rooms";
import { blockStarts, getSlots } from "@/lib/slots";

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
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  const body = await parseBody(req, UpdateRoom);
  if (!body.ok) return body.res;

  const { final, dates, durationDays } = body.data;
  const current = toRoomPublic(auth.room);
  const next = {
    ...current,
    dates: dates ?? current.dates,
    durationDays: durationDays ?? current.durationDays,
  };
  const starts = new Set(blockStarts(next));
  if ((dates || durationDays) && !starts.size) return fail(400, noBlockMessage(next.durationDays));

  // A confirmed meeting must start a full run of consecutive offered days at a real slot.
  const isValid = (f: { date: string; slot: number }) =>
    starts.has(f.date) && getSlots(next).some((s) => s.key === f.slot);
  if (final && !isValid(final)) return fail(400, "ช่วงเวลาที่เลือกไม่อยู่ในห้องนี้");

  // Changing dates or length can invalidate an earlier confirmation — clear it rather than keep a bad one.
  let finalUpdate = final;
  if (final === undefined && current.finalDate && current.finalSlot !== null) {
    if (!isValid({ date: current.finalDate, slot: current.finalSlot })) finalUpdate = null;
  }

  const removedAnswers = dates ? await setRoomDates(auth.room, dates) : 0;
  await updateRoom(auth.room, { ...body.data, final: finalUpdate });
  return json({ ok: true, removedAnswers });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  await deleteRoom(auth.room);
  return json({ ok: true });
}
