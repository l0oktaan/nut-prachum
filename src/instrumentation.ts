export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[db] DATABASE_URL is not set — skipping migration");
    return;
  }
  const { migrate } = await import("./lib/migrate");
  await migrate();
  const { scheduleAutoCleanup } = await import("./lib/auto-cleanup");
  scheduleAutoCleanup();
}
