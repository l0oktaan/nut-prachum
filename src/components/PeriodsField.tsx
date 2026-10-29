"use client";

import { Plus, RotateCcw, X } from "lucide-react";
import { DEFAULT_PERIODS, fmtMin, MAX_PERIODS, type Period } from "@/lib/slots";

// 15-minute steps, 05:00–24:00.
const TIMES = Array.from({ length: 77 }, (_, i) => 300 + i * 15);

/** Overlapping or inverted periods, as a message for the form; null when fine. */
export function periodsProblem(periods: Period[]): string | null {
  if (periods.some((p) => !p.label.trim())) return "กรุณาตั้งชื่อช่วงเวลาให้ครบ";
  if (periods.some((p) => p.end <= p.start)) return "เวลาสิ้นสุดของแต่ละช่วงต้องหลังเวลาเริ่ม";
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  const clash = sorted.findIndex((p, i) => i > 0 && p.start < sorted[i - 1].end);
  return clash > 0 ? `ช่วง “${sorted[clash - 1].label}” กับ “${sorted[clash].label}” เวลาซ้อนกัน` : null;
}

export const isDefaultPeriods = (periods: Period[]) => JSON.stringify(periods) === JSON.stringify(DEFAULT_PERIODS);

/** Editor for the room's own periods: name and start/end of each, e.g. เช้า 08:30–12:00. */
export function PeriodsField({ value, onChange }: { value: Period[]; onChange: (next: Period[]) => void }) {
  const problem = periodsProblem(value);
  const update = (i: number, patch: Partial<Period>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const add = () => {
    const last = value.reduce((m, p) => Math.max(m, p.end), 0);
    const start = Math.min(last + 60, 1380);
    onChange([...value, { label: `ช่วงที่ ${value.length + 1}`, start, end: Math.min(start + 120, 1440) }]);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[24px] bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">ช่วงเวลาของห้องนี้</p>
        {!isDefaultPeriods(value) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(DEFAULT_PERIODS.map((p) => ({ ...p })))}
          >
            <RotateCcw className="size-3.5" /> ค่าเริ่มต้น
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {value.map((p, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2">
            <input
              className="input w-28 flex-1 px-3 py-1.5 text-sm sm:flex-none"
              value={p.label}
              maxLength={20}
              aria-label={`ชื่อช่วงที่ ${i + 1}`}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <div className="flex items-center gap-1.5">
              <select
                className="input w-auto px-3 py-1.5 text-sm tabular-nums"
                value={p.start}
                aria-label={`เวลาเริ่มช่วงที่ ${i + 1}`}
                onChange={(e) => update(i, { start: Number(e.target.value) })}
              >
                {TIMES.slice(0, -1).map((m) => (
                  <option key={m} value={m}>
                    {fmtMin(m)}
                  </option>
                ))}
              </select>
              <span className="text-stone-400">–</span>
              <select
                className="input w-auto px-3 py-1.5 text-sm tabular-nums"
                value={p.end}
                aria-label={`เวลาสิ้นสุดช่วงที่ ${i + 1}`}
                onChange={(e) => update(i, { end: Number(e.target.value) })}
              >
                {TIMES.slice(1).map((m) => (
                  <option key={m} value={m}>
                    {fmtMin(m)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto px-2"
              disabled={value.length <= 1}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`ลบช่วง ${p.label}`}
              title="ลบช่วงนี้"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {value.length < MAX_PERIODS && (
        <button type="button" className="btn btn-secondary btn-sm self-start" onClick={add}>
          <Plus className="size-3.5" /> เพิ่มช่วงเวลา
        </button>
      )}
      {problem && <p className="hint text-rose-600">{problem}</p>}
    </div>
  );
}
