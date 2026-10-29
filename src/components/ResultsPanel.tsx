"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUp, CalendarCheck, Grid3x3, Lock, MessageSquareText, Star, Trophy } from "lucide-react";
import { HeatGrid, Legend } from "./SlotGrid";
import { Avatar, cx } from "./ui";
import { candidates, missingOf, rank, score, tally, type CellTally } from "@/lib/results";
import { addDays, cellKey, dateParts, formatBlock, getDates, parseCellKey, slotLabel } from "@/lib/slots";
import type { Cell, ParticipantPublic, RoomPublic } from "@/lib/types";

/** Every grid cell a candidate covers (one per day). */
const cellsOf = (t?: CellTally) => new Set(t ? t.days.map((d) => cellKey(d, t.slot)) : []);

export function ResultsPanel({
  room,
  participants,
  cells,
  onPickFinal,
  picking,
}: {
  room: RoomPublic;
  participants: ParticipantPublic[];
  cells: Cell[];
  /** Admin only: confirm a candidate as the meeting, optionally closing responses too. */
  onPickFinal?: (date: string, slot: number, lock: boolean) => void;
  picking?: boolean;
}) {
  const cellTallies = useMemo(() => tally(room, cells), [room, cells]);
  const cands = useMemo(() => candidates(room, cellTallies), [room, cellTallies]);
  // Key members who answered; those who haven't are missing from every candidate alike.
  const keyIds = useMemo(
    () => participants.filter((p) => p.required && p.respondedAt).map((p) => p.id),
    [participants],
  );
  const best = useMemo(() => rank(cands, 5, keyIds), [cands, keyIds]);
  const notes = participants.filter((p) => p.note);
  const responded = participants.filter((p) => p.respondedAt);
  const finalKey = room.finalDate && room.finalSlot !== null ? cellKey(room.finalDate, room.finalSlot) : null;
  const [selected, setSelected] = useState<string | null>(null);
  const activeKey = selected ?? best[0]?.key ?? null;
  const active = activeKey ? cands.get(activeKey) : undefined;
  const responseRate = participants.length ? Math.round((responded.length / participants.length) * 100) : 0;
  const multiDay = room.durationDays > 1;

  // A clicked cell may sit in the middle of a multi-day block: pick the earliest block covering it.
  const selectCell = (key: string) => {
    if (cands.has(key)) return setSelected(key);
    const { date, slot } = parseCellKey(key);
    const hit = [...cands.values()].find((t) => t.slot === slot && t.days.includes(date));
    if (hit) setSelected(hit.key);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="card-title">
                <span className="icon-bubble bg-canvas">
                  <Grid3x3 className="size-4" />
                </span>
                ภาพรวมเวลาที่ว่าง
              </h2>
              <p className="mt-3 flex items-end gap-2">
                <span className="metric">
                  {responded.length}
                  <span className="text-xl font-bold text-stone-400">/{participants.length}</span>
                </span>
                <span className="pb-1 text-sm text-stone-500">คนตอบแล้ว</span>
                {responded.length > 0 && <span className="badge-up mb-1">{responseRate}%</span>}
              </p>
            </div>
            <Legend mode="heat" />
          </div>
          {multiDay && (
            <p className="mb-4 rounded-2xl bg-canvas px-4 py-2.5 text-xs text-stone-600">
              ประชุม <b>{room.durationDays} วันติดกัน</b> — ตารางแสดงคนว่างรายวัน ส่วนอันดับนับเฉพาะคนที่ว่างครบทุกวันในชุด
              คลิกช่องเพื่อดูชุดวันที่เริ่มจากวันนั้น
            </p>
          )}
          {responded.length === 0 ? (
            <p className="rounded-2xl bg-canvas py-10 text-center text-sm text-stone-500">
              ยังไม่มีใครเลือกเวลา — ผลรวมจะแสดงที่นี่เมื่อสมาชิกเริ่มตอบ
            </p>
          ) : (
            <HeatGrid
              config={room}
              tallies={cellTallies}
              total={responded.length}
              selectedKeys={cellsOf(active)}
              onSelect={selectCell}
              finalKeys={cellsOf(finalKey ? cands.get(finalKey) : undefined)}
              bestKeys={cellsOf(best[0])}
            />
          )}
        </section>

        {active && (
          <CellDetail
            key={active.key}
            room={room}
            tally={active}
            participants={participants}
            isFinal={active.key === finalKey}
            onPickFinal={onPickFinal}
            picking={picking}
          />
        )}

        {notes.length > 0 && (
          <section className="card p-5 sm:p-6">
            <h2 className="card-title">
              <span className="icon-bubble bg-canvas">
                <MessageSquareText className="size-4" />
              </span>
              หมายเหตุจากสมาชิก ({notes.length})
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {notes.map((p) => (
                <li key={p.id} className="flex items-start gap-3 rounded-2xl bg-canvas px-3 py-2.5">
                  <Avatar name={p.name} className="size-7 text-xs" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{p.name}</p>
                    <p className="break-words whitespace-pre-wrap text-stone-600">{p.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <BestTimes
        room={room}
        cands={cands}
        best={best}
        participants={participants}
        keyIds={keyIds}
        respondedCount={responded.length}
        activeKey={activeKey}
        onSelect={setSelected}
      />
    </div>
  );
}

/* ------------------------ dark "best times" card ------------------------- */

function BestTimes({
  room,
  cands,
  best,
  participants,
  keyIds,
  respondedCount,
  activeKey,
  onSelect,
}: {
  room: RoomPublic;
  cands: Map<string, CellTally>;
  best: CellTally[];
  participants: ParticipantPublic[];
  keyIds: string[];
  respondedCount: number;
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  const nameOf = (id: string) => participants.find((p) => p.id === id)?.name ?? "?";
  // Per start date: the strongest candidate's score and its "available" count, as shares of respondents.
  const days = useMemo(() => {
    const total = Math.max(1, respondedCount);
    return getDates(room).map((date) => {
      const top = [...cands.values()]
        .filter((t) => t.date === date)
        .sort((a, b) => score(b) - score(a) || b.yes.length - a.yes.length)[0];
      return {
        date,
        score: top ? score(top) / total : 0,
        yes: top ? top.yes.length / total : 0,
        key: top?.key,
      };
    });
  }, [room, cands, respondedCount]);
  const bestDate = best[0]?.date;
  const top = best[0];
  const shortLabel = (start: string) => {
    const a = dateParts(start);
    if (room.durationDays <= 1) return `${a.day} ${a.month}`;
    const b = dateParts(addDays(start, room.durationDays - 1));
    return `${a.day}–${b.day} ${b.month}`;
  };

  return (
    <section className="card-dark flex flex-col gap-6 p-5 sm:p-6 xl:sticky xl:top-6 xl:self-start">
      <div className="flex items-center justify-between">
        <h2 className="card-title">
          <span className="icon-bubble bg-white/10 text-neon">
            <Trophy className="size-4" />
          </span>
          ช่วงเวลาที่ดีที่สุด
        </h2>
        <span className="chip bg-white/10 text-stone-300">
          {room.durationDays > 1 ? `${room.durationDays} วันติดกัน` : `${getDates(room).length} วัน`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border-l-[3px] border-neon pl-3">
          <p className="text-2xl font-extrabold tabular-nums">
            {top ? top.yes.length : 0}
            <span className="text-base text-stone-500">/{respondedCount}</span>
          </p>
          <p className="text-xs text-stone-400">
            {room.durationDays > 1 ? "ว่างครบทุกวัน" : "ว่างตรงกันมากที่สุด"}
          </p>
        </div>
        <div className="border-l-[3px] border-lilac pl-3">
          <p className="truncate text-2xl font-extrabold">{top ? shortLabel(top.date) : "—"}</p>
          <p className="truncate text-xs text-stone-400">{top ? slotLabel(room, top.slot) : "ยังไม่มีข้อมูล"}</p>
        </div>
      </div>

      {/* Bar chart: one column per (start) date, hatched gray except the best one (lime + purple). */}
      <div className="scroll-thin-dark -mx-1 overflow-x-auto px-1">
        <div className="flex h-40 items-end gap-2" style={{ minWidth: `${days.length * 2.25}rem` }}>
          {days.map((d) => {
            const isBest = d.date === bestDate;
            return (
              <button
                key={d.date}
                type="button"
                disabled={!d.key}
                onClick={() => d.key && onSelect(d.key)}
                title={`${formatBlock(room, d.date)} · ${Math.round(d.score * 100)}%`}
                className="flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-1.5 disabled:opacity-40"
              >
                {isBest && <ArrowUp className="size-4 text-neon" />}
                <span className="flex h-full w-full items-end justify-center gap-0.5">
                  {isBest ? (
                    <>
                      <span className="w-1/2 rounded-full bg-neon" style={{ height: `${Math.max(8, d.score * 100)}%` }} />
                      <span className="w-1/2 rounded-full bg-lilac" style={{ height: `${Math.max(8, d.yes * 100)}%` }} />
                    </>
                  ) : (
                    <span
                      className={cx("bar-hatch w-full rounded-full", activeKey?.startsWith(d.date) && "ring-1 ring-white/40")}
                      style={{ height: `${Math.max(8, d.score * 100)}%` }}
                    />
                  )}
                </span>
                <span className={cx("text-[11px] leading-none", isBest ? "font-bold text-neon" : "text-stone-500")}>
                  {dateParts(d.date).day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {best.length > 0 && (
        <ol className="flex flex-col gap-1 border-t border-white/10 pt-4">
          {best.map((t, i) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onSelect(t.key)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                  activeKey === t.key ? "bg-white/10" : "hover:bg-white/5",
                )}
              >
                <span
                  className={cx(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-neon text-ink" : "bg-white/10 text-stone-300",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-tight">
                  <span className="block font-semibold">{formatBlock(room, t.date)}</span>
                  <span className="block text-xs text-stone-400">{slotLabel(room, t.slot)}</span>
                  {keyIds.length > 0 &&
                    (missingOf(t, keyIds).length ? (
                      <span className="mt-0.5 block truncate text-xs text-rose-300">
                        ขาดสมาชิกหลัก: {missingOf(t, keyIds).map(nameOf).join(", ")}
                      </span>
                    ) : (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-neon">
                        <Star className="size-3 fill-neon" /> สมาชิกหลักว่างครบ
                      </span>
                    ))}
                </span>
                <span className="text-right text-xs tabular-nums">
                  <span className="block font-bold text-neon">
                    {t.yes.length}/{respondedCount}
                  </span>
                  {t.maybe.length > 0 && <span className="text-lilac">+{t.maybe.length}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ------------------------------ cell detail ------------------------------ */

function CellDetail({
  room,
  tally,
  participants,
  isFinal,
  onPickFinal,
  picking,
}: {
  room: RoomPublic;
  tally: CellTally;
  participants: ParticipantPublic[];
  isFinal: boolean;
  onPickFinal?: (date: string, slot: number, lock: boolean) => void;
  picking?: boolean;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const yes = tally.yes.map((id) => byId.get(id)).filter(Boolean) as ParticipantPublic[];
  const maybe = tally.maybe.map((id) => byId.get(id)).filter(Boolean) as ParticipantPublic[];
  const marked = new Set([...tally.yes, ...tally.maybe]);
  const no = participants.filter((p) => p.respondedAt && !marked.has(p.id));
  const pending = participants.filter((p) => !p.respondedAt);
  const { date, slot } = parseCellKey(tally.key);
  const multiDay = room.durationDays > 1;
  const keyMissing = no.filter((p) => p.required);
  const keyPending = pending.filter((p) => p.required);
  const keyWarning = [
    keyMissing.length && `สมาชิกหลักไม่ว่าง: ${keyMissing.map((p) => p.name).join(", ")}`,
    keyPending.length && `สมาชิกหลักยังไม่ตอบ: ${keyPending.map((p) => p.name).join(", ")}`,
  ].filter(Boolean) as string[];

  return (
    <section className="card animate-fade-up p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-400">
            {multiDay ? `ชุด ${room.durationDays} วันติดกัน` : "รายละเอียดช่วงเวลา"}
          </p>
          <h3 className="text-xl font-extrabold">{formatBlock(room, date)}</h3>
          <p className="text-sm text-stone-500">
            {slotLabel(room, slot)}
            {multiDay && " ทุกวัน"}
          </p>
        </div>
        {onPickFinal &&
          (isFinal ? (
            <span className="btn btn-neon pointer-events-none">
              <CalendarCheck className="size-4" /> สรุปเป็นวันประชุมแล้ว
            </span>
          ) : (
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <button
                type="button"
                disabled={picking}
                onClick={() => {
                  const warn = keyWarning.length ? `⚠️ ${keyWarning.join("\n⚠️ ")}\n\n` : "";
                  if (confirm(`${warn}สรุปเป็นวันประชุม และปิดรับคำตอบจากสมาชิก?`)) onPickFinal(date, slot, true);
                }}
                className="btn btn-primary"
              >
                <Lock className="size-4" /> สรุปและปิดรับคำตอบ
              </button>
              <button
                type="button"
                disabled={picking}
                onClick={() => {
                  if (!keyWarning.length || confirm(`⚠️ ${keyWarning.join("\n⚠️ ")}\n\nยืนยันวันนี้หรือไม่?`)) {
                    onPickFinal(date, slot, false);
                  }
                }}
                className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-ink hover:underline"
              >
                ยืนยันวันอย่างเดียว (ยังรับคำตอบต่อ)
              </button>
            </div>
          ))}
      </div>

      {keyWarning.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <div>
            {keyWarning.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NameGroup title={multiDay ? "สะดวกครบทุกวัน" : "สะดวก"} dot="bg-neon ring-1 ring-black/10" people={yes} />
        <NameGroup title={multiDay ? "ว่างทุกวัน (บางวันถ้าจำเป็น)" : "ถ้าจำเป็น"} dot="bg-lilac" people={maybe} />
        <NameGroup title={multiDay ? "ไม่ว่างบางวัน" : "ไม่สะดวก"} dot="bg-ink" people={no} />
        <NameGroup title="ยังไม่ตอบ" dot="bg-stone-300" people={pending} />
      </div>
    </section>
  );
}

function NameGroup({ title, dot, people }: { title: string; dot: string; people: ParticipantPublic[] }) {
  if (!people.length) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
        <span className={cx("size-2.5 rounded-full", dot)} />
        {title} ({people.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-canvas py-0.5 pr-3 pl-0.5 text-xs font-medium">
            <Avatar name={p.name} className="size-6 text-[10px]" />
            {p.name}
            {p.required && <Star className="size-3 fill-neon text-ink" aria-label="สมาชิกหลัก" />}
          </span>
        ))}
      </div>
    </div>
  );
}
