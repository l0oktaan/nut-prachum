"use client";

import { useState } from "react";
import { cx, Switch } from "./ui";
import { dateParts, getDates, getSlots, isOffered, type SlotConfig } from "@/lib/slots";

/** Optional per-date slot picker: which slots each picked date opens, e.g. day 1 morning, day 2 afternoon. */
export function DateSlotsField({
  config,
  value,
  onChange,
}: {
  config: SlotConfig;
  /** Date → offered slot keys. A date not listed offers every slot. */
  value: Record<string, number[]>;
  onChange: (next: Record<string, number[]>) => void;
}) {
  const [open, setOpen] = useState(Object.keys(value).length > 0);
  const slots = getSlots(config);
  const dates = getDates(config);
  const offeredOn = (date: string) => slots.filter((s) => isOffered({ dateSlots: value }, date, s.key)).map((s) => s.key);

  const toggle = (date: string, key: number) => {
    const current = offeredOn(date);
    const picked = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    if (!picked.length) return;
    const next = { ...value };
    if (picked.length === slots.length) delete next[date];
    else next[date] = slots.map((s) => s.key).filter((k) => picked.includes(k));
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-canvas p-4">
      <Switch
        checked={open}
        onChange={(v) => {
          setOpen(v);
          if (!v) onChange({});
        }}
        label="กำหนดช่วงเวลาแยกรายวัน"
        description="เช่น วันที่ 1 เฉพาะเช้า วันที่ 2 เฉพาะบ่าย — ช่วงที่ปิดไว้สมาชิกจะเลือกไม่ได้"
      />
      {open &&
        (dates.length === 0 ? (
          <p className="text-xs text-stone-500">เลือกวันที่บนปฏิทินก่อน แล้วกำหนดช่วงเวลาของแต่ละวันได้ที่นี่</p>
        ) : (
          <ul className="scroll-thin flex max-h-96 flex-col gap-1.5 overflow-y-auto">
            {dates.map((d) => {
              const p = dateParts(d);
              const offered = offeredOn(d);
              return (
                <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-white px-3 py-2">
                  <span className="w-24 shrink-0 text-sm">
                    <span className={p.weekend ? "text-lilac" : "text-stone-400"}>{p.weekday}</span>{" "}
                    <span className="font-semibold">
                      {p.day} {p.month}
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map((s) => {
                      const on = offered.includes(s.key);
                      const last = on && offered.length === 1;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          aria-pressed={on}
                          disabled={last}
                          title={last ? "ต้องเปิดอย่างน้อย 1 ช่วงต่อวัน" : s.sub}
                          onClick={() => toggle(d, s.key)}
                          className={cx(
                            "rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition",
                            on ? "bg-neon text-ink" : "bg-canvas text-stone-400 line-through hover:text-stone-600",
                            last && "cursor-not-allowed",
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
    </div>
  );
}
