import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminKeyOf, fail, json, parseBody, requireAdmin } from "@/lib/api";
import { emailAdminLink } from "@/lib/admin-link-mail";

const EmailLink = z.object({ email: z.email("อีเมลไม่ถูกต้อง").max(254) });

/** Emails the admin link (with the key the caller already holds) to the given address. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/rooms/[slug]/admin/email">) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  const body = await parseBody(req, EmailLink);
  if (!body.ok) return body.res;
  const outcome = await emailAdminLink(
    req,
    { slug: auth.room.slug, title: auth.room.title, adminKey: adminKeyOf(req)! },
    body.data.email,
  );
  if (outcome === "throttled") return fail(429, "ส่งอีเมลบ่อยเกินไป กรุณาลองใหม่ภายหลัง");
  if (outcome === "disabled") return fail(503, "ระบบส่งอีเมลยังไม่เปิดใช้งาน");
  if (outcome === "failed") return fail(502, "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่");
  return json({ ok: true });
}
