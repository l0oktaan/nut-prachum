"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarHeart, Clock, Clock3, Coffee, PenLine, Sparkles, Sun, Users } from "lucide-react";
import { DurationField } from "./DurationField";
import { MultiDatePicker } from "./MultiDatePicker";
import { cx, ErrorNote, Segmented, Spinner, Switch } from "./ui";
import { api, saveRoom } from "@/lib/client";
import { fmtMin, getSlots, type TimeMode } from "@/lib/slots";

const HOURS = Array.from({ length: 18 }, (_, i) => (i + 6) * 60); // 06:00 – 23:00

export function CreateRoomForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [timeMode, setTimeMode] = useState<TimeMode>("period");
  const [dayStartMin, setDayStartMin] = useState(540);
  const [dayEndMin, setDayEndMin] = useState(1020);
  const [slotMinutes, setSlotMinutes] = useState<30 | 60>(60);
  const [durationDays, setDurationDays] = useState(1);
  const [members, setMembers] = useState("");
  const [allowNewMembers, setAllowNewMembers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberList = members.split(/\n|,/).map((n) => n.trim()).filter(Boolean);
  const slotCount = getSlots({
    dates,
    startDate: "",
    endDate: "",
    excludeWeekends: false,
    timeMode,
    dayStartMin,
    dayEndMin,
    slotMinutes,
    durationDays,
  }).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dates.length) {
      setError("กรุณาเลือกวันที่บนปฏิทินอย่างน้อย 1 วัน");
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
          allowNewMembers,
          members: memberList,
        }),
      });
      saveRoom({ slug: res.slug, title, adminKey: res.adminKey });
      router.push(`/r/${res.slug}/admin#key=${res.adminKey}&new=1`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card flex flex-col gap-8 p-5 sm:p-8">
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
          {timeMode === "period" && "แบ่งวันเป็น เช้า (09–12), บ่าย (13–16), เย็น (17–20) — เลือกง่ายบนมือถือ"}
          {timeMode === "hour" && "ละเอียดที่สุด เหมาะกับจำนวนวันไม่มาก"}
          {dates.length > 0 && slotCount > 0 && (
            <span className="ml-1 font-semibold text-ink">
              · ตาราง {dates.length} วัน × {slotCount} ช่วง
            </span>
          )}
        </p>
      </Section>

      <Section icon={<Users className="size-4" />} tone="bg-canvas text-ink" title="รายชื่อสมาชิก (แนะนำ)">
        <div>
          <textarea
            className="input min-h-28 resize-y"
            placeholder={"ใส่ชื่อทีละบรรทัด เช่น\nสมชาย ใจดี\nสมหญิง รักงาน"}
            value={members}
            onChange={(e) => setMembers(e.target.value)}
          />
          <p className="hint">
            {memberList.length > 0 && <span className="font-semibold text-ink">{memberList.length} คน · </span>}
            สมาชิกจะเลือกชื่อตัวเองจากรายการ ทำให้รู้ว่าใครตอบแล้ว/ยังไม่ตอบ และได้ลิงก์ส่วนตัวรายคน
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
      <legend className="mb-4 flex items-center gap-3 text-lg font-bold text-ink">
        <span className={cx("icon-bubble", tone)}>{icon}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
