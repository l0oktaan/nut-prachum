import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api";
import { runAutoCleanup } from "@/lib/auto-cleanup";
import { logSecurityEvent } from "@/lib/security-log";
import { getLastCleanup, getSettings, RETENTION_OPTIONS, updateSettings } from "@/lib/settings";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const [settings, lastCleanup] = await Promise.all([getSettings(), getLastCleanup()]);
  return privateJson({ ...settings, lastCleanup, retentionOptions: RETENTION_OPTIONS });
}

const Update = z.object({
  retentionDays: z
    .union([
      z.null(),
      z.number().refine((n) => (RETENTION_OPTIONS as readonly number[]).includes(n), {
        message: `ระยะเวลาต้องเป็น ${RETENTION_OPTIONS.join(", ")} วัน หรือปิด`,
      }),
    ])
    .optional(),
  privacyPublished: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const body = await parseBody(req, Update);
  if (!body.ok) return body.res;
  await updateSettings(body.data);
  await logSecurityEvent("superadmin_settings", req, { detail: JSON.stringify(body.data) });
  // A newly chosen retention period applies right away, not at the next 6-hourly pass.
  if (body.data.retentionDays) await runAutoCleanup();
  const [settings, lastCleanup] = await Promise.all([getSettings(), getLastCleanup()]);
  return privateJson({ ...settings, lastCleanup, retentionOptions: RETENTION_OPTIONS });
}
