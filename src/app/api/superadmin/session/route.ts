import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import { logSecurityEvent } from "@/lib/security-log";
import {
  checkLogin,
  endSession,
  lockedFor,
  privateJson,
  requireSuperadmin,
  startSession,
  superadminEnabled,
} from "@/lib/superadmin";

/** Am I signed in? (401 when not.) */
export async function GET() {
  const auth = await requireSuperadmin();
  return auth.ok ? privateJson({ ok: true }) : auth.res;
}

const Login = z.object({ token: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  if (!superadminEnabled()) return fail(404, "Not found");
  const wait = lockedFor(req);
  if (wait) return fail(429, `ใส่รหัสผิดหลายครั้ง กรุณารอ ${Math.ceil(wait / 60)} นาที`);
  const body = await parseBody(req, Login);
  if (!body.ok) return body.res;

  const result = checkLogin(req, body.data.token);
  if (result === "ok") {
    await startSession();
    await logSecurityEvent("superadmin_login_ok", req);
    return privateJson({ ok: true });
  }
  await logSecurityEvent(result === "locked" ? "superadmin_locked" : "superadmin_login_failed", req);
  return fail(result === "locked" ? 429 : 401, result === "locked" ? "ใส่รหัสผิดหลายครั้ง ระงับ 15 นาที" : "รหัสไม่ถูกต้อง");
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth.ok) await logSecurityEvent("superadmin_logout", req);
  await endSession();
  return privateJson({ ok: true });
}
