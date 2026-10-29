import "server-only";
import { isUniqueViolation, query, transaction } from "./db";
import { getDates, getSlots, isOffered, type Level, type SlotConfig, type TimeMode } from "./slots";
import { hashSecret, newSecret, newSlug, secretMatches } from "./tokens";
import type {
  AdminSnapshot,
  Cell,
  Me,
  ParticipantAdmin,
  ParticipantPublic,
  RoomPublic,
  Snapshot,
} from "./types";

interface RoomRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  organizer_name: string;
  dates: string[];
  start_date: string;
  end_date: string;
  exclude_weekends: boolean;
  time_mode: TimeMode;
  day_start_min: number;
  day_end_min: number;
  slot_minutes: number;
  duration_days: number;
  date_slots: Record<string, number[]>;
  allow_new_members: boolean;
  is_locked: boolean;
  final_date: string | null;
  final_slot: number | null;
  admin_key_hash: string;
  created_at: Date;
}

interface ParticipantRow {
  id: string;
  room_id: string;
  name: string;
  token: string;
  invited: boolean;
  claimed_at: Date | null;
  last_seen_at: Date | null;
  responded_at: Date | null;
  created_at: Date;
}

export type Room = RoomRow;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toRoomPublic(r: RoomRow): RoomPublic {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    organizerName: r.organizer_name,
    dates: r.dates,
    startDate: r.start_date,
    endDate: r.end_date,
    excludeWeekends: r.exclude_weekends,
    timeMode: r.time_mode,
    dayStartMin: r.day_start_min,
    dayEndMin: r.day_end_min,
    slotMinutes: r.slot_minutes,
    durationDays: r.duration_days,
    dateSlots: r.date_slots,
    allowNewMembers: r.allow_new_members,
    isLocked: r.is_locked,
    finalDate: r.final_date,
    finalSlot: r.final_slot,
    createdAt: r.created_at.toISOString(),
  };
}

function toParticipantPublic(p: ParticipantRow): ParticipantPublic {
  return {
    id: p.id,
    name: p.name,
    invited: p.invited,
    claimed: p.claimed_at !== null,
    respondedAt: iso(p.responded_at),
  };
}

function toParticipantAdmin(p: ParticipantRow): ParticipantAdmin {
  return {
    ...toParticipantPublic(p),
    token: p.token,
    claimedAt: iso(p.claimed_at),
    lastSeenAt: iso(p.last_seen_at),
    createdAt: p.created_at.toISOString(),
  };
}

export function toMe(p: ParticipantRow): Me {
  return { id: p.id, name: p.name, token: p.token, respondedAt: iso(p.responded_at) };
}

/* ---------------------------------- rooms --------------------------------- */

export interface CreateRoomInput {
  title: string;
  description: string;
  organizerName: string;
  dates: string[];
  timeMode: TimeMode;
  dayStartMin: number;
  dayEndMin: number;
  slotMinutes: number;
  durationDays: number;
  dateSlots: Record<string, number[]>;
  allowNewMembers: boolean;
  members: string[];
}

export async function createRoom(input: CreateRoomInput) {
  const adminKey = newSecret();
  const dates = [...input.dates].sort();
  return transaction(async (db) => {
    let room: RoomRow | undefined;
    for (let attempt = 0; !room; attempt++) {
      try {
        await db.query("SAVEPOINT slug_try");
        const res = await db.query<RoomRow>(
          `INSERT INTO rooms (slug, title, description, organizer_name, dates, start_date, end_date,
             time_mode, day_start_min, day_end_min, slot_minutes, allow_new_members, admin_key_hash, duration_days,
             date_slots)
           VALUES ($1,$2,$3,$4,$5::date[],$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) RETURNING *`,
          [
            newSlug(),
            input.title,
            input.description,
            input.organizerName,
            dates,
            dates[0],
            dates[dates.length - 1],
            input.timeMode,
            input.dayStartMin,
            input.dayEndMin,
            input.slotMinutes,
            input.allowNewMembers,
            hashSecret(adminKey),
            input.durationDays,
            JSON.stringify(input.dateSlots),
          ],
        );
        room = res.rows[0];
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= 4) throw err;
        await db.query("ROLLBACK TO SAVEPOINT slug_try");
      }
    }
    for (const name of input.members) {
      await db.query(
        `INSERT INTO participants (room_id, name, token, invited) VALUES ($1, $2, $3, true)
         ON CONFLICT DO NOTHING`,
        [room.id, name, newSecret(18)],
      );
    }
    return { slug: room.slug, adminKey };
  });
}

export async function getRoom(slug: string): Promise<RoomRow | null> {
  const rows = await query<RoomRow>("SELECT * FROM rooms WHERE slug = $1", [slug]);
  return rows[0] ?? null;
}

export async function getAdminRoom(slug: string, adminKey: string | null): Promise<RoomRow | null> {
  if (!adminKey) return null;
  const room = await getRoom(slug);
  return room && secretMatches(adminKey, room.admin_key_hash) ? room : null;
}

async function loadParticipants(roomId: string) {
  return query<ParticipantRow>(
    "SELECT * FROM participants WHERE room_id = $1 ORDER BY invited DESC, created_at, name",
    [roomId],
  );
}

async function loadCells(roomId: string): Promise<Cell[]> {
  const rows = await query<{ participant_id: string; date: string; slot: number; level: Level }>(
    `SELECT a.participant_id, a.date, a.slot, a.level
       FROM availability a JOIN participants p ON p.id = a.participant_id
      WHERE p.room_id = $1`,
    [roomId],
  );
  return rows.map((r) => ({ p: r.participant_id, d: r.date, s: r.slot, l: r.level }));
}

export async function getSnapshot(slug: string): Promise<Snapshot | null> {
  const room = await getRoom(slug);
  if (!room) return null;
  const [participants, cells] = await Promise.all([loadParticipants(room.id), loadCells(room.id)]);
  return {
    room: toRoomPublic(room),
    participants: participants.map(toParticipantPublic),
    cells,
  };
}

export async function getAdminSnapshot(room: RoomRow): Promise<AdminSnapshot> {
  const [participants, cells] = await Promise.all([loadParticipants(room.id), loadCells(room.id)]);
  return {
    room: toRoomPublic(room),
    participants: participants.map(toParticipantAdmin),
    cells,
  };
}

export interface RoomSettings {
  title?: string;
  description?: string;
  allowNewMembers?: boolean;
  isLocked?: boolean;
  durationDays?: number;
  final?: { date: string; slot: number } | null;
}

export async function updateRoom(room: RoomRow, s: RoomSettings) {
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, v: unknown) => {
    params.push(v);
    sets.push(`${col} = $${params.length}`);
  };
  if (s.title !== undefined) add("title", s.title);
  if (s.description !== undefined) add("description", s.description);
  if (s.allowNewMembers !== undefined) add("allow_new_members", s.allowNewMembers);
  if (s.isLocked !== undefined) add("is_locked", s.isLocked);
  if (s.durationDays !== undefined) add("duration_days", s.durationDays);
  if (s.final !== undefined) {
    add("final_date", s.final?.date ?? null);
    add("final_slot", s.final?.slot ?? null);
  }
  if (!sets.length) return;
  params.push(room.id);
  await query(`UPDATE rooms SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length}`, params);
}

/**
 * Replaces the room's dates (converting older range-based rooms to a date list) and per-date slots.
 * Answers on removed dates or slots are deleted, and a confirmed meeting on a removed date is cleared.
 * Returns how many answer cells were removed.
 */
export async function setRoomSchedule(
  room: RoomRow,
  dates: string[],
  dateSlots: Record<string, number[]>,
): Promise<number> {
  return transaction(async (db) => {
    const removed = await db.query(
      `DELETE FROM availability a USING participants p
        WHERE p.id = a.participant_id AND p.room_id = $1
          AND (NOT (a.date = ANY($2::date[]))
               OR ($3::jsonb ? a.date::text AND NOT ($3::jsonb -> a.date::text) @> to_jsonb(a.slot)))`,
      [room.id, dates, JSON.stringify(dateSlots)],
    );
    await db.query(
      `UPDATE rooms SET dates = $2::date[], start_date = $3, end_date = $4, exclude_weekends = false,
              date_slots = $5::jsonb,
              final_date = CASE WHEN final_date = ANY($2::date[]) THEN final_date END,
              final_slot = CASE WHEN final_date = ANY($2::date[]) THEN final_slot END,
              updated_at = now()
        WHERE id = $1`,
      [room.id, dates, dates[0], dates[dates.length - 1], JSON.stringify(dateSlots)],
    );
    return removed.rowCount ?? 0;
  });
}

export async function deleteRoom(room: RoomRow) {
  await query("DELETE FROM rooms WHERE id = $1", [room.id]);
}

/* ------------------------------ participants ------------------------------ */

export async function findParticipantByToken(roomId: string, token: string) {
  const rows = await query<ParticipantRow>(
    "SELECT * FROM participants WHERE room_id = $1 AND token = $2",
    [roomId, token],
  );
  return rows[0] ?? null;
}

/** Marks the participant as seen; the first visit also counts as claiming the name. */
export async function touchParticipant(id: string) {
  const rows = await query<ParticipantRow>(
    `UPDATE participants SET last_seen_at = now(), claimed_at = COALESCE(claimed_at, now())
      WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

/** Claims an unclaimed name from the invite list. Returns null if someone already claimed it. */
export async function claimParticipant(roomId: string, participantId: string) {
  const rows = await query<ParticipantRow>(
    `UPDATE participants SET claimed_at = now(), last_seen_at = now()
      WHERE id = $1 AND room_id = $2 AND claimed_at IS NULL RETURNING *`,
    [participantId, roomId],
  );
  return rows[0] ?? null;
}

export type AddResult = { ok: true; participant: ParticipantRow } | { ok: false; reason: "duplicate" };

export async function addParticipant(
  roomId: string,
  name: string,
  opts: { invited: boolean; claim: boolean },
): Promise<AddResult> {
  try {
    const rows = await query<ParticipantRow>(
      `INSERT INTO participants (room_id, name, token, invited, claimed_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [roomId, name, newSecret(18), opts.invited, opts.claim ? new Date() : null],
    );
    return { ok: true, participant: rows[0] };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: "duplicate" };
    throw err;
  }
}

export async function removeParticipant(roomId: string, id: string) {
  await query("DELETE FROM participants WHERE id = $1 AND room_id = $2", [id, roomId]);
}

/** Issues a new personal link and frees the name so it can be claimed again. */
export async function resetParticipant(roomId: string, id: string) {
  await query(
    `UPDATE participants SET token = $3, claimed_at = NULL WHERE id = $1 AND room_id = $2`,
    [id, roomId, newSecret(18)],
  );
}

export async function renameParticipant(roomId: string, id: string, name: string) {
  try {
    await query("UPDATE participants SET name = $3 WHERE id = $1 AND room_id = $2", [id, roomId, name]);
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/* ------------------------------ availability ------------------------------ */

export async function saveAvailability(
  room: RoomRow,
  participantId: string,
  cells: { d: string; s: number; l: Level }[],
) {
  const config: SlotConfig = toRoomPublic(room);
  const validDates = new Set(getDates(config));
  const validSlots = new Set(getSlots(config).map((s) => s.key));
  const clean = cells.filter((c) => validDates.has(c.d) && validSlots.has(c.s) && isOffered(config, c.d, c.s));

  await transaction(async (db) => {
    await db.query("DELETE FROM availability WHERE participant_id = $1", [participantId]);
    if (clean.length) {
      await db.query(
        `INSERT INTO availability (participant_id, date, slot, level)
         SELECT $1, d, s, l FROM unnest($2::date[], $3::int[], $4::smallint[]) AS t(d, s, l)
         ON CONFLICT DO NOTHING`,
        [participantId, clean.map((c) => c.d), clean.map((c) => c.s), clean.map((c) => c.l)],
      );
    }
    await db.query(
      "UPDATE participants SET responded_at = now(), last_seen_at = now() WHERE id = $1",
      [participantId],
    );
  });
}
