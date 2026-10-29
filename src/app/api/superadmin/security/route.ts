import type { NextRequest } from "next/server";
import { listSecurityEvents } from "@/lib/security-log";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";
import { trafficSummary } from "@/lib/traefik-log";

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const hours = Math.min(168, Math.max(1, Number(req.nextUrl.searchParams.get("hours")) || 24));
  const [events, traffic] = await Promise.all([listSecurityEvents(hours), trafficSummary(hours)]);
  return privateJson({ hours, events, traffic });
}
