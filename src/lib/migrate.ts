import { pool } from "./db";

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS rooms (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE,
  title              text NOT NULL,
  description        text NOT NULL DEFAULT '',
  organizer_name     text NOT NULL DEFAULT '',
  start_date         date NOT NULL,
  end_date           date NOT NULL,
  exclude_weekends   boolean NOT NULL DEFAULT false,
  time_mode          text NOT NULL DEFAULT 'period' CHECK (time_mode IN ('day', 'period', 'hour')),
  day_start_min      int NOT NULL DEFAULT 540,
  day_end_min        int NOT NULL DEFAULT 1080,
  slot_minutes       int NOT NULL DEFAULT 60,
  allow_new_members  boolean NOT NULL DEFAULT true,
  is_locked          boolean NOT NULL DEFAULT false,
  final_date         date,
  final_slot         int,
  admin_key_hash     text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name          text NOT NULL,
  token         text NOT NULL UNIQUE,
  invited       boolean NOT NULL DEFAULT false,
  claimed_at    timestamptz,
  last_seen_at  timestamptz,
  responded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS participants_room_name_uq ON participants (room_id, lower(name));
CREATE INDEX IF NOT EXISTS participants_room_idx ON participants (room_id);

CREATE TABLE IF NOT EXISTS availability (
  participant_id  uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  date            date NOT NULL,
  slot            int NOT NULL,
  level           smallint NOT NULL CHECK (level IN (1, 2)),
  PRIMARY KEY (participant_id, date, slot)
);

-- Hand-picked dates (empty = use start_date..end_date range).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS dates date[] NOT NULL DEFAULT '{}';

-- Meeting length in consecutive days (same slot each day).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS duration_days int NOT NULL DEFAULT 1;

-- Per-date slot keys, e.g. {"2026-11-03": [0]} (a date not listed offers every slot).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS date_slots jsonb NOT NULL DEFAULT '{}';

-- Key members the meeting needs (ranked first when they can all make it).
ALTER TABLE participants ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;

-- A member's note to the organizer, e.g. "busy until 15:00 on the 3rd".
ALTER TABLE participants ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
`;

export async function migrate(retries = 15): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(SCHEMA);
      console.log("[db] schema is up to date");
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(`[db] not ready (attempt ${attempt}/${retries}), retrying…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
