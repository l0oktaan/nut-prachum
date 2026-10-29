"use client";

import { useEffect, useRef } from "react";
import { cx } from "./ui";

const ITEM = 40; // px per row
const PAD = 2; // rows above/below the centre, so the first and last items can reach the middle

/**
 * One iOS-style drum column: scroll-snapped rows, the centred row is the value. Rows tilt and fade
 * with their distance from the centre; styling is applied straight to the DOM on scroll (no React
 * re-render per frame). Settles after scrolling stops, so a fling only commits where it lands.
 */
function WheelColumn({
  items,
  value,
  onChange,
  format,
  label,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);
  // The scroll handler outlives renders; read the latest props through refs.
  const latest = useRef({ items, value, onChange });
  useEffect(() => {
    latest.current = { items, value, onChange };
  });

  const paint = () => {
    const el = ref.current;
    if (!el) return;
    const centre = el.scrollTop / ITEM;
    el.querySelectorAll<HTMLElement>("[data-i]").forEach((row) => {
      const d = Number(row.dataset.i) - centre;
      const a = Math.min(Math.abs(d), 3);
      row.style.transform = `rotateX(${(-d * 22).toFixed(1)}deg) scale(${(1 - a * 0.06).toFixed(3)})`;
      row.style.opacity = String(Math.max(0.18, 1 - a * 0.32));
    });
  };

  // Bring the value to the centre when it changes from outside (or on mount).
  useEffect(() => {
    const el = ref.current;
    const i = items.indexOf(value);
    if (!el || i < 0) return;
    if (Math.round(el.scrollTop / ITEM) !== i) el.scrollTo({ top: i * ITEM });
    paint();
  }, [items, value]);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      const { items: list, value: current, onChange: commit } = latest.current;
      if (!el) return;
      const i = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollTop / ITEM)));
      if (list[i] !== current) commit(list[i]);
    }, 110);
  };

  const step = (delta: number) => {
    const i = items.indexOf(value) + delta;
    if (i >= 0 && i < items.length) onChange(items[i]);
  };

  return (
    <div className="relative w-12 [perspective:520px]">
      <div
        ref={ref}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            step(e.key === "ArrowUp" ? -1 : 1);
          }
        }}
        className="relative z-10 snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-xl outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-neon [&::-webkit-scrollbar]:hidden"
        style={{
          height: ITEM * (PAD * 2 + 1),
          maskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)",
          WebkitMaskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)",
        }}
      >
        <div style={{ height: ITEM * PAD }} aria-hidden />
        {items.map((v, i) => (
          <div
            key={v}
            data-i={i}
            role="option"
            aria-selected={v === value}
            onClick={() => ref.current?.scrollTo({ top: i * ITEM, behavior: "smooth" })}
            className={cx(
              "grid cursor-pointer snap-center place-items-center text-xl tabular-nums transition-colors [backface-visibility:hidden]",
              v === value ? "font-bold text-fg" : "font-medium text-stone-500",
            )}
            style={{ height: ITEM }}
          >
            {format(v)}
          </div>
        ))}
        <div style={{ height: ITEM * PAD }} aria-hidden />
      </div>
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const MINUTES = [0, 15, 30, 45];

/** Hour + minute drums for a time (minutes from midnight) in 15-minute steps within [min, max]. */
export function TimeWheel({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  const hours: number[] = [];
  for (let h = Math.floor(min / 60); h * 60 <= max; h++) hours.push(h);
  const hour = Math.floor(value / 60);
  const minutesFor = (h: number) => MINUTES.filter((m) => h * 60 + m >= min && h * 60 + m <= max);
  const minutes = minutesFor(hour);

  // Keep the minute when the hour changes, or take the closest one that hour allows (24 → :00 only).
  const setHour = (h: number) => {
    const allowed = minutesFor(h);
    const m = allowed.reduce((best, x) => (Math.abs(x - (value % 60)) < Math.abs(best - (value % 60)) ? x : best), allowed[0]);
    onChange(h * 60 + m);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-stone-500">{label}</span>
      <div className="relative flex items-center gap-1 rounded-2xl bg-surface px-2 shadow-sm">
        {/* The selection band behind the centre row. */}
        <div
          className="pointer-events-none absolute inset-x-1.5 rounded-xl bg-canvas"
          style={{ top: ITEM * PAD, height: ITEM }}
          aria-hidden
        />
        <WheelColumn items={hours} value={hour} onChange={setHour} format={pad2} label={`${label}: ชั่วโมง`} />
        <span className="relative z-10 text-xl font-bold text-stone-400">:</span>
        <WheelColumn
          items={minutes}
          value={value % 60}
          onChange={(m) => onChange(hour * 60 + m)}
          format={pad2}
          label={`${label}: นาที`}
        />
      </div>
    </div>
  );
}
