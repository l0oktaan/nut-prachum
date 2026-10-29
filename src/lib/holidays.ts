import "server-only";

// Google's public Thai holidays calendar: kept current (substitute days, newly declared holidays).
const SOURCE =
  "https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics";
const TTL_MS = 12 * 60 * 60 * 1000;

/** Date ("YYYY-MM-DD") → holiday name. */
export type Holidays = Record<string, string>;

let cache: { at: number; data: Holidays } | null = null;
let lastGood: string | null = null;
let lastError: string | null = null;

/** For the super admin status page. */
export const holidaysStatus = () => ({
  count: cache ? Object.keys(cache.data).length : null,
  fetchedAt: lastGood,
  lastError,
});

/** Public holidays only — the feed also lists observances (วันสำคัญ) such as Valentine's Day. */
function parse(ics: string): Holidays {
  const out: Holidays = {};
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  for (const event of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const field = (name: string) => event.match(new RegExp(`^${name}[^:\\r\\n]*:(.*)$`, "m"))?.[1]?.trim() ?? "";
    const date = field("DTSTART").match(/^(\d{4})(\d{2})(\d{2})/);
    if (!date || !field("DESCRIPTION").startsWith("วันหยุดนักขัตฤกษ์")) continue;
    const name = field("SUMMARY").replace(/​/g, "").replace(/\\,/g, ",").trim();
    const iso = `${date[1]}-${date[2]}-${date[3]}`;
    out[iso] = out[iso] ? `${out[iso]} · ${name}` : name;
  }
  return out;
}

/** Thai public holidays, refreshed twice a day; on a failed fetch the last good copy (or nothing) is used. */
export async function getHolidays(): Promise<Holidays> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(`holidays feed: HTTP ${res.status}`);
    const data = parse(await res.text());
    if (!Object.keys(data).length) throw new Error("holidays feed: no public holidays found");
    cache = { at: Date.now(), data };
    lastGood = new Date().toISOString();
    lastError = null;
  } catch (err) {
    console.warn("[holidays]", (err as Error).message);
    lastError = (err as Error).message;
    // Retry in an hour rather than on every request.
    cache = { at: Date.now() - TTL_MS + 60 * 60 * 1000, data: cache?.data ?? {} };
  }
  return cache.data;
}
