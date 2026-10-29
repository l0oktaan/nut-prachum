import type { NextRequest } from "next/server";
import { z } from "zod";
import { dateSchema, fail, json, parseBody } from "@/lib/api";
import { getRoom, saveAvailability } from "@/lib/rooms";
import { readSessionParticipant } from "@/lib/session";

const SaveAvailability = z.object({
  cells: z
    .array(
      z.object({
        d: dateSchema,
        s: z.number().int().min(0).max(1440),
        l: z.union([z.literal(1), z.literal(2)]),
      }),
    )
    .max(5000),
});

/** Replaces the current participant's availability with the given cells. */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/rooms/[slug]/availability">) {
  const { slug } = await ctx.params;
  const room = await getRoom(slug);
  if (!room) return fail(404, "ไม่พบห้องนัดประชุมนี้");
  if (room.is_locked) return fail(403, "ผู้จัดปิดรับคำตอบแล้ว");

  const participant = await readSessionParticipant(room);
  if (!participant) return fail(401, "กรุณาระบุตัวตนก่อนเลือกเวลา");

  const body = await parseBody(req, SaveAvailability);
  if (!body.ok) return body.res;

  await saveAvailability(room, participant.id, body.data.cells);
  return json({ ok: true, savedAt: new Date().toISOString() });
}
