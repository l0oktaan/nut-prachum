import "server-only";
import { statfs } from "node:fs/promises";
import { query } from "./db";
import { holidaysStatus } from "./holidays";
import { hashSecret, newSecret } from "./tokens";

/* --------------------------------- status --------------------------------- */

export async function systemStatus() {
  const t0 = performance.now();
  await query("SELECT 1");
  const dbLatencyMs = Math.round((performance.now() - t0) * 10) / 10;

  const [counts] = await query<Record<string, string | number>>(`
    SELECT
      (SELECT count(*)::int FROM rooms)                                                  AS rooms,
      (SELECT count(*)::int FROM rooms WHERE created_at > now() - interval '1 day')      AS rooms_24h,
      (SELECT count(*)::int FROM rooms WHERE created_at > now() - interval '7 days')     AS rooms_7d,
      (SELECT count(*)::int FROM rooms WHERE end_date >= current_date)                   AS rooms_upcoming,
      (SELECT count(*)::int FROM rooms WHERE final_date IS NOT NULL)                     AS rooms_final,
      (SELECT count(*)::int FROM participants)                                           AS participants,
      (SELECT count(*)::int FROM participants WHERE responded_at IS NOT NULL)            AS responded,
      (SELECT count(*)::int FROM availability)                                           AS answers,
      pg_database_size(current_database())::bigint                                       AS db_bytes,
      (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database())    AS db_connections,
      current_setting('server_version')                                                  AS pg_version`);

  let disk: { total: number; free: number } | null = null;
  try {
    const s = await statfs("/");
    disk = { total: s.blocks * s.bsize, free: s.bavail * s.bsize };
  } catch {
    /* not available on this platform */
  }

  const mem = process.memoryUsage();
  return {
    app: {
      node: process.version,
      uptimeSec: Math.round(process.uptime()),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      cookieSecure: process.env.COOKIE_SECURE === "true",
      appUrl: process.env.APP_URL ?? null,
    },
    db: {
      latencyMs: dbLatencyMs,
      version: String(counts.pg_version),
      sizeBytes: Number(counts.db_bytes),
      connections: Number(counts.db_connections),
    },
    counts: {
      rooms: Number(counts.rooms),
      rooms24h: Number(counts.rooms_24h),
      rooms7d: Number(counts.rooms_7d),
      roomsUpcoming: Number(counts.rooms_upcoming),
      roomsFinal: Number(counts.rooms_final),
      participants: Number(counts.participants),
      responded: Number(counts.responded),
      answers: Number(counts.answers),
    },
    disk,
    holidays: holidaysStatus(),
  };
}

/* ---------------------------------- rooms --------------------------------- */

export interface OpsRoom {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  participants: number;
  responded: number;
  answers: number;
  finalDate: string | null;
  isLocked: boolean;
}

const ROOM_COLUMNS = /* sql */ `
  r.slug, r.title, r.description, r.created_at, r.start_date, r.end_date, r.final_date, r.is_locked,
  (SELECT count(*)::int FROM participants p WHERE p.room_id = r.id) AS participants,
  (SELECT count(*)::int FROM participants p WHERE p.room_id = r.id AND p.responded_at IS NOT NULL) AS responded,
  (SELECT count(*)::int FROM availability a JOIN participants p ON p.id = a.participant_id WHERE p.room_id = r.id) AS answers`;

type OpsRoomRow = {
  slug: string;
  title: string;
  description: string;
  created_at: Date;
  start_date: string;
  end_date: string;
  final_date: string | null;
  is_locked: boolean;
  participants: number;
  responded: number;
  answers: number;
};

const toOpsRoom = (r: OpsRoomRow): OpsRoom => ({
  slug: r.slug,
  title: r.title,
  description: r.description,
  createdAt: r.created_at.toISOString(),
  startDate: r.start_date,
  endDate: r.end_date,
  participants: r.participants,
  responded: r.responded,
  answers: r.answers,
  finalDate: r.final_date,
  isLocked: r.is_locked,
});

/** Newest rooms first, optionally filtered by slug, title or description. */
export async function listRooms(search: string, limit = 100): Promise<OpsRoom[]> {
  const q = search.trim();
  const rows = await query<OpsRoomRow>(
    `SELECT ${ROOM_COLUMNS} FROM rooms r
      WHERE $1 = '' OR r.slug = $1 OR r.title ILIKE '%' || $1 || '%' OR r.description ILIKE '%' || $1 || '%'
      ORDER BY r.created_at DESC LIMIT $2`,
    [q, limit],
  );
  return rows.map(toOpsRoom);
}

export async function deleteRoomBySlug(slug: string): Promise<boolean> {
  const rows = await query("DELETE FROM rooms WHERE slug = $1 RETURNING id", [slug]);
  return rows.length > 0;
}

/** Issues a new admin key (the old link stops working) — for organizers who lost their admin link. */
export async function resetAdminKey(slug: string): Promise<string | null> {
  const key = newSecret();
  const rows = await query("UPDATE rooms SET admin_key_hash = $2, updated_at = now() WHERE slug = $1 RETURNING id", [
    slug,
    hashSecret(key),
  ]);
  return rows.length ? key : null;
}

/* --------------------------------- cleanup -------------------------------- */

export type CleanupKind = "expired" | "empty";

/**
 * expired — every offered date is more than `days` days in the past.
 * empty   — created more than `days` days ago and nobody has answered.
 */
const CLEANUP_WHERE: Record<CleanupKind, string> = {
  expired: `r.end_date < current_date - $1::int`,
  empty: `r.created_at < now() - make_interval(days => $1::int)
          AND NOT EXISTS (SELECT 1 FROM participants p WHERE p.room_id = r.id AND p.responded_at IS NOT NULL)`,
};

export async function cleanupPreview(kind: CleanupKind, days: number) {
  const where = CLEANUP_WHERE[kind];
  const [{ n }] = await query<{ n: number }>(`SELECT count(*)::int AS n FROM rooms r WHERE ${where}`, [days]);
  const sample = await query<OpsRoomRow>(
    `SELECT ${ROOM_COLUMNS} FROM rooms r WHERE ${where} ORDER BY r.created_at LIMIT 20`,
    [days],
  );
  return { count: n, sample: sample.map(toOpsRoom) };
}

export async function cleanupRun(kind: CleanupKind, days: number): Promise<number> {
  const rows = await query(`DELETE FROM rooms r WHERE ${CLEANUP_WHERE[kind]} RETURNING r.id`, [days]);
  return rows.length;
}
