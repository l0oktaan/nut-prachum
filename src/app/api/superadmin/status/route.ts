import { systemStatus } from "@/lib/ops";
import { countSecurityEvents } from "@/lib/security-log";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const [status, events24h] = await Promise.all([systemStatus(), countSecurityEvents(24)]);
  return privateJson({ ...status, events24h });
}
