import "server-only";
import type { NextRequest } from "next/server";
import { query } from "./db";

/** Things worth a look in the super admin's security tab. */
export type SecurityEventKind =
  | "admin_key_failed"
  | "personal_link_failed"
  | "participant_cap"
  | "superadmin_login_ok"
  | "superadmin_login_failed"
  | "superadmin_locked"
  | "superadmin_logout"
  | "superadmin_room_deleted"
  | "superadmin_admin_key_reset"
  | "superadmin_cleanup"
  | "email_sent"
  | "email_failed"
  | "email_throttled"
  | "email_copy_kept"
  | "superadmin_settings"
  | "auto_cleanup";

export interface SecurityEvent {
  id: string;
  at: string;
  kind: SecurityEventKind;
  ip: string | null;
  slug: string | null;
  detail: string;
}

/** Events are kept this long, then pruned. */
export const SECURITY_EVENT_DAYS = 90;

/** The visitor's IP as Traefik saw it (it overwrites any client-sent forwarding headers). */
export const clientIp = (req: NextRequest) =>
  req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

/** Records an event; never fails the request that triggered it. */
export async function logSecurityEvent(
  kind: SecurityEventKind,
  req: NextRequest,
  extra: { slug?: string; detail?: string } = {},
) {
  try {
    await query("INSERT INTO security_events (kind, ip, slug, detail) VALUES ($1, $2, $3, $4)", [
      kind,
      clientIp(req),
      extra.slug ?? null,
      (extra.detail ?? "").slice(0, 500),
    ]);
  } catch (err) {
    console.warn("[security-log]", (err as Error).message);
  }
}

/** Records something the server did on its own (no request, so no IP). */
export async function logSystemEvent(kind: SecurityEventKind, extra: { detail?: string } = {}) {
  try {
    await query("INSERT INTO security_events (kind, detail) VALUES ($1, $2)", [kind, (extra.detail ?? "").slice(0, 500)]);
  } catch (err) {
    console.warn("[security-log]", (err as Error).message);
  }
}

export async function listSecurityEvents(sinceHours: number, limit = 300): Promise<SecurityEvent[]> {
  await query(`DELETE FROM security_events WHERE at < now() - make_interval(days => $1)`, [SECURITY_EVENT_DAYS]);
  const rows = await query<{ id: string; at: Date; kind: SecurityEventKind; ip: string | null; slug: string | null; detail: string }>(
    `SELECT id::text, at, kind, ip, slug, detail FROM security_events
      WHERE at > now() - make_interval(hours => $1) ORDER BY at DESC LIMIT $2`,
    [sinceHours, limit],
  );
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
}

/** How many kept events are older than the window — so an empty view can say there's more. */
export async function countOlderEvents(sinceHours: number): Promise<number> {
  const rows = await query<{ n: number }>(
    "SELECT count(*)::int AS n FROM security_events WHERE at <= now() - make_interval(hours => $1)",
    [sinceHours],
  );
  return rows[0].n;
}

export async function countSecurityEvents(sinceHours: number): Promise<Record<string, number>> {
  const rows = await query<{ kind: string; n: number }>(
    `SELECT kind, count(*)::int AS n FROM security_events
      WHERE at > now() - make_interval(hours => $1) GROUP BY kind`,
    [sinceHours],
  );
  return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}
