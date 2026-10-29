import "server-only";
import { cleanupRun } from "./ops";
import { logSystemEvent } from "./security-log";
import { getSettings, recordCleanup } from "./settings";

const EVERY_MS = 6 * 3600_000;

/** One pass: delete rooms past the retention period the super admin chose (if any). */
export async function runAutoCleanup() {
  const { retentionDays } = await getSettings();
  if (!retentionDays) return;
  const deleted = await cleanupRun("expired", retentionDays);
  await recordCleanup(deleted);
  if (deleted) await logSystemEvent("auto_cleanup", { detail: `ลบ ${deleted} ห้องที่เลยวันประชุมเกิน ${retentionDays} วัน` });
}

/** Runs the cleanup shortly after start-up, then every 6 hours, for the life of the server process. */
export function scheduleAutoCleanup() {
  const run = () => runAutoCleanup().catch((err) => console.warn("[auto-cleanup]", (err as Error).message));
  setTimeout(run, 60_000);
  setInterval(run, EVERY_MS).unref();
}
