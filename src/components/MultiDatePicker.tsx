"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Eraser, X } from "lucide-react";
import { cx } from "./ui";
import { useClientValue } from "@/lib/client";
import { dateParts, formatDateShortYear, formatMonthYear, MAX_DAYS } from "@/lib/slots";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function localToday() {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Month calendar where each tap toggles a single date. Years render in พ.ศ. */
export function MultiDatePicker({
  value,
  onChange,
  max = MAX_DAYS,
  keepPast = [],
  initialMonth,
}: {
  value: string[];
  onChange: (dates: string[]) => void;
  max?: number;
  /** Past dates that stay tappable (when editing a room that already includes them). */
  keepPast?: string[];
  /** "YYYY-MM-DD" whose month is shown first; defaults to today's month. */
  initialMonth?: string;
}) {
  const today = useClientValue(localToday, "");
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const anchor = initialMonth ?? today;
  const cur = view ?? (anchor ? { y: Number(anchor.slice(0, 4)), m: Number(anchor.slice(5, 7)) - 1 } : null);
  const selected = useMemo(() => new Set(value), [value]);
  const pastOk = useMemo(() => new Set(keepPast), [keepPast]);
  const earliest = [today, ...keepPast].sort()[0] ?? today;

  const y = cur?.y;
  const m = cur?.m;
  const days = useMemo(() => {
    if (y === undefined || m === undefined) return [];
    const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
    const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: count }, (_, i) => iso(y, m, i + 1)),
    ];
  }, [y, m]);

  if (!cur) return <div className="h-[22rem] animate-pulse rounded-[24px] bg-canvas" />;

  const selectable = (d: string) => d >= today || pastOk.has(d);
  const commit = (next: Set<string>) => onChange([...next].sort().slice(0, max));

  const toggle = (d: string) => {
    if (!selectable(d)) return;
    const next = new Set(selected);
    if (next.has(d)) next.delete(d);
    else if (next.size < max) next.add(d);
    commit(next);
  };

  // Select/unselect a set of dates as a group: if all are on, turn them off; otherwise turn them on.
  const toggleGroup = (group: string[]) => {
    const usable = group.filter(selectable);
    if (!usable.length) return;
    const next = new Set(selected);
    const allOn = usable.every((d) => next.has(d));
    for (const d of usable) {
      if (allOn) next.delete(d);
      else next.add(d);
    }
    commit(next);
  };

  const monthDays = days.filter((d): d is string => d !== null);
  const weekdaysOfMonth = (w: number) => monthDays.filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === w);
  const workdays = monthDays.filter((d) => {
    const w = new Date(`${d}T00:00:00Z`).getUTCDay();
    return w !== 0 && w !== 6;
  });

  const shift = (delta: number) => {
    const t = new Date(Date.UTC(cur.y, cur.m + delta, 1));
    setView({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  };
  const atFirstMonth = `${cur.y}-${pad(cur.m + 1)}` <= earliest.slice(0, 7);
  const inMonth = monthDays.filter((d) => selected.has(d)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[24px] bg-canvas p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={atFirstMonth}
            className="btn btn-ghost size-10 rounded-full p-0"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-stone-800">{formatMonthYear(cur.y, cur.m)}</p>
            {inMonth > 0 && <p className="text-xs font-medium text-stone-500">เลือกในเดือนนี้ {inMonth} วัน</p>}
          </div>
          <button
            type="button"
            onClick={() => shift(1)}
            className="btn btn-ghost size-10 rounded-full p-0"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              title={`เลือก/ยกเลิกทุกวัน${w}ในเดือนนี้`}
              onClick={() => toggleGroup(weekdaysOfMonth(i))}
              className={cx(
                "rounded-full py-1 text-xs font-semibold transition hover:bg-white",
                i === 0 || i === 6 ? "text-lilac" : "text-stone-400",
              )}
            >
              {w}
            </button>
          ))}
          {days.map((d, i) => {
            if (!d) return <span key={`blank-${i}`} />;
            const on = selected.has(d);
            const past = !selectable(d);
            const weekend = dateParts(d).weekend;
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggle(d)}
                disabled={past}
                aria-pressed={on}
                className={cx(
                  "mx-auto grid aspect-square w-full max-w-12 place-items-center rounded-full text-base font-semibold transition",
                  on && "animate-pop bg-neon font-bold text-ink shadow-sm",
                  !on && !past && "hover:bg-white hover:shadow-sm",
                  !on && !past && (weekend ? "text-lilac" : "text-ink"),
                  past && "cursor-not-allowed text-stone-300",
                  d === today && !on && "ring-2 ring-ink ring-inset",
                )}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleGroup(workdays)}>
          <CalendarCheck className="size-3.5" /> จันทร์–ศุกร์ทั้งเดือน
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!value.length}
          onClick={() => onChange([])}
        >
          <Eraser className="size-3.5" /> ล้างทั้งหมด
        </button>
        <span className="ml-auto text-xs text-stone-500">
          แตะวันที่เพื่อเลือก · แตะชื่อวันเพื่อเลือกทั้งคอลัมน์
        </span>
      </div>

      {value.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">
            เลือกแล้ว <span className="font-extrabold text-ink">{value.length}</span> วัน
            {value.length >= max && <span className="ml-1 text-xs text-rose-500">(สูงสุด {max} วัน)</span>}
          </p>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto scroll-thin">
            {value.map((d) => (
              <span
                key={d}
                className="chip bg-ink py-1 pr-1 text-white"
              >
                {dateParts(d).weekday} {formatDateShortYear(d)}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== d))}
                  className="grid size-5 place-items-center rounded-full text-stone-400 hover:bg-white/15 hover:text-white"
                  aria-label="เอาออก"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-stone-500">
          ยังไม่ได้เลือกวัน — แตะวันที่บนปฏิทินที่ต้องการถามสมาชิก
        </p>
      )}
    </div>
  );
}
