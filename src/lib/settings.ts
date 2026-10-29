import "server-only";
import { query } from "./db";

/** Site-wide options the super admin controls. */
export interface SiteSettings {
  /** Delete rooms this many days after their last offered date; null = keep until the organizer deletes. */
  retentionDays: number | null;
  /** Whether /privacy is public (and linked from the footer). */
  privacyPublished: boolean;
}

export const RETENTION_OPTIONS = [30, 90, 180, 365] as const;

const DEFAULTS: SiteSettings = { retentionDays: null, privacyPublished: false };

let cache: { at: number; value: SiteSettings } | null = null;

export async function getSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const rows = await query<{ key: string; value: unknown }>("SELECT key, value FROM app_settings");
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const value: SiteSettings = {
    retentionDays:
      typeof stored.retentionDays === "number" && (RETENTION_OPTIONS as readonly number[]).includes(stored.retentionDays)
        ? stored.retentionDays
        : DEFAULTS.retentionDays,
    privacyPublished: typeof stored.privacyPublished === "boolean" ? stored.privacyPublished : DEFAULTS.privacyPublished,
  };
  cache = { at: Date.now(), value };
  return value;
}

export async function updateSettings(patch: Partial<SiteSettings>) {
  for (const [key, value] of Object.entries(patch)) {
    await query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    );
  }
  cache = null;
}

/** When the automatic cleanup last ran, and what it did (shown on the super admin page). */
export async function getLastCleanup(): Promise<{ at: string; deleted: number } | null> {
  const rows = await query<{ value: { at: string; deleted: number } }>(
    "SELECT value FROM app_settings WHERE key = 'lastAutoCleanup'",
  );
  return rows[0]?.value ?? null;
}

export async function recordCleanup(deleted: number) {
  await query(
    `INSERT INTO app_settings (key, value) VALUES ('lastAutoCleanup', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify({ at: new Date().toISOString(), deleted })],
  );
}
