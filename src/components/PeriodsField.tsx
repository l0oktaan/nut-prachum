"use client";

import { useState } from "react";
import { Check, Clock, Plus, RotateCcw, X } from "lucide-react";
import { TimeWheel } from "./TimeWheel";
import { cx } from "./ui";
import { DEFAULT_PERIODS, fmtMin, MAX_PERIODS, type Period } from "@/lib/slots";

// Times run 05:00–24:00 in 15-minute steps.
const FIRST = 300;
const LAST = 1440;

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
  // Which row's time wheels are open (one at a time).
  const [editing, setEditing] = useState<number | null>(null);
  const update = (i: number, patch: Partial<Period>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const add = () => {
    const last = value.reduce((m, p) => Math.max(m, p.end), 0);
    const start = Math.min(last + 60, 1380);
    onChange([...value, { label: `ช่วงที่ ${value.length + 1}`, start, end: Math.min(start + 120, LAST) }]);
    setEditing(value.length);
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
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2">
            <input
              className="input w-28 flex-1 px-3 py-1.5 text-sm sm:flex-none"
              value={p.label}
              maxLength={20}
              aria-label={`ชื่อช่วงที่ ${i + 1}`}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <button
              type="button"
              aria-expanded={editing === i}
              aria-label={`เวลาช่วงที่ ${i + 1}: ${fmtMin(p.start)} ถึง ${fmtMin(p.end)} — แตะเพื่อเปลี่ยน`}
              onClick={() => setEditing(editing === i ? null : i)}
              className={cx(
                "flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-semibold tabular-nums transition",
                editing === i ? "border-fg/20 bg-surface ring-4 ring-neon/50" : "border-transparent bg-canvas hover:bg-stone-200/60",
              )}
            >
              <Clock className="size-4 text-stone-400" />
              {fmtMin(p.start)} <span className="font-normal text-stone-400">–</span> {fmtMin(p.end)}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto px-2"
              disabled={value.length <= 1}
              onClick={() => {
                onChange(value.filter((_, j) => j !== i));
                setEditing(null);
              }}
              aria-label={`ลบช่วง ${p.label}`}
              title="ลบช่วงนี้"
            >
              <X className="size-4" />
            </button>
            {editing === i && (
              <div className="animate-fade-up flex w-full flex-col items-center gap-3 rounded-2xl bg-canvas p-3">
                {/* Side by side where they fit; stacked on narrow phones. */}
                <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-3">
                  <TimeWheel label="เริ่ม" value={p.start} min={FIRST} max={LAST - 15} onChange={(start) => update(i, { start })} />
                  <span className="hidden pb-[5.5rem] text-xl text-stone-400 sm:block">–</span>
                  <TimeWheel label="สิ้นสุด" value={p.end} min={FIRST + 15} max={LAST} onChange={(end) => update(i, { end })} />
                </div>
                <button type="button" className="btn btn-primary btn-sm w-full sm:w-auto sm:px-8" onClick={() => setEditing(null)}>
                  <Check className="size-3.5" /> เสร็จ
                </button>
              </div>
            )}
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
