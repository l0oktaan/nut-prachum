import type { NextRequest } from "next/server";
import { countOlderEvents, listSecurityEvents, SECURITY_EVENT_DAYS } from "@/lib/security-log";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";
import { trafficSummary } from "@/lib/traefik-log";

// App events are kept 90 days; Traefik's access log only reaches back 7.
const TRAFFIC_MAX_HOURS = 168;

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const asked = Number(req.nextUrl.searchParams.get("hours")) || TRAFFIC_MAX_HOURS;
  const hours = Math.min(SECURITY_EVENT_DAYS * 24, Math.max(1, asked));
  const trafficHours = Math.min(hours, TRAFFIC_MAX_HOURS);
  const [events, older, traffic] = await Promise.all([
    listSecurityEvents(hours),
    countOlderEvents(hours),
    trafficSummary(trafficHours),
  ]);
  return privateJson({ hours, trafficHours, events, older, traffic });
}
