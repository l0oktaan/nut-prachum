"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarHeart,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Link as LinkIcon,
  Lock,
  Megaphone,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { ResultsPanel } from "./ResultsPanel";
import { FinalBanner } from "./FinalBanner";
import { RoomHeader } from "./RoomHeader";
import { Avatar, CopyButton, CopyField, cx, ErrorNote, Segmented, Spinner, Switch } from "./ui";
import { api, forgetRoom, loadSavedRooms, readHashParam, saveRoom, timeAgo, useClientValue } from "@/lib/client";
import { candidates, rank, tally } from "@/lib/results";
import { announcementText } from "@/lib/calendar";
import {
  blockStarts,
  cellKey,
  dateParts,
  formatBlock,
  formatDateShortYear,
  getDates,
  slotLabel,
  TIME_MODE_LABEL,
} from "@/lib/slots";
import { DurationField } from "./DurationField";
import type { AdminSnapshot, ParticipantAdmin } from "@/lib/types";
import { localToday, MultiDatePicker } from "./MultiDatePicker";

type Tab = "members" | "results" | "settings";

export function AdminView({ slug }: { slug: string }) {
  // The key comes from the #key=… hash, or from this browser's saved rooms. undefined = not read yet.
  const adminKey = useClientValue<string | null | undefined>(
    () => readHashParam("key") ?? loadSavedRooms().find((r) => r.slug === slug)?.adminKey ?? null,
    undefined,
  );
  const isNew = useClientValue(() => readHashParam("new") === "1", false);
  const origin = useClientValue(() => window.location.origin, "");
  const [data, setData] = useState<AdminSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("members");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!adminKey) return Promise.resolve();
    return api<AdminSnapshot>(`/api/rooms/${slug}/admin`, { adminKey }).then(
      (snap) => {
        setData(snap);
        setError(null);
        saveRoom({ slug, title: snap.room.title, adminKey });
      },
      (e: Error) => setError(e.message),
    );
  }, [slug, adminKey]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const call = async (url: string, init: RequestInit) => {
    setBusy(true);
    try {
      const res = await api<{ skipped?: string[] }>(url, { ...init, adminKey: adminKey! });
      await load();
      return res;
    } catch (e) {
      alert((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const patchRoom = (body: object) =>
    call(`/api/rooms/${slug}/admin`, { method: "PATCH", body: JSON.stringify(body) });

  if (adminKey === undefined || (adminKey && !data && !error)) {
    return (
      <Shell>
        <div className="card flex items-center gap-3 p-6 text-sm text-stone-500">
          <Spinner /> กำลังโหลดข้อมูลห้อง…
        </div>
      </Shell>
    );
  }

  if (!adminKey || !data) {
    return (
      <Shell>
        <div className="card mx-auto max-w-lg p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-stone-400" />
          <h1 className="mt-3 text-lg font-semibold">ไม่สามารถเข้าหน้าผู้ดูแลได้</h1>
          <p className="mt-1 text-sm text-stone-500">
            {error ?? "หน้านี้ต้องเปิดจาก “ลิงก์ผู้ดูแล” ที่ได้รับตอนสร้างห้องเท่านั้น"}
          </p>
          <Link href={`/r/${slug}`} className="btn btn-secondary mt-5">
            ไปหน้าสำหรับสมาชิก
          </Link>
        </div>
      </Shell>
    );
  }

  const { room, participants } = data;
  const memberUrl = `${origin}/r/${slug}`;
  const adminUrl = `${origin}/r/${slug}/admin#key=${adminKey}`;
  const responded = participants.filter((p) => p.respondedAt);
  const pending = participants.filter((p) => !p.respondedAt);
  const best = rank(candidates(room, tally(room, data.cells)), 1)[0];
  const inviteText = `📅 ช่วยเลือกวันเวลาที่สะดวกสำหรับ “${room.title}” หน่อยครับ/ค่ะ\n${memberUrl}`;
  const reminderText =
    `⏰ ยังรอคำตอบจาก: ${pending.map((p) => p.name).join(", ")}\n` +
    `เลือกวันเวลาที่สะดวกสำหรับ “${room.title}” ได้ที่ ${memberUrl}`;

  return (
    <Shell>
      <title>{`ผู้ดูแล · ${room.title}`}</title>
      {isNew && (
        <div className="card-neon animate-fade-up flex items-start gap-3 p-5">
          <Sparkles className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-extrabold">สร้างห้องเรียบร้อยแล้ว!</p>
            <p className="text-ink/70">
              ส่ง “ลิงก์สำหรับสมาชิก” ด้านล่างให้ทุกคน และเก็บ “ลิงก์ผู้ดูแล” ไว้กลับมาดูผล
            </p>
          </div>
        </div>
      )}

      <RoomHeader
        room={room}
        memberCount={participants.length}
        eyebrow={
          <span className="chip mb-3 bg-ink text-neon">
            <ShieldAlert className="size-3.5" /> หน้าผู้ดูแล
          </span>
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={load} disabled={busy}>
              <RefreshCw className={cx("size-4", busy && "animate-spin")} /> รีเฟรช
            </button>
            <Link href={`/r/${slug}`} target="_blank" className="btn btn-secondary">
              <ExternalLink className="size-4" /> หน้าสมาชิก
            </Link>
          </>
        }
      />

      <FinalBanner room={room} />
      {room.finalDate && room.finalSlot !== null && (
        <Announcement
          data={data}
          memberUrl={memberUrl}
          busy={busy}
          onReopen={() => {
            if (confirm("ยกเลิกการสรุปวัน และเปิดรับคำตอบอีกครั้ง?")) patchRoom({ final: null, isLocked: false });
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="icon-bubble bg-neon"><LinkIcon className="size-4" /></span> ลิงก์สำหรับสมาชิก
          </h2>
          <p className="mt-1 mb-3 text-xs text-stone-500">ส่งลิงก์นี้ในกลุ่มแชต สมาชิกเปิดแล้วเลือกชื่อตัวเองได้ทันที</p>
          <CopyField value={memberUrl} label="ลิงก์สำหรับสมาชิก" />
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={inviteText} label="คัดลอกข้อความเชิญ" className="btn-secondary btn-sm" />
            <a
              className="btn btn-sm bg-[#06C755] text-white hover:brightness-95"
              href={`https://line.me/R/share?text=${encodeURIComponent(inviteText)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-3.5" /> แชร์ผ่าน LINE
            </a>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="icon-bubble bg-ink text-neon"><ShieldAlert className="size-4" /></span> ลิงก์ผู้ดูแล (เก็บเป็นความลับ)
          </h2>
          <p className="mt-1 mb-3 text-xs text-stone-500">
            ใช้ลิงก์นี้กลับมาจัดการห้อง ใครมีลิงก์นี้จะแก้ไขห้องได้ — เบราว์เซอร์นี้จำไว้ให้แล้ว
          </p>
          <CopyField value={adminUrl} label="ลิงก์ผู้ดูแล" />
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <ResponseStatus participants={participants} />
        <Stat icon={<Users className="size-4" />} label="สมาชิกทั้งหมด" value={participants.length} unit="คน" />
        <Stat
          icon={<CheckCircle2 className="size-4" />}
          label="ตอบแล้ว"
          value={responded.length}
          unit="คน"
          badge={participants.length ? `${Math.round((responded.length / participants.length) * 100)}%` : undefined}
        />
        <Stat icon={<Clock3 className="size-4" />} label="ยังไม่ตอบ" value={pending.length} unit="คน" />
        <Stat
          dark
          icon={<Sparkles className="size-4" />}
          label="เวลาที่ดีที่สุดตอนนี้"
          value={best ? best.yes.length : "—"}
          unit={best ? `/${responded.length} คน` : undefined}
          sub={best ? `${formatBlock(room, best.date)} · ${slotLabel(room, best.slot)}` : "รอสมาชิกตอบ"}
        />
      </div>

      <Segmented
        className="self-start"
        value={tab}
        onChange={setTab}
        options={[
          { value: "members", label: <><Users className="size-4" /> สมาชิก</> },
          { value: "results", label: <><BarChart3 className="size-4" /> ผลรวม</> },
          { value: "settings", label: <><Settings className="size-4" /> ตั้งค่า</> },
        ]}
      />

      {tab === "members" && (
        <Members
          slug={slug}
          origin={origin}
          participants={participants}
          reminderText={pending.length ? reminderText : null}
          busy={busy}
          call={call}
        />
      )}

      {tab === "results" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-stone-500">
            คลิกช่องในตารางหรืออันดับด้านขวาเพื่อดูว่าใครว่างบ้าง แล้วกด “สรุปและปิดรับคำตอบ”
          </p>
          <ResultsPanel
            room={room}
            participants={participants}
            cells={data.cells}
            picking={busy}
            onPickFinal={async (date, slot, lock) => {
              await patchRoom({ final: { date, slot }, ...(lock ? { isLocked: true } : {}) });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      {tab === "settings" && <RoomSettings data={data} busy={busy} patchRoom={patchRoom} slug={slug} adminKey={adminKey} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">{children}</div>;
}

function Stat({
  icon,
  label,
  value,
  unit,
  badge,
  sub,
  dark,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  badge?: string;
  sub?: string;
  dark?: boolean;
}) {
  return (
    <div className={cx("flex flex-col justify-between gap-5 p-5", dark ? "card-dark" : "card")}>
      <p className={cx("card-title text-sm", dark ? "text-white" : "text-ink")}>
        <span className={cx("icon-bubble", dark ? "bg-white/10 text-neon" : "bg-canvas")}>{icon}</span>
        {label}
      </p>
      <div>
        <p className="flex items-end gap-2">
          <span className="metric">{value}</span>
          {unit && <span className={cx("pb-0.5 text-sm", dark ? "text-stone-400" : "text-stone-500")}>{unit}</span>}
          {badge && <span className="badge-up mb-1 ml-auto">{badge}</span>}
        </p>
        {sub && <p className={cx("mt-2 truncate text-xs", dark ? "text-stone-400" : "text-stone-500")}>{sub}</p>}
      </div>
    </div>
  );
}

/** Overlapping circles + progress bars showing how far along the responses are. */
function ResponseStatus({ participants }: { participants: ParticipantAdmin[] }) {
  const total = Math.max(1, participants.length);
  const groups = [
    {
      label: "ตอบแล้ว",
      count: participants.filter((p) => p.respondedAt).length,
      circle: "bg-lilac text-white",
      bar: "bg-lilac",
      pos: { left: "38%", top: "40%" },
    },
    {
      label: "เปิดลิงก์แล้ว",
      count: participants.filter((p) => !p.respondedAt && p.claimedAt).length,
      circle: "bg-ink text-white",
      bar: "bg-ink",
      pos: { left: "65%", top: "47%" },
    },
    {
      label: "ยังไม่เปิด",
      count: participants.filter((p) => !p.respondedAt && !p.claimedAt).length,
      circle: "bg-neon text-ink",
      bar: "bg-neon",
      pos: { left: "50%", top: "77%" },
    },
  ];
  const size = (n: number) => Math.round(64 + 96 * Math.sqrt(n / total)); // px

  return (
    <section className="card flex flex-col gap-6 p-5 sm:p-6 lg:row-span-2">
      <h2 className="card-title">
        <span className="icon-bubble bg-canvas">
          <Users className="size-4" />
        </span>
        สถานะการตอบ
      </h2>

      <div className="relative mx-auto h-56 w-full max-w-xs" aria-hidden>
        {groups.map((g) => (
          <span
            key={g.label}
            className={cx(
              "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-center leading-tight shadow-lg ring-4 ring-white transition-all",
              g.circle,
            )}
            style={{ ...g.pos, width: size(g.count), height: size(g.count) }}
          >
            <span>
              <span className="block text-xl font-extrabold">{g.count}</span>
              <span className="block text-[10px] opacity-80">{g.label}</span>
            </span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3.5">
        {groups.map((g) => {
          const pct = Math.round((g.count / total) * 100);
          return (
            <div key={g.label}>
              <p className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">{g.label}</span>
                <span className="font-bold tabular-nums">{participants.length ? pct : 0}%</span>
              </p>
              <span className="block h-2.5 overflow-hidden rounded-full bg-canvas">
                <span
                  className={cx("block h-full rounded-full", g.bar)}
                  style={{ width: `${participants.length ? pct : 0}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------- members --------------------------------- */

function Members({
  slug,
  origin,
  participants,
  reminderText,
  busy,
  call,
}: {
  slug: string;
  origin: string;
  participants: ParticipantAdmin[];
  reminderText: string | null;
  busy: boolean;
  call: (url: string, init: RequestInit) => Promise<{ skipped?: string[] } | null>;
}) {
  const [names, setNames] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const sorted = useMemo(
    () =>
      [...participants].sort(
        (a, b) => Number(!!a.respondedAt) - Number(!!b.respondedAt) || a.name.localeCompare(b.name, "th"),
      ),
    [participants],
  );

  const add = async () => {
    const list = names.split(/\n|,/).map((n) => n.trim()).filter(Boolean);
    if (!list.length) return;
    const res = await call(`/api/rooms/${slug}/admin/members`, { method: "POST", body: JSON.stringify({ names: list }) });
    if (res) {
      setNames("");
      setNote(res.skipped?.length ? `ข้ามชื่อที่มีอยู่แล้ว: ${res.skipped.join(", ")}` : null);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-5 py-4">
          <h2 className="font-semibold">รายชื่อและสถานะ</h2>
          {reminderText && <CopyButton text={reminderText} label="คัดลอกข้อความทวงคำตอบ" className="btn-secondary btn-sm" />}
        </div>
        {sorted.length === 0 ? (
          <p className="p-10 text-center text-sm text-stone-500">
            ยังไม่มีสมาชิก — เพิ่มรายชื่อทางขวา หรือรอให้สมาชิกเข้ามาใส่ชื่อเอง
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {sorted.map((p) => (
              <MemberRow key={p.id} p={p} slug={slug} origin={origin} busy={busy} call={call} />
            ))}
          </ul>
        )}
      </section>

      <section className="card h-fit p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4" /> เพิ่มรายชื่อสมาชิก
        </h3>
        <p className="mt-1 mb-3 text-xs text-stone-500">หนึ่งชื่อต่อหนึ่งบรรทัด แต่ละคนจะได้ลิงก์ส่วนตัวของตัวเอง</p>
        <textarea
          className="input min-h-32 resize-y"
          placeholder={"สมชาย ใจดี\nสมหญิง รักงาน"}
          value={names}
          onChange={(e) => setNames(e.target.value)}
        />
        <button type="button" className="btn btn-primary mt-3 w-full" disabled={busy || !names.trim()} onClick={add}>
          เพิ่มรายชื่อ
        </button>
        {note && <p className="hint">{note}</p>}
      </section>
    </div>
  );
}

function MemberRow({
  p,
  slug,
  origin,
  busy,
  call,
}: {
  p: ParticipantAdmin;
  slug: string;
  origin: string;
  busy: boolean;
  call: (url: string, init: RequestInit) => Promise<unknown>;
}) {
  const url = `/api/rooms/${slug}/admin/members/${p.id}`;
  const personalLink = `${origin}/r/${slug}#t=${p.token}`;

  const status = p.respondedAt
    ? { label: "ตอบแล้ว", cls: "bg-neon text-ink", when: p.respondedAt }
    : p.claimedAt
      ? { label: "เปิดลิงก์แล้ว", cls: "bg-lilac-soft text-violet-800", when: p.lastSeenAt }
      : { label: "ยังไม่เปิด", cls: "bg-canvas text-stone-500", when: null };

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <Avatar name={p.name} className="size-8 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {p.name}
          {!p.invited && <span className="ml-2 text-xs font-normal text-stone-400">(เพิ่มชื่อเอง)</span>}
        </p>
        <p className="flex items-center gap-2 text-xs text-stone-500">
          <span className={cx("chip px-2 py-0.5", status.cls)}>{status.label}</span>
          {status.when && <span>{timeAgo(status.when)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <CopyButton text={personalLink} label="ลิงก์ส่วนตัว" className="btn-ghost btn-sm" />
        <button
          type="button"
          title="ออกลิงก์ใหม่ (ลิงก์เดิมจะใช้ไม่ได้ และปลดล็อกชื่อให้เลือกใหม่ได้)"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => {
            if (confirm(`ออกลิงก์ส่วนตัวใหม่ให้ “${p.name}”? ลิงก์เดิมจะใช้ไม่ได้อีก`)) call(url, { method: "PATCH", body: JSON.stringify({ action: "reset" }) });
          }}
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          title="ลบสมาชิก"
          className="btn btn-danger btn-sm"
          disabled={busy}
          onClick={() => {
            if (confirm(`ลบ “${p.name}” และคำตอบทั้งหมดของคนนี้?`)) call(url, { method: "DELETE" });
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/* --------------------------------- settings -------------------------------- */

function RoomSettings({
  data,
  busy,
  patchRoom,
  slug,
  adminKey,
}: {
  data: AdminSnapshot;
  busy: boolean;
  patchRoom: (body: object) => Promise<unknown>;
  slug: string;
  adminKey: string;
}) {
  const { room } = data;
  const router = useRouter();
  const [title, setTitle] = useState(room.title);
  const [description, setDescription] = useState(room.description);
  const [error, setError] = useState<string | null>(null);
  const dirty = title !== room.title || description !== room.description;

  const remove = async () => {
    if (!confirm(`ลบห้อง “${room.title}” และคำตอบทั้งหมดถาวร?`)) return;
    try {
      await api(`/api/rooms/${slug}/admin`, { method: "DELETE", adminKey });
      forgetRoom(slug);
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DatesEditor key={`${getDates(room).join()}:${room.durationDays}`} data={data} busy={busy} patchRoom={patchRoom} />

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-semibold">ข้อมูลห้อง</h2>
        <div>
          <label className="label" htmlFor="s-title">หัวข้อการประชุม</label>
          <input id="s-title" className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="s-desc">รายละเอียด</label>
          <textarea
            id="s-desc"
            className="input min-h-24 resize-y"
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary self-start"
          disabled={!dirty || busy || !title.trim()}
          onClick={() => patchRoom({ title, description })}
        >
          บันทึก
        </button>
      </section>

      <div className="flex flex-col gap-5">
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="font-semibold">การตอบรับ</h2>
          <Switch
            checked={room.allowNewMembers}
            disabled={busy}
            onChange={(v) => patchRoom({ allowNewMembers: v })}
            label="อนุญาตให้เพิ่มชื่อเอง"
            description="ผู้ที่ไม่มีชื่อในรายการสามารถพิมพ์ชื่อตัวเองเพื่อเข้าร่วมได้"
          />
          <Switch
            checked={room.isLocked}
            disabled={busy}
            onChange={(v) => patchRoom({ isLocked: v })}
            label="ปิดรับคำตอบ"
            description="สมาชิกยังดูผลได้ แต่แก้ไขเวลาไม่ได้"
          />
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <Eye className="size-3.5" /> รูปแบบเวลา ({TIME_MODE_LABEL[room.timeMode]}) เปลี่ยนไม่ได้หลังสร้างห้อง เพราะคำตอบเดิมจะใช้ไม่ได้
          </p>
        </section>

        <section className="card border-rose-100 p-5">
          <h2 className="font-semibold text-rose-700">ลบห้อง</h2>
          <p className="mt-1 mb-3 text-sm text-stone-500">ลบห้องนี้และคำตอบของทุกคนอย่างถาวร ไม่สามารถกู้คืนได้</p>
          <button type="button" className="btn border border-rose-200 text-rose-600 hover:bg-rose-50" onClick={remove}>
            <Trash2 className="size-4" /> ลบห้องนี้
          </button>
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------- date editor ------------------------------- */

const dateLabel = (d: string) => `${dateParts(d).weekday} ${formatDateShortYear(d)}`;

function DatesEditor({
  data,
  busy,
  patchRoom,
}: {
  data: AdminSnapshot;
  busy: boolean;
  patchRoom: (body: object) => Promise<unknown>;
}) {
  const { room, cells, participants } = data;
  const original = useMemo(() => getDates(room), [room]);
  const [draft, setDraft] = useState(original);
  const [duration, setDuration] = useState(room.durationDays);
  const today = useClientValue(localToday, "");

  const draftSet = new Set(draft);
  const originalSet = new Set(original);
  const added = draft.filter((d) => !originalSet.has(d));
  const removed = original.filter((d) => !draftSet.has(d));
  const datesChanged = added.length > 0 || removed.length > 0;
  const durationChanged = duration !== room.durationDays;
  const changed = datesChanged || durationChanged;
  const nextStarts = blockStarts({ ...room, dates: draft, durationDays: duration });

  // Who answered on each date being removed — their answers for that date will be deleted.
  const names = new Map(participants.map((p) => [p.id, p.name]));
  const impact = removed.map((d) => ({
    date: d,
    people: [...new Set(cells.filter((c) => c.d === d).map((c) => c.p))].map((id) => names.get(id) ?? "?"),
  }));
  // The confirmed meeting survives only if it still starts a full run of consecutive days.
  const losesFinal = changed && room.finalDate !== null && !nextStarts.includes(room.finalDate);

  const save = () => {
    const affected = impact.filter((i) => i.people.length);
    if (affected.length || losesFinal) {
      const lines = affected.map((i) => `• ${dateLabel(i.date)} — ${i.people.length} คน (${i.people.join(", ")})`);
      const msg = [
        affected.length && `วันที่จะเอาออกมีคำตอบอยู่แล้ว:\n${lines.join("\n")}\n\nคำตอบของวันเหล่านี้จะถูกลบถาวร`,
        losesFinal && "วันประชุมที่ยืนยันไว้จะถูกยกเลิก",
      ]
        .filter(Boolean)
        .join("\n\n");
      if (!confirm(`${msg}\n\nต้องการบันทึกหรือไม่?`)) return;
    }
    patchRoom({
      ...(datesChanged ? { dates: draft } : {}),
      ...(durationChanged ? { durationDays: duration } : {}),
    });
  };

  return (
    <section className="card p-5 lg:col-span-2">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <span className="icon-bubble bg-lilac text-white">
          <CalendarHeart className="size-4" />
        </span>
        วันที่ที่ถามสมาชิก
      </h2>
      <p className="mt-1 mb-5 text-sm text-stone-500">
        เพิ่มวันได้ตลอด คำตอบเดิมไม่หาย · ถ้าเอาวันออก คำตอบของวันนั้นจะถูกลบ
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <MultiDatePicker
            value={draft}
            onChange={setDraft}
            keepPast={original}
            initialMonth={original.find((d) => d >= today) ?? original[0]}
          />
          <DurationField value={duration} onChange={setDuration} dates={draft} />
        </div>

        <div className="flex flex-col gap-4">
          {!changed ? (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-stone-500">
              ยังไม่มีการเปลี่ยนแปลง — แตะวันบนปฏิทินเพื่อเพิ่มหรือเอาออก หรือปรับจำนวนวันประชุมติดกัน
            </p>
          ) : (
            <>
              {durationChanged && (
                <p className="rounded-2xl bg-canvas px-4 py-3 text-sm">
                  ประชุมติดกัน <b>{room.durationDays}</b> → <b>{duration}</b> วัน
                  <span className="block text-xs text-stone-500">คำตอบเดิมไม่หาย ระบบคำนวณอันดับใหม่ให้</span>
                </p>
              )}
              {added.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-ink">เพิ่ม {added.length} วัน</p>
                  <div className="flex flex-wrap gap-1.5">
                    {added.map((d) => (
                      <span key={d} className="chip bg-neon text-ink">
                        + {dateLabel(d)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {removed.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-rose-600">เอาออก {removed.length} วัน</p>
                  <ul className="flex flex-col gap-1.5">
                    {impact.map((i) => (
                      <li
                        key={i.date}
                        className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-1.5 text-xs text-rose-700"
                      >
                        <span className="font-medium">− {dateLabel(i.date)}</span>
                        <span className={i.people.length ? "font-semibold" : "opacity-70"}>
                          {i.people.length ? `คำตอบ ${i.people.length} คนจะถูกลบ` : "ยังไม่มีใครตอบ"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {losesFinal && (
                <p className="flex items-start gap-2 rounded-2xl bg-ink px-3 py-2.5 text-xs text-white">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  วันประชุมที่สรุปไว้จะไม่ครบชุดวันติดกันแล้ว — การสรุปจะถูกยกเลิก
                </p>
              )}
            </>
          )}

          <div className="mt-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!changed || busy || draft.length === 0 || nextStarts.length === 0}
              onClick={save}
            >
              {busy ? <Spinner /> : <CheckCircle2 className="size-4" />} บันทึกวันที่
            </button>
            <button type="button" className="btn btn-ghost" disabled={!changed} onClick={() => {
              setDraft(original);
              setDuration(room.durationDays);
            }}>
              <RotateCcw className="size-4" /> ยกเลิกการแก้ไข
            </button>
          </div>
          {draft.length === 0 && <p className="hint text-rose-500">ต้องเหลืออย่างน้อย 1 วัน</p>}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ announcement ------------------------------ */

/** After the meeting is confirmed: a ready-made message to paste in the group chat, and a way to reopen. */
function Announcement({
  data,
  memberUrl,
  busy,
  onReopen,
}: {
  data: AdminSnapshot;
  memberUrl: string;
  busy: boolean;
  onReopen: () => void;
}) {
  const { room, participants, cells } = data;
  const responded = participants.filter((p) => p.respondedAt).length;
  const final = candidates(room, tally(room, cells)).get(cellKey(room.finalDate!, room.finalSlot!));
  const text = announcementText(
    room,
    { title: room.title, description: room.description, date: room.finalDate!, slot: room.finalSlot! },
    memberUrl,
    final ? { yes: final.yes.length, total: responded } : undefined,
  );

  return (
    <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <h2 className="card-title">
          <span className="icon-bubble bg-neon">
            <Megaphone className="size-4" />
          </span>
          ประกาศวันประชุมให้สมาชิก
          <span
            className={cx(
              "chip ml-1",
              room.isLocked ? "bg-ink text-neon" : "bg-lilac-soft text-violet-800",
            )}
          >
            {room.isLocked ? <><Lock className="size-3" /> ปิดรับคำตอบแล้ว</> : "ยังเปิดรับคำตอบ"}
          </span>
        </h2>
        <p className="mt-1 mb-3 text-sm text-stone-500">
          สมาชิกที่เปิดลิงก์จะเห็นวันประชุมทันที — คัดลอกข้อความนี้ไปแจ้งในกลุ่มแชตได้เลย
        </p>
        <pre className="rounded-2xl bg-canvas p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink">
          {text}
        </pre>
      </div>
      <div className="flex flex-wrap gap-2 lg:w-52 lg:flex-col">
        <CopyButton text={text} label="คัดลอกข้อความประกาศ" className="btn-primary" />
        <a
          className="btn bg-[#06C755] text-white hover:brightness-95"
          href={`https://line.me/R/share?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="size-4" /> แชร์ผ่าน LINE
        </a>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onReopen}>
          <RotateCcw className="size-4" /> ยกเลิกการสรุป
        </button>
      </div>
    </section>
  );
}
