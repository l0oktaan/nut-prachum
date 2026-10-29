import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api";
import { cleanupPreview, cleanupRun } from "@/lib/ops";
import { logSecurityEvent } from "@/lib/security-log";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";

const Cleanup = z.object({
  kind: z.enum(["expired", "empty"]),
  days: z.number().int().min(1).max(3650),
});

/** Preview: how many rooms a cleanup would delete, with a sample. */
export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const p = req.nextUrl.searchParams;
  const parsed = Cleanup.safeParse({ kind: p.get("kind"), days: Number(p.get("days")) });
  if (!parsed.success) return privateJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
  return privateJson(await cleanupPreview(parsed.data.kind, parsed.data.days));
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const body = await parseBody(req, Cleanup);
  if (!body.ok) return body.res;
  const deleted = await cleanupRun(body.data.kind, body.data.days);
  await logSecurityEvent("superadmin_cleanup", req, {
    detail: `${body.data.kind} > ${body.data.days} วัน: ลบ ${deleted} ห้อง`,
  });
  return privateJson({ deleted });
}
