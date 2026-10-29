"use client";

import { useMemo } from "react";
import { Trophy, Users } from "lucide-react";
import { HeatGrid, Legend } from "../SlotGrid";
import { useClientValue } from "@/lib/client";
import { candidates, rank, tally } from "@/lib/results";
import { addDays, formatBlock, isWeekend, slotLabel, type SlotConfig } from "@/lib/slots";
import type { Cell } from "@/lib/types";
import { localToday } from "../MultiDatePicker";

const PEOPLE = 8;
// Who's free per [date index][period]: a fixed, realistic-looking spread with one clear winner.
const PATTERN = [
  [5, 3, 1],
  [6, 4, 2],
  [8, 5, 1],
  [4, 6, 2],
  [3, 2, 0],
];

/** The results view with sample answers on the coming weekdays — shows visitors what they'll get. */
export function ResultsPreview() {
  // Dates follow "today", so this renders on the client only (a sized placeholder until then).
  const today = useClientValue(localToday, "");
  const sample = useMemo(() => {
    if (!today) return null;
    const dates: string[] = [];
    for (let d = addDays(today, 1); dates.length < 5; d = addDays(d, 1)) if (!isWeekend(d)) dates.push(d);
    const config: SlotConfig = {
      dates,
      startDate: dates[0],
      endDate: dates[4],
      excludeWeekends: false,
      timeMode: "period",
      dayStartMin: 540,
      dayEndMin: 1020,
      slotMinutes: 60,
      durationDays: 1,
      dateSlots: {},
      periods: [],
    };
    const cells: Cell[] = [];
    PATTERN.forEach((row, di) =>
      row.forEach((free, slot) => {
        for (let p = 0; p < free; p++) cells.push({ p: `p${p}`, d: dates[di], s: slot, l: p === free - 1 && free > 2 ? 1 : 2 });
      }),
    );
    const tallies = tally(config, cells);
    const best = rank(candidates(config, tallies), 1)[0];
    return { config, tallies, best };
  }, [today]);

  return (
    <div className="card relative p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-stone-500">ตัวอย่างหน้าผลรวม</p>
          <p className="font-bold">ประชุมคณะกรรมการประจำเดือน</p>
        </div>
        <span className="chip bg-canvas text-stone-600">
          <Users className="size-3.5" /> {PEOPLE}/{PEOPLE} คนตอบแล้ว
        </span>
      </div>
      {sample ? (
        <>
          <HeatGrid config={sample.config} tallies={sample.tallies} total={PEOPLE} bestKeys={new Set(sample.best ? [sample.best.key] : [])} />
          <div className="mt-2">
            <Legend mode="heat" />
          </div>
          {sample.best && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink p-3 text-white">
              <span className="icon-bubble size-9 bg-neon text-ink">
                <Trophy className="size-4" />
              </span>
              <div className="min-w-0 flex-1 text-sm leading-tight">
                <p className="text-xs text-stone-400">ช่วงที่ดีที่สุด</p>
                <p className="truncate font-semibold">
                  {formatBlock(sample.config, sample.best.date)} · {slotLabel(sample.config, sample.best.slot)}
                </p>
              </div>
              <span className="text-lg font-extrabold text-neon tabular-nums">
                {sample.best.yes.length}/{PEOPLE}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="h-[19rem] animate-pulse rounded-2xl bg-canvas" />
      )}
    </div>
  );
}
