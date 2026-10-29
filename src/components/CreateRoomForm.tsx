"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarHeart, Clock, Clock3, Coffee, CopyPlus, PenLine, Sparkles, Sun, Users, X } from "lucide-react";
import { DateSlotsField } from "./DateSlotsField";
import { DurationField } from "./DurationField";
import { isDefaultPeriods, PeriodsField, periodsProblem } from "./PeriodsField";
import { MultiDatePicker } from "./MultiDatePicker";
import { cx, ErrorNote, Segmented, Spinner, Switch } from "./ui";
import { api, clearDraft, parseDraft, readDraftRaw, saveRoom, useClientValue, type RoomDraft } from "@/lib/client";
import {
  cleanDateSlots,
  DEFAULT_PERIODS,
  fmtMin,
  getSlots,
  slotsForDate,
  type Period,
  type SlotConfig,
  type TimeMode,
} from "@/lib/slots";

const HOURS = Array.from({ length: 18 }, (_, i) => (i + 6) * 60); // 06:00 – 23:00

/** The create form — prefilled from an earlier room when opened as /?repeat={slug}. */
export function CreateRoomForm() {
  // Server render and hydration use a blank form; the draft (if any) then remounts it prefilled.
  const router = useRouter();
  const raw = useClientValue(readDraftRaw, null);
  const [dismissed, setDismissed] = useState(false);
  const draft = useMemo(() => (dismissed ? null : parseDraft(raw)), [raw, dismissed]);
  const dismiss = () => {
    if (draft) clearDraft(draft.fromSlug);
    setDismissed(true);
    router.replace("/", { scroll: false });
  };
  return <RoomForm key={draft ? raw : "blank"} draft={draft} onDismiss={dismiss} />;
}

function RoomForm({ draft, onDismiss }: { draft: RoomDraft | null; onDismiss: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(draft?.title ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [organizerName, setOrganizerName] = useState(draft?.organizerName ?? "");
  const [dates, setDates] = useState<string[]>([]);
  const [timeMode, setTimeMode] = useState<TimeMode>(draft?.timeMode ?? "period");
  const [dayStartMin, setDayStartMin] = useState(draft?.dayStartMin ?? 540);
  const [dayEndMin, setDayEndMin] = useState(draft?.dayEndMin ?? 1020);
  const [slotMinutes, setSlotMinutes] = useState<30 | 60>(draft?.slotMinutes === 30 ? 30 : 60);
  const [durationDays, setDurationDays] = useState(draft?.durationDays ?? 1);
  const [dateSlots, setDateSlots] = useState<Record<string, number[]>>({});
  const [periods, setPeriods] = useState<Period[]>(() =>
    (draft?.periods?.length ? draft.periods : DEFAULT_PERIODS).map((p) => ({ ...p })),
  );
  const [members, setMembers] = useState(draft?.members.join("\n") ?? "");
  const [allowNewMembers, setAllowNewMembers] = useState(draft?.allowNewMembers ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One name per line; a leading "*" marks a key member, e.g. "*ประธาน".
  const memberLines = members.split(/\n|,/).map((n) => n.trim());
  const nameOf = (line: string) => line.replace(/^\*\s*/, "");
  const memberList = memberLines.map(nameOf).filter(Boolean);
  const requiredList = memberLines.filter((l) => l.startsWith("*")).map(nameOf).filter(Boolean);
  const config: SlotConfig = {
    dates,
    startDate: "",
    endDate: "",
    excludeWeekends: false,
    timeMode,
    dayStartMin,
    dayEndMin,
    slotMinutes,
    durationDays,
    dateSlots,
    // Slot keys are positions in time order (the server sorts too), so per-date picks line up.
    periods: [...periods].sort((a, b) => a.start - b.start),
  };
  const periodError = timeMode === "period" ? periodsProblem(periods) : null;
  // Per-date picks point at periods by position: drop them when the periods' order or count changes.
  const changePeriods = (next: Period[]) => {
    const order = (ps: Period[]) => [...ps].sort((a, b) => a.start - b.start).map((p) => ps.indexOf(p)).join();
    if (next.length !== periods.length || order(next) !== order(periods)) setDateSlots({});
    setPeriods(next);
  };
  const slotCount = getSlots(config).length;
  const perDate = Object.keys(cleanDateSlots(config, dateSlots)).length > 0;
  const cellCount = dates.reduce((n, d) => n + slotsForDate(config, d).length, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dates.length) {
      setError("กรุณาเลือกวันที่บนปฏิทินอย่างน้อย 1 วัน");
      return;
    }
    if (periodError) {
      setError(periodError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ slug: string; adminKey: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          organizerName,
          dates,
          timeMode,
          dayStartMin,
          dayEndMin,
          slotMinutes,
          durationDays,
          dateSlots: cleanDateSlots(config, dateSlots),
          periods: timeMode === "period" && !isDefaultPeriods(periods) ? config.periods : [],
          allowNewMembers,
          members: memberList,
          required: requiredList,
        }),
      });
      saveRoom({ slug: res.slug, title, adminKey: res.adminKey });
      if (draft) clearDraft(draft.fromSlug);
      router.push(`/r/${res.slug}/admin#key=${res.adminKey}&new=1`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card flex flex-col gap-8 p-5 sm:p-8">
      {draft && (
        <div className="card-neon flex items-start gap-3 p-4">
          <CopyPlus className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-extrabold">สร้างนัดซ้ำจาก “{draft.title}”</p>
            <p className="text-ink/70">
              ใช้หัวข้อ รายชื่อสมาชิก {draft.members.length} คน และรูปแบบเวลาเดิมให้แล้ว — เลือกวันและเวลาใหม่ได้เลย
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="grid size-8 shrink-0 place-items-center rounded-full transition hover:bg-black/10"
            aria-label="ล้างฟอร์ม เริ่มสร้างห้องใหม่"
            title="ล้างฟอร์ม เริ่มสร้างห้องใหม่"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <Section icon={<PenLine className="size-4" />} tone="bg-neon text-ink" title="รายละเอียดการประชุม">
        <div>
          <label className="label" htmlFor="title">หัวข้อการประชุม *</label>
          <input
            id="title"
            className="input"
            placeholder="เช่น ประชุมคณะกรรมการประจำเดือน พ.ย."
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="org">ชื่อผู้จัด</label>
            <input
              id="org"
              className="input"
              placeholder="เช่น เลขานุการ"
              maxLength={60}
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="desc">รายละเอียด / สถานที่</label>
            <input
              id="desc"
              className="input"
              placeholder="ไม่บังคับ"
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section icon={<CalendarHeart className="size-4" />} tone="bg-lilac text-white" title="วันที่ต้องการถามสมาชิก">
        <MultiDatePicker value={dates} onChange={setDates} />
        <DurationField value={durationDays} onChange={setDurationDays} dates={dates} />
      </Section>

      <Section icon={<Clock className="size-4" />} tone="bg-ink text-neon" title="ความละเอียดของเวลา">
        <Segmented
          className="w-full"
          value={timeMode}
          onChange={setTimeMode}
          options={[
            { value: "day", label: <><Sun className="size-4" /> ทั้งวัน</> },
            { value: "period", label: <><Coffee className="size-4" /> เช้า/บ่าย/เย็น</> },
            { value: "hour", label: <><Clock3 className="size-4" /> รายชั่วโมง</> },
          ]}
        />
        {timeMode === "hour" && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="h-start">เริ่ม</label>
              <select id="h-start" className="input" value={dayStartMin} onChange={(e) => setDayStartMin(Number(e.target.value))}>
                {HOURS.map((m) => <option key={m} value={m}>{fmtMin(m)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="h-end">สิ้นสุด</label>
              <select id="h-end" className="input" value={dayEndMin} onChange={(e) => setDayEndMin(Number(e.target.value))}>
                {[...HOURS.slice(1), 1440].map((m) => <option key={m} value={m}>{fmtMin(m)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="h-step">ช่องละ</label>
              <select id="h-step" className="input" value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value) as 30 | 60)}>
                <option value={60}>1 ชม.</option>
                <option value={30}>30 นาที</option>
              </select>
            </div>
          </div>
        )}
        <p className="text-sm text-stone-500">
          {timeMode === "day" && "สมาชิกเลือกเป็นวัน เหมาะกับการนัดที่ยังไม่ต้องลงรายละเอียดเวลา"}
          {timeMode === "period" && "แบ่งวันเป็นช่วง ๆ ปรับชื่อและเวลาของแต่ละช่วงได้ — เลือกง่ายบนมือถือ"}
          {timeMode === "hour" && "ละเอียดที่สุด เหมาะกับจำนวนวันไม่มาก"}
          {dates.length > 0 && slotCount > 0 && (
            <span className="ml-1 font-semibold text-fg">
              · ตาราง {dates.length} วัน × {slotCount} ช่วง
              {perDate && ` (เปิดให้เลือก ${cellCount} ช่อง)`}
            </span>
          )}
        </p>
        {timeMode === "period" && <PeriodsField value={periods} onChange={changePeriods} />}
        {timeMode !== "day" && <DateSlotsField config={config} value={dateSlots} onChange={setDateSlots} />}
      </Section>

      <Section icon={<Users className="size-4" />} tone="bg-canvas text-fg" title="รายชื่อสมาชิก (แนะนำ)">
        <div>
          <textarea
            className="input min-h-28 resize-y"
            placeholder={"ใส่ชื่อทีละบรรทัด เช่น\n*ประธานกรรมการ\nสมชาย ใจดี\nสมหญิง รักงาน"}
            value={members}
            onChange={(e) => setMembers(e.target.value)}
          />
          <p className="hint">
            {memberList.length > 0 && (
              <span className="font-semibold text-fg">
                {memberList.length} คน{requiredList.length > 0 && ` (สมาชิกหลัก ${requiredList.length} คน)`} ·{" "}
              </span>
            )}
            สมาชิกจะเลือกชื่อตัวเองจากรายการ ทำให้รู้ว่าใครตอบแล้ว/ยังไม่ตอบ และได้ลิงก์ส่วนตัวรายคน
          </p>
          <p className="hint">
            ใส่ <b className="text-fg">*</b> หน้าชื่อ = <b className="text-fg">สมาชิกหลัก</b> ที่ต้องมา เช่น *ประธาน —
            ระบบจะจัดอันดับช่วงที่สมาชิกหลักว่างครบไว้ก่อน
          </p>
        </div>
        <Switch
          checked={allowNewMembers}
          onChange={setAllowNewMembers}
          label="อนุญาตให้คนที่ไม่มีชื่อ พิมพ์ชื่อเข้าร่วมเองได้"
        />
      </Section>

      <ErrorNote message={error} />

      <button type="submit" className="btn btn-neon py-3.5 text-base" disabled={busy || !title.trim()}>
        {busy ? <Spinner /> : <Sparkles className="size-5" />}
        สร้างห้องและรับลิงก์
      </button>
    </form>
  );
}

function Section({
  icon,
  tone,
  title,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-3 text-lg font-bold text-fg">
        <span className={cx("icon-bubble", tone)}>{icon}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
