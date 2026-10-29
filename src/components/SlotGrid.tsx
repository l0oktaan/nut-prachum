"use client";

import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Check, Star } from "lucide-react";
import { cx } from "./ui";
import { useHolidays } from "@/lib/client";
import {
  cellKey,
  dateParts,
  getDates,
  getSlots,
  isOffered,
  slotsForDate,
  type Level,
  type Slot,
  type SlotConfig,
} from "@/lib/slots";
import { score, type CellTally } from "@/lib/results";

/* ------------------------------- shared frame ------------------------------ */

function GridFrame({
  config,
  renderCell,
  onDateClick,
}: {
  config: SlotConfig;
  renderCell: (date: string, slot: Slot) => ReactNode;
  onDateClick?: (date: string) => void;
}) {
  const dates = useMemo(() => getDates(config), [config]);
  // Rows for slots that at least one date offers; cells a date doesn't offer are drawn as closed.
  const slots = useMemo(
    () => getSlots(config).filter((s) => dates.some((d) => isOffered(config, d, s.key))),
    [config, dates],
  );
  const compact = config.timeMode === "hour";
  const holidays = useHolidays();

  return (
    <div className="scroll-thin -mx-1 overflow-x-auto px-1 pb-2">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `${compact ? 56 : 72}px repeat(${dates.length}, minmax(${compact ? 44 : 56}px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 bg-white" />
        {dates.map((d) => {
          const p = dateParts(d);
          const holiday = holidays[d];
          const Header = onDateClick ? "button" : "div";
          return (
            <Header
              key={d}
              type={onDateClick ? "button" : undefined}
              onClick={onDateClick ? () => onDateClick(d) : undefined}
              title={[holiday, onDateClick && "คลิกเพื่อเลือก/ยกเลิกทั้งวัน"].filter(Boolean).join(" · ") || undefined}
              className={cx(
                "flex flex-col items-center rounded-lg py-1.5 leading-tight",
                onDateClick && "transition hover:bg-white hover:shadow-sm",
              )}
            >
              <span className={cx("text-xs", holiday ? "text-rose-500" : p.weekend ? "text-lilac" : "text-stone-400")}>
                {p.weekday}
              </span>
              <span className={cx("text-lg font-extrabold", holiday ? "text-rose-500" : "text-ink")}>{p.day}</span>
              <span className="text-xs text-stone-400">{p.month}</span>
            </Header>
          );
        })}

        {slots.map((slot) => (
          <Fragment key={slot.key}>
            <div
              className={cx(
                "sticky left-0 z-10 flex flex-col justify-center bg-white pr-2 text-right leading-tight",
                compact ? "text-xs text-stone-500 tabular-nums" : "text-sm font-medium text-stone-700",
              )}
            >
              {slot.label}
              {slot.sub && <span className="text-[11px] font-normal text-stone-400">{slot.sub}</span>}
            </div>
            {dates.map((d) => (
              <Fragment key={d}>
                {isOffered(config, d, slot.key) ? (
                  renderCell(d, slot)
                ) : (
                  <div
                    title="ผู้จัดไม่ได้เปิดช่วงนี้"
                    className={cx("cell-closed w-full rounded-2xl", cellHeight(config))}
                  />
                )}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

const cellHeight = (config: SlotConfig) =>
  config.timeMode === "hour" ? "h-7" : config.timeMode === "period" ? "h-12" : "h-14";

/* --------------------------------- editing --------------------------------- */

export function EditGrid({
  config,
  value,
  onChange,
  brush,
  disabled,
}: {
  config: SlotConfig;
  value: Map<string, Level>;
  onChange: (next: Map<string, Level>) => void;
  brush: Level;
  disabled?: boolean;
}) {
  const drag = useRef<{ level: Level | 0 } | null>(null);
  const lastPointer = useRef<string>("mouse");
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const stop = () => (drag.current = null);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const apply = (keys: string[], level: Level | 0) => {
    const next = new Map(valueRef.current);
    for (const k of keys) {
      if (level) next.set(k, level);
      else next.delete(k);
    }
    valueRef.current = next;
    onChange(next);
  };

  const toggleLevel = (key: string): Level | 0 => (valueRef.current.get(key) === brush ? 0 : brush);

  const toggleDate = (date: string) => {
    if (disabled) return;
    const keys = slotsForDate(config, date).map((s) => cellKey(date, s.key));
    const allSet = keys.every((k) => valueRef.current.get(k) === brush);
    apply(keys, allSet ? 0 : brush);
  };

  return (
    <div className={cx("select-none", disabled && "pointer-events-none opacity-60")}>
      <GridFrame
        config={config}
        onDateClick={disabled ? undefined : toggleDate}
        renderCell={(date, slot) => {
          const key = cellKey(date, slot.key);
          const level = value.get(key);
          return (
            <button
              type="button"
              aria-pressed={!!level}
              aria-label={`${date} ${slot.label}`}
              onPointerDown={(e) => {
                lastPointer.current = e.pointerType;
                if (e.pointerType !== "mouse" || e.button !== 0) return;
                e.preventDefault();
                const l = toggleLevel(key);
                drag.current = { level: l };
                apply([key], l);
              }}
              onPointerEnter={() => {
                if (drag.current) apply([key], drag.current.level);
              }}
              onClick={() => {
                // Mouse is handled by drag-painting; touch and keyboard toggle on click.
                if (lastPointer.current === "mouse") return;
                apply([key], toggleLevel(key));
              }}
              onKeyDown={() => (lastPointer.current = "keyboard")}
              className={cx(
                "grid w-full place-items-center rounded-2xl border transition-colors",
                cellHeight(config),
                level === 2 && "border-neon bg-neon text-ink",
                level === 1 && "border-lilac-soft bg-lilac-soft text-violet-800",
                !level && "border-transparent bg-canvas hover:border-black/10 hover:bg-stone-200/60",
              )}
            >
              {level === 2 && <Check className="size-4" strokeWidth={2.5} />}
              {level === 1 && <span className="text-xs font-semibold">?</span>}
            </button>
          );
        }}
      />
    </div>
  );
}

/* --------------------------------- results --------------------------------- */

export function HeatGrid({
  config,
  tallies,
  total,
  selectedKeys,
  onSelect,
  finalKeys,
  bestKeys,
}: {
  config: SlotConfig;
  tallies: Map<string, CellTally>;
  total: number;
  /** Cells to outline — every day of a multi-day candidate. */
  selectedKeys?: Set<string>;
  onSelect?: (key: string) => void;
  finalKeys?: Set<string>;
  bestKeys?: Set<string>;
}) {
  const max = Math.max(1, total);
  return (
    <GridFrame
      config={config}
      renderCell={(date, slot) => {
        const key = cellKey(date, slot.key);
        const t = tallies.get(key);
        const ratio = t ? score(t) / max : 0;
        const yes = t?.yes.length ?? 0;
        const maybe = t?.maybe.length ?? 0;
        const isFinal = finalKeys?.has(key) ?? false;
        // Dot-matrix cell: a purple circle whose opacity follows how many people are free.
        return (
          <button
            type="button"
            onClick={() => onSelect?.(key)}
            title={`สะดวก ${yes} · ถ้าจำเป็น ${maybe} จาก ${total} คน`}
            className={cx(
              "relative grid w-full place-items-center rounded-2xl transition",
              cellHeight(config),
              selectedKeys?.has(key) ? "bg-canvas ring-2 ring-ink" : onSelect && "hover:bg-canvas",
            )}
          >
            <span
              style={ratio > 0 ? { backgroundColor: `rgb(167 139 250 / ${0.18 + ratio * 0.82})` } : undefined}
              className={cx(
                "grid aspect-square h-[85%] place-items-center rounded-full text-xs font-bold tabular-nums",
                ratio > 0 ? (ratio > 0.6 ? "text-white" : "text-violet-950") : "bg-canvas",
                isFinal && "ring-[3px] ring-ink",
              )}
            >
              {yes + maybe > 0 && (
                <span className="leading-none">
                  {yes}
                  {maybe > 0 && <span className="font-medium opacity-75">+{maybe}</span>}
                </span>
              )}
            </span>
            {(isFinal || bestKeys?.has(key)) && (
              <span className="absolute top-0 right-0.5 grid size-4 place-items-center rounded-full bg-neon ring-2 ring-white">
                <Star className="size-2.5 fill-ink text-ink" />
              </span>
            )}
          </button>
        );
      }}
    />
  );
}

export function Legend({ mode }: { mode: "edit" | "heat" }) {
  if (mode === "edit") {
    return (
      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full bg-neon ring-1 ring-black/10" /> สะดวก
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full bg-lilac-soft" /> ถ้าจำเป็น
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full bg-canvas ring-1 ring-black/5" /> ไม่สะดวก
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
      <span>น้อย</span>
      <span className="flex gap-1">
        {[0.18, 0.38, 0.58, 0.78, 1].map((a) => (
          <span key={a} className="size-3.5 rounded-full" style={{ backgroundColor: `rgb(167 139 250 / ${a})` }} />
        ))}
      </span>
      <span>มาก</span>
      <span className="ml-2">ตัวเลข = สะดวก (+ถ้าจำเป็น)</span>
    </div>
  );
}
