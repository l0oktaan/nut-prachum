import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, json, nameSchema, parseBody, requireAdmin } from "@/lib/api";
import { removeParticipant, renameParticipant, resetParticipant, setParticipantRequired } from "@/lib/rooms";

type Ctx = RouteContext<"/api/rooms/[slug]/admin/members/[id]">;

const UpdateMember = z.union([
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("rename"), name: nameSchema }),
  z.object({ action: z.literal("required"), required: z.boolean() }),
]);

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireAdmin(req, slug);
  if (!auth.ok) return auth.res;
  if (!isId(id)) return fail(404, "ไม่พบสมาชิก");
  const body = await parseBody(req, UpdateMember);
  if (!body.ok) return body.res;

  if (body.data.action === "reset") {
    await resetParticipant(auth.room.id, id);
  } else if (body.data.action === "required") {
    await setParticipantRequired(auth.room.id, id, body.data.required);
  } else if (!(await renameParticipant(auth.room.id, id, body.data.name))) {
    return fail(409, "มีชื่อนี้อยู่ในห้องแล้ว");
  }
  return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireAdmin(req, slug);
  if (!auth.ok) return auth.res;
  if (!isId(id)) return fail(404, "ไม่พบสมาชิก");
  await removeParticipant(auth.room.id, id);
  return json({ ok: true });
}
