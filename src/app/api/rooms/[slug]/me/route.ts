import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, json, nameSchema, parseBody } from "@/lib/api";
import {
  addParticipant,
  claimParticipant,
  findParticipantByToken,
  getRoom,
  toMe,
  touchParticipant,
} from "@/lib/rooms";
import { clearSession, readSessionParticipant, setSession } from "@/lib/session";

type Ctx = RouteContext<"/api/rooms/[slug]/me">;

/** Who am I in this room? Also records the visit so the organizer can see who opened the link. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const room = await getRoom(slug);
  if (!room) return fail(404, "ไม่พบห้องนัดประชุมนี้");
  const current = await readSessionParticipant(room);
  if (!current) return json({ me: null });
  const updated = await touchParticipant(current.id);
  return json({ me: updated ? toMe(updated) : null });
}

const Identify = z.union([
  z.object({ token: z.string().min(10).max(100) }),
  z.object({ participantId: z.uuid() }),
  z.object({ name: nameSchema }),
]);

/** Identify via a personal link token, by picking an invited name, or by adding a new name. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const room = await getRoom(slug);
  if (!room) return fail(404, "ไม่พบห้องนัดประชุมนี้");
  const body = await parseBody(req, Identify);
  if (!body.ok) return body.res;
  const input = body.data;

  let participant;
  if ("token" in input) {
    const found = await findParticipantByToken(room.id, input.token);
    if (!found) return fail(404, "ลิงก์ส่วนตัวนี้ใช้ไม่ได้แล้ว กรุณาขอลิงก์ใหม่จากผู้จัด");
    participant = await touchParticipant(found.id);
  } else if ("participantId" in input) {
    participant = await claimParticipant(room.id, input.participantId);
    if (!participant) {
      return fail(409, "ชื่อนี้มีผู้ยืนยันตัวตนแล้ว หากเป็นคุณ กรุณาใช้ลิงก์ส่วนตัว หรือติดต่อผู้จัด");
    }
  } else {
    if (room.is_locked) return fail(403, "ผู้จัดปิดรับคำตอบแล้ว");
    if (!room.allow_new_members) return fail(403, "ห้องนี้รับเฉพาะรายชื่อที่ผู้จัดกำหนดไว้");
    const added = await addParticipant(room.id, input.name, { invited: false, claim: true });
    if (!added.ok) return fail(409, "มีชื่อนี้อยู่ในห้องแล้ว กรุณาเลือกจากรายชื่อ หรือใช้ชื่ออื่น");
    participant = added.participant;
  }
  if (!participant) return fail(404, "ไม่พบผู้เข้าร่วม");

  await setSession(room.slug, participant.token);
  return json({ me: toMe(participant) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  await clearSession(slug);
  return json({ me: null });
}
