import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, parseBody, publicOrigin } from "@/lib/api";
import { deleteRoomBySlug, resetAdminKey } from "@/lib/ops";
import { logSecurityEvent } from "@/lib/security-log";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";
import { isSlug } from "@/lib/tokens";

type Ctx = RouteContext<"/api/superadmin/rooms/[slug]">;

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const { slug } = await ctx.params;
  if (!isSlug(slug) || !(await deleteRoomBySlug(slug))) return fail(404, "ไม่พบห้องนี้");
  await logSecurityEvent("superadmin_room_deleted", req, { slug });
  return privateJson({ ok: true });
}

const Action = z.object({ action: z.literal("reset-admin-key") });

/** Issues a new admin link for an organizer who lost theirs (the old link stops working). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const { slug } = await ctx.params;
  const body = await parseBody(req, Action);
  if (!body.ok) return body.res;
  const key = isSlug(slug) ? await resetAdminKey(slug) : null;
  if (!key) return fail(404, "ไม่พบห้องนี้");
  await logSecurityEvent("superadmin_admin_key_reset", req, { slug });
  return privateJson({ adminUrl: `${publicOrigin(req)}/r/${slug}/admin#key=${key}` });
}
