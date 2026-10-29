import { addDays, findSlot, formatBlock, formatDateLong, slotLabel, type SlotConfig } from "./slots";

// Meetings are scheduled in Thai time (UTC+7, no DST).
const TZ_OFFSET_MIN = 7 * 60;

interface MeetingInfo {
  title: string;
  description: string;
  date: string;
  slot: number;
}

function utcStamp(date: string, minutes: number): string {
  const t = new Date(`${date}T00:00:00Z`).getTime() + (minutes - TZ_OFFSET_MIN) * 60_000;
  return new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const compact = (d: string) => d.replace(/-/g, "");

/**
 * All-day meetings span every day as one event. Timed meetings are one event on the first day
 * that repeats daily for `durationDays` days, so each day keeps its own time slot.
 */
function eventTimes(c: SlotConfig, m: MeetingInfo) {
  const days = Math.max(1, c.durationDays);
  if (c.timeMode === "day") {
    return { allDay: true, start: compact(m.date), end: compact(addDays(m.date, days)), rrule: null };
  }
  const slot = findSlot(c, m.slot);
  const start = slot?.start ?? 540;
  const end = slot?.end ?? start + 60;
  return {
    allDay: false,
    start: utcStamp(m.date, start),
    end: utcStamp(m.date, end),
    rrule: days > 1 ? `RRULE:FREQ=DAILY;COUNT=${days}` : null,
  };
}

export function describeMeeting(c: SlotConfig, date: string, slot: number): string {
  const when = c.durationDays > 1 ? `${formatBlock(c, date)} (${c.durationDays} วันติดกัน)` : formatDateLong(date);
  return `${when} · ${slotLabel(c, slot)}`;
}

/** Our short link that redirects to Google Calendar for the room's confirmed meeting. */
export const gcalShortUrl = (roomUrl: string) => `${roomUrl}/gcal`;

export function googleCalendarUrl(c: SlotConfig, m: MeetingInfo, roomUrl: string): string {
  const t = eventTimes(c, m);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${t.start}/${t.end}`,
    details: [m.description, roomUrl].filter(Boolean).join("\n\n"),
  });
  if (t.rrule) params.set("recur", t.rrule);
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeIcs = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcs(c: SlotConfig, m: MeetingInfo, uid: string, roomUrl: string): string {
  const t = eventTimes(c, m);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//nut-prachum//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    t.allDay ? `DTSTART;VALUE=DATE:${t.start}` : `DTSTART:${t.start}`,
    t.allDay ? `DTEND;VALUE=DATE:${t.end}` : `DTEND:${t.end}`,
    ...(t.rrule ? [t.rrule] : []),
    `SUMMARY:${escapeIcs(m.title)}`,
    `DESCRIPTION:${escapeIcs([m.description, roomUrl].filter(Boolean).join("\n\n"))}`,
    `URL:${roomUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** Ready-to-paste chat message announcing the confirmed meeting. */
export function announcementText(
  c: SlotConfig,
  m: MeetingInfo,
  roomUrl: string,
  attendance?: { yes: number; total: number },
): string {
  return [
    `📢 สรุปวันประชุม “${m.title}”`,
    `🗓️ ${describeMeeting(c, m.date, m.slot)}`,
    attendance && `✅ สะดวก ${attendance.yes}/${attendance.total} คน`,
    m.description && `📍 ${m.description}`,
    `📅 เพิ่มลง Google Calendar: ${gcalShortUrl(roomUrl)}`,
    `🔗 รายละเอียด / ไฟล์ .ics: ${roomUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
