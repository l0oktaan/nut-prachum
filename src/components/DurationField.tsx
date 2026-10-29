"use client";

import { AlertTriangle, CalendarRange, Minus, Plus } from "lucide-react";
import { cx } from "./ui";
import { blockStarts, MAX_DURATION_DAYS } from "@/lib/slots";

/** "How many consecutive days does the meeting run?" stepper, with a check against the picked dates. */
export function DurationField({
  value,
  onChange,
  dates,
}: {
  value: number;
  onChange: (n: number) => void;
  dates: string[];
}) {
  const runs = blockStarts({ dates, durationDays: value, startDate: "", endDate: "", excludeWeekends: false }).length;
  const step = (d: number) => onChange(Math.min(MAX_DURATION_DAYS, Math.max(1, value + d)));

  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-bubble bg-white">
            <CalendarRange className="size-4" />
          </span>
          <div>
            <p className="font-semibold">ประชุมติดกันกี่วัน</p>
            <p className="text-xs text-stone-500">เช่น สัมมนา 2 วัน ทุกคนต้องว่างครบทุกวัน</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={value <= 1}
            className="grid size-9 place-items-center rounded-full transition hover:bg-canvas disabled:opacity-30"
            aria-label="ลดจำนวนวัน"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-16 text-center text-lg font-extrabold tabular-nums" aria-live="polite">
            {value} <span className="text-sm font-medium text-stone-500">วัน</span>
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={value >= MAX_DURATION_DAYS}
            className="grid size-9 place-items-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-30"
            aria-label="เพิ่มจำนวนวัน"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {value > 1 && dates.length > 0 && (
        <p
          className={cx(
            "flex items-start gap-2 rounded-2xl px-3 py-2 text-xs",
            runs ? "bg-neon/60 text-ink" : "bg-ink text-white",
          )}
        >
          {runs ? (
            <>วันที่เลือกมี {runs} ชุดที่ติดกันครบ {value} วัน — ระบบจะจัดอันดับชุดที่ทุกคนว่างครบทุกวัน</>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-neon" />
              วันที่เลือกยังไม่มีช่วงที่ติดกันครบ {value} วัน — เลือกวันที่ต่อเนื่องกันบนปฏิทินเพิ่ม
            </>
          )}
        </p>
      )}
    </div>
  );
}
