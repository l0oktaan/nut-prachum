// Shared (client + server) helpers for turning a room's settings into a grid of dates × time slots.

export type TimeMode = "day" | "period" | "hour";
export type Level = 1 | 2; // 2 = available, 1 = available if needed

export interface SlotConfig {
  /** Hand-picked dates. Empty = every day from startDate to endDate (older rooms). */
  dates: string[];
  startDate: string;
  endDate: string;
  excludeWeekends: boolean;
  timeMode: TimeMode;
  dayStartMin: number;
  dayEndMin: number;
  slotMinutes: number;
  /** How many consecutive calendar days the meeting runs (same slot each day). */
  durationDays: number;
  /** Per-date slot keys, e.g. day 1 morning only. A date not listed offers every slot. */
  dateSlots: Record<string, number[]>;
}

export interface Slot {
  key: number;
  label: string;
  sub?: string;
  start: number; // minutes from midnight
  end: number;
}

export const MAX_DAYS = 62;
export const MAX_DURATION_DAYS = 14;

export const PERIODS: Slot[] = [
  { key: 0, label: "เช้า", sub: "09:00–12:00", start: 540, end: 720 },
  { key: 1, label: "บ่าย", sub: "13:00–16:00", start: 780, end: 960 },
  { key: 2, label: "เย็น", sub: "17:00–20:00", start: 1020, end: 1200 },
];

export const TIME_MODE_LABEL: Record<TimeMode, string> = {
  day: "ทั้งวัน",
  period: "ช่วงเช้า / บ่าย / เย็น",
  hour: "รายชั่วโมง",
};

export function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function getSlots(c: SlotConfig): Slot[] {
  if (c.timeMode === "day") return [{ key: 0, label: "ทั้งวัน", start: 0, end: 1440 }];
  if (c.timeMode === "period") return PERIODS;
  const slots: Slot[] = [];
  for (let m = c.dayStartMin; m + c.slotMinutes <= c.dayEndMin; m += c.slotMinutes) {
    slots.push({ key: m, label: fmtMin(m), start: m, end: m + c.slotMinutes });
  }
  return slots;
}

/** Whether `slot` is offered on `date` (dates without a per-date pick offer every slot). */
export function isOffered(c: Pick<SlotConfig, "dateSlots">, date: string, slot: number): boolean {
  const only = c.dateSlots[date];
  return !only || only.includes(slot);
}

export function slotsForDate(c: SlotConfig, date: string): Slot[] {
  return getSlots(c).filter((s) => isOffered(c, date, s.key));
}

/**
 * Keeps only per-date picks that matter: dates the room offers, real slot keys, and not "every slot".
 * Day mode has a single slot, so it never has per-date picks.
 */
export function cleanDateSlots(c: SlotConfig, dateSlots: Record<string, number[]>): Record<string, number[]> {
  if (c.timeMode === "day") return {};
  const keys = getSlots(c).map((s) => s.key);
  const out: Record<string, number[]> = {};
  for (const d of getDates(c)) {
    const pick = dateSlots[d];
    if (!pick) continue;
    const kept = keys.filter((k) => pick.includes(k));
    if (kept.length && kept.length < keys.length) out[d] = kept;
  }
  return out;
}

function parseDate(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daySpan(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000) + 1;
}

export function isWeekend(d: string): boolean {
  const day = parseDate(d).getUTCDay();
  return day === 0 || day === 6;
}

export function getDates(c: Pick<SlotConfig, "dates" | "startDate" | "endDate" | "excludeWeekends">): string[] {
  if (c.dates.length) return [...c.dates].sort();
  const out: string[] = [];
  const cur = parseDate(c.startDate);
  const end = parseDate(c.endDate);
  for (let i = 0; cur <= end && i < MAX_DAYS; i++) {
    const iso = toISO(cur);
    if (!c.excludeWeekends || !isWeekend(iso)) out.push(iso);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function addDays(d: string, n: number): string {
  const t = parseDate(d);
  t.setUTCDate(t.getUTCDate() + n);
  return toISO(t);
}

type BlockConfig = Pick<SlotConfig, "dates" | "startDate" | "endDate" | "excludeWeekends" | "durationDays">;

/** The consecutive calendar days of a meeting starting on `start`, or null if any day isn't offered. */
export function blockDays(c: BlockConfig, start: string, offered = new Set(getDates(c))): string[] | null {
  const days = Array.from({ length: Math.max(1, c.durationDays) }, (_, i) => addDays(start, i));
  return days.every((d) => offered.has(d)) ? days : null;
}

/** Dates that can start a meeting of `durationDays` consecutive offered days. */
export function blockStarts(c: BlockConfig): string[] {
  const offered = new Set(getDates(c));
  return [...offered].filter((d) => blockDays(c, d, offered) !== null);
}

/** Slots offered on every day of a meeting starting on `start` (none if the run of days is incomplete). */
export function blockSlots(c: SlotConfig, start: string, offered?: Set<string>): Slot[] {
  const days = blockDays(c, start, offered);
  return days ? getSlots(c).filter((s) => days.every((d) => isOffered(c, d, s.key))) : [];
}

export const cellKey = (date: string, slot: number) => `${date}|${slot}`;

export function parseCellKey(key: string): { date: string; slot: number } {
  const [date, slot] = key.split("|");
  return { date, slot: Number(slot) };
}

const fmtWeekday = new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "UTC" });
const fmtMonth = new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
// th-TH uses the Buddhist calendar, so every year below renders as พ.ศ. (e.g. 2569).
const fmtMedium = new Intl.DateTimeFormat("th-TH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fmtMonthYear = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtShort = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtShortYear = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function dateParts(d: string) {
  const date = parseDate(d);
  return {
    weekday: fmtWeekday.format(date),
    day: date.getUTCDate(),
    month: fmtMonth.format(date),
    weekend: isWeekend(d),
  };
}

export const formatDateLong = (d: string) => fmtLong.format(parseDate(d));
export const formatDateMedium = (d: string) => fmtMedium.format(parseDate(d));

export function formatRange(start: string, end: string): string {
  if (start === end) return fmtShortYear.format(parseDate(start));
  return `${fmtShort.format(parseDate(start))} – ${fmtShortYear.format(parseDate(end))}`;
}

/** "พฤศจิกายน 2569" for the first day of the given month (month is 0-based). */
export const formatMonthYear = (year: number, month: number) =>
  fmtMonthYear.format(new Date(Date.UTC(year, month, 1)));

export const formatDateShortYear = (d: string) => fmtShortYear.format(parseDate(d));

export function findSlot(c: SlotConfig, key: number): Slot | undefined {
  return getSlots(c).find((s) => s.key === key);
}

export function slotLabel(c: SlotConfig, key: number): string {
  const s = findSlot(c, key);
  if (!s) return "";
  if (c.timeMode === "day") return "ทั้งวัน";
  if (c.timeMode === "period") return `ช่วง${s.label} (${s.sub})`;
  return `${fmtMin(s.start)}–${fmtMin(s.end)} น.`;
}

/** Date label for a meeting starting on `start`: one date, or "5 พ.ย. – 6 พ.ย. 2569" for multi-day. */
export function formatBlock(c: Pick<SlotConfig, "durationDays">, start: string): string {
  if (c.durationDays <= 1) return formatDateMedium(start);
  return formatRange(start, addDays(start, c.durationDays - 1));
}
