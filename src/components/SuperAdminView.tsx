"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  EyeOff,
  HardDrive,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CopyField, cx, ErrorNote, Segmented, Spinner } from "./ui";
import { formatDateShortYear, formatRange, TH_LOCALE } from "@/lib/slots";

type Tab = "status" | "rooms" | "cleanup" | "security";

class Unauthorized extends Error {}

/** fetch for the super admin API: JSON in/out, errors as messages, 401 as Unauthorized. */
async function sa<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Unauthorized((data as { error?: string }).error);
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "เกิดข้อผิดพลาด");
  return data as T;
}

const fmtTime = new Intl.DateTimeFormat(TH_LOCALE, { dateStyle: "medium", timeStyle: "short" });
const when = (iso: string) => fmtTime.format(new Date(iso));
const n = (x: number) => x.toLocaleString("th-TH");

function bytes(b: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i ? 1 : 0)} ${units[i]}`;
}

function duration(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d} วัน ${h} ชม.` : h ? `${h} ชม. ${m} นาที` : `${m} นาที`;
}

export function SuperAdminView() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("status");

  useEffect(() => {
    sa("/api/superadmin/session").then(
      () => setAuthed(true),
      () => setAuthed(false),
    );
  }, []);

  // Any tab that hits a 401 (session expired) drops back to the login form.
  const onError = useCallback((e: unknown) => {
    if (e instanceof Unauthorized) setAuthed(false);
  }, []);

  const logout = async () => {
    await sa("/api/superadmin/session", { method: "DELETE" }).catch(() => {});
    setAuthed(false);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip mb-3 bg-ink text-neon">
            <ShieldAlert className="size-3.5" /> Super admin
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">ดูแลระบบ</h1>
          <p className="mt-1 text-stone-500">สถานะระบบ · จัดการห้อง · ล้างข้อมูลขยะ · log ความปลอดภัย</p>
        </div>
        {authed && (
          <button type="button" className="btn btn-secondary" onClick={logout}>
            <LogOut className="size-4" /> ออกจากระบบ
          </button>
        )}
      </header>

      {authed === null ? (
        <div className="card flex items-center gap-3 p-6 text-sm text-stone-500">
          <Spinner /> กำลังตรวจสอบ…
        </div>
      ) : !authed ? (
        <Login onDone={() => setAuthed(true)} />
      ) : (
        <>
          {/* Four tabs don't fit a phone: let the row scroll sideways. */}
          <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-1">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "status", label: <><Activity className="size-4" /> สถานะระบบ</> },
                { value: "rooms", label: <><Database className="size-4" /> ห้องทั้งหมด</> },
                { value: "cleanup", label: <><Sparkles className="size-4" /> ล้างข้อมูลขยะ</> },
                { value: "security", label: <><ShieldCheck className="size-4" /> ความปลอดภัย</> },
              ]}
            />
          </div>
          {tab === "status" && <StatusTab onError={onError} />}
          {tab === "rooms" && <RoomsTab onError={onError} />}
          {tab === "cleanup" && <CleanupTab onError={onError} />}
          {tab === "security" && <SecurityTab onError={onError} />}
        </>
      )}
    </div>
  );
}

/* ---------------------------------- login --------------------------------- */

function Login({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sa("/api/superadmin/session", { method: "POST", body: JSON.stringify({ token }) });
      onDone();
    } catch (err) {
      setError((err as Error).message || "รหัสไม่ถูกต้อง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <h2 className="card-title">
        <span className="icon-bubble bg-ink text-neon">
          <KeyRound className="size-4" />
        </span>
        เข้าสู่ระบบ super admin
      </h2>
      <div>
        <label className="label" htmlFor="sa-token">รหัส (SUPERADMIN_TOKEN)</label>
        <input
          id="sa-token"
          type="password"
          className="input font-mono"
          autoComplete="current-password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="hint">ใส่ผิด 5 ครั้งจะถูกระงับ 15 นาที · เข้าสู่ระบบแล้วใช้ได้ 8 ชั่วโมง</p>
      </div>
      <ErrorNote message={error} />
      <button type="submit" className="btn btn-primary" disabled={busy || !token}>
        {busy ? <Spinner /> : <KeyRound className="size-4" />} เข้าสู่ระบบ
      </button>
    </form>
  );
}

/* --------------------------------- status --------------------------------- */

interface Status {
  app: { node: string; uptimeSec: number; rssBytes: number; heapUsedBytes: number; cookieSecure: boolean; appUrl: string | null };
  db: { latencyMs: number; version: string; sizeBytes: number; connections: number };
  counts: {
    rooms: number;
    rooms24h: number;
    rooms7d: number;
    roomsUpcoming: number;
    roomsFinal: number;
    participants: number;
    responded: number;
    answers: number;
  };
  disk: { total: number; free: number } | null;
  holidays: { count: number | null; fetchedAt: string | null; lastError: string | null };
  mail: { enabled: boolean; from: string | null };
  events24h: Record<string, number>;
}

/** Loads `url` on mount and on refresh(); errors go to `onError` (for 401s) and are shown. */
function useLoad<T>(url: string, onError: (e: unknown) => void) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // State is only set once the response is in, so this can run straight from the effect.
  const load = useCallback(
    () =>
      sa<T>(url).then(
        (d) => {
          setData(d);
          setError(null);
        },
        (e: Error) => {
          onError(e);
          setError(e.message);
        },
      ),
    [url, onError],
  );
  useEffect(() => {
    load();
  }, [load]);
  const refresh = async () => {
    setLoading(true);
    await load();
    setLoading(false);
  };
  return { data, error, loading, refresh };
}

function Tile({ label, value, sub, warn }: { label: string; value: React.ReactNode; sub?: React.ReactNode; warn?: boolean }) {
  return (
    <div className={cx("card p-5", warn && "ring-2 ring-rose-500/60")}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-secondary btn-sm self-start" onClick={onClick} disabled={loading}>
      <RefreshCw className={cx("size-3.5", loading && "animate-spin")} /> รีเฟรช
    </button>
  );
}

function StatusTab({ onError }: { onError: (e: unknown) => void }) {
  const { data: s, error, loading, refresh } = useLoad<Status>("/api/superadmin/status", onError);
  if (!s) return error ? <ErrorNote message={error} /> : <Spinner />;
  const diskUsed = s.disk ? 1 - s.disk.free / s.disk.total : 0;
  const failures24h =
    (s.events24h.admin_key_failed ?? 0) + (s.events24h.superadmin_login_failed ?? 0) + (s.events24h.superadmin_locked ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <RefreshButton loading={loading} onClick={refresh} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="ห้องทั้งหมด" value={n(s.counts.rooms)} sub={`ใหม่ 24 ชม. ${n(s.counts.rooms24h)} · 7 วัน ${n(s.counts.rooms7d)}`} />
        <Tile label="ห้องที่ยังไม่ถึงวัน" value={n(s.counts.roomsUpcoming)} sub={`สรุปวันแล้ว ${n(s.counts.roomsFinal)} ห้อง`} />
        <Tile label="ผู้เข้าร่วม" value={n(s.counts.participants)} sub={`ตอบแล้ว ${n(s.counts.responded)} · ${n(s.counts.answers)} ช่อง`} />
        <Tile
          label="เหตุการณ์น่าสงสัย 24 ชม."
          value={n(failures24h)}
          sub="ลิงก์ผู้ดูแลผิด + รหัส super admin ผิด"
          warn={failures24h >= 20}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card flex flex-col gap-2 p-5 text-sm">
          <h2 className="card-title mb-1">
            <Database className="size-4" /> ฐานข้อมูล
          </h2>
          <Row k="สถานะ" v={<span className="chip bg-neon text-ink">ปกติ · {s.db.latencyMs} ms</span>} />
          <Row k="PostgreSQL" v={s.db.version} />
          <Row k="ขนาด" v={bytes(s.db.sizeBytes)} />
          <Row k="การเชื่อมต่อ" v={s.db.connections} />
        </section>
        <section className="card flex flex-col gap-2 p-5 text-sm">
          <h2 className="card-title mb-1">
            <Activity className="size-4" /> แอป
          </h2>
          <Row k="ทำงานมาแล้ว" v={duration(s.app.uptimeSec)} />
          <Row k="หน่วยความจำ" v={`${bytes(s.app.rssBytes)} (heap ${bytes(s.app.heapUsedBytes)})`} />
          <Row k="Node.js" v={s.app.node} />
          <Row k="APP_URL" v={s.app.appUrl ?? <span className="text-rose-600">ไม่ได้ตั้ง</span>} />
          <Row k="Cookie Secure" v={s.app.cookieSecure ? "เปิด" : <span className="text-rose-600">ปิด</span>} />
        </section>
        <section className="card flex flex-col gap-2 p-5 text-sm">
          <h2 className="card-title mb-1">
            <HardDrive className="size-4" /> เซิร์ฟเวอร์ / บริการภายนอก
          </h2>
          {s.disk && (
            <div>
              <Row k="ดิสก์" v={`ว่าง ${bytes(s.disk.free)} จาก ${bytes(s.disk.total)}`} />
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
                <div
                  className={cx("h-full rounded-full", diskUsed > 0.85 ? "bg-rose-500" : "bg-lilac")}
                  style={{ width: `${Math.round(diskUsed * 100)}%` }}
                />
              </div>
            </div>
          )}
          <Row
            k="อีเมล"
            v={
              s.mail.enabled ? (
                `${s.mail.from} · ส่ง 24 ชม. ${n(s.events24h.email_sent ?? 0)}${s.events24h.email_failed ? ` · ล้มเหลว ${s.events24h.email_failed}` : ""}`
              ) : (
                <span className="text-stone-500">ปิดอยู่</span>
              )
            }
          />
          <Row
            k="ข้อมูลวันหยุด"
            v={
              s.holidays.lastError ? (
                <span className="text-rose-600">ดึงไม่ได้: {s.holidays.lastError}</span>
              ) : s.holidays.fetchedAt ? (
                `${s.holidays.count} วัน · ${when(s.holidays.fetchedAt)}`
              ) : (
                "ยังไม่ได้ดึง (ดึงเมื่อมีคนเปิดปฏิทิน)"
              )
            }
          />
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-stone-500">{k}</span>
      <span className="min-w-0 text-right font-medium break-words">{v}</span>
    </p>
  );
}

/* ---------------------------------- rooms --------------------------------- */

interface OpsRoom {
  slug: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  participants: number;
  responded: number;
  answers: number;
  finalDate: string | null;
  isLocked: boolean;
}

function RoomsTab({ onError }: { onError: (e: unknown) => void }) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, refresh } = useLoad<{ rooms: OpsRoom[] }>(
    `/api/superadmin/rooms?q=${encodeURIComponent(q)}`,
    onError,
  );
  const [newLink, setNewLink] = useState<{ slug: string; url: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (r: OpsRoom) => {
    if (!confirm(`ลบห้อง ${r.slug} และคำตอบทั้งหมดถาวร?`)) return;
    try {
      await sa(`/api/superadmin/rooms/${r.slug}`, { method: "DELETE" });
      setActionError(null);
      refresh();
    } catch (e) {
      onError(e);
      setActionError((e as Error).message);
    }
  };

  const resetKey = async (r: OpsRoom) => {
    if (
      !confirm(
        `ออกลิงก์ผู้ดูแลใหม่ให้ห้อง ${r.slug}?\nลิงก์ผู้ดูแลเดิมจะใช้ไม่ได้ทันที — ยืนยันตัวตนผู้ขอก่อนส่งลิงก์ให้\n` +
          "ลิงก์นี้มีไว้ส่งต่อให้ผู้จัดเท่านั้น ไม่ควรเปิดเอง (จะเห็นเนื้อหาและรายชื่อในห้อง)",
      )
    )
      return;
    try {
      const res = await sa<{ adminUrl: string }>(`/api/superadmin/rooms/${r.slug}`, {
        method: "POST",
        body: JSON.stringify({ action: "reset-admin-key" }),
      });
      setNewLink({ slug: r.slug, url: res.adminUrl });
      setActionError(null);
    } catch (e) {
      onError(e);
      setActionError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(input);
        }}
      >
        <input
          className="input max-w-xs flex-1 font-mono"
          placeholder="รหัสห้อง เช่น adcfxkfv"
          maxLength={8}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          <Search className="size-4" /> ค้นหา
        </button>
        <RefreshButton loading={loading} onClick={refresh} />
      </form>

      <p className="flex items-start gap-2 text-xs text-stone-500">
        <EyeOff className="mt-px size-3.5 shrink-0" />
        <span>
          เพื่อความเป็นส่วนตัวของผู้ใช้ หน้านี้แสดงเฉพาะรหัสห้องและตัวเลข — ไม่แสดงชื่อเรื่อง รายละเอียด หรือรายชื่อสมาชิก
          ผู้จัดที่ต้องการความช่วยเหลือให้แจ้งรหัสห้อง (8 ตัวท้ายลิงก์ เช่น /r/<b className="font-mono">adcfxkfv</b>)
        </span>
      </p>

      {newLink && (
        <section className="card-neon flex flex-col gap-2 p-4">
          <p className="text-sm font-bold">ลิงก์ผู้ดูแลใหม่ของห้อง {newLink.slug} — ส่งให้ผู้จัดทางช่องทางที่ยืนยันตัวตนแล้ว</p>
          <CopyField value={newLink.url} label="ลิงก์ผู้ดูแลใหม่" />
        </section>
      )}
      <ErrorNote message={actionError ?? error} />

      {!data ? (
        <Spinner />
      ) : data.rooms.length === 0 ? (
        <p className="card p-8 text-center text-sm text-stone-500">ไม่พบห้อง</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs text-stone-500">
              <tr className="border-b border-line/5">
                <th className="px-4 py-3 font-medium">รหัสห้อง</th>
                <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">ตอบแล้ว</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/5">
              {data.rooms.map((r) => (
                <tr key={r.slug} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold">{r.slug}</p>
                    <p className="text-xs text-stone-500">
                      วันที่ {formatRange(r.startDate, r.endDate)}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">{when(r.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {r.responded}/{r.participants}
                    <span className="block text-xs text-stone-500">{r.answers} ช่อง</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.finalDate ? (
                      <span className="chip bg-neon text-ink">สรุป {formatDateShortYear(r.finalDate)}</span>
                    ) : r.isLocked ? (
                      <span className="chip bg-ink text-white">ปิดรับ</span>
                    ) : (
                      <span className="chip bg-canvas text-stone-600">เปิดรับ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      <button type="button" className="btn btn-ghost btn-sm" title="ออกลิงก์ผู้ดูแลใหม่ (กรณีผู้จัดทำลิงก์หาย)" onClick={() => resetKey(r)}>
                        <KeyRound className="size-3.5" />
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" title="ลบห้อง" onClick={() => remove(r)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rooms.length >= 100 && <p className="p-3 text-xs text-stone-500">แสดง 100 ห้องล่าสุด — ค้นหาด้วยรหัสห้องเพื่อดูห้องอื่น</p>}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- cleanup -------------------------------- */

const CLEANUPS = [
  {
    kind: "expired" as const,
    title: "ห้องที่ผ่านวันประชุมไปนานแล้ว",
    body: "ทุกวันที่ถามสมาชิกผ่านไปแล้วเกินกว่าที่กำหนด — ลดข้อมูลส่วนบุคคลที่เก็บไว้โดยไม่จำเป็น",
    options: [30, 90, 180, 365],
    initial: 180,
  },
  {
    kind: "empty" as const,
    title: "ห้องร้างที่ไม่มีใครตอบ",
    body: "สร้างไว้นานเกินกว่าที่กำหนด และยังไม่มีสมาชิกคนไหนตอบเลย (มักเป็นห้องทดลองหรือห้องสแปม)",
    options: [7, 14, 30, 90],
    initial: 14,
  },
];

function CleanupTab({ onError }: { onError: (e: unknown) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {CLEANUPS.map((c) => (
        <CleanupCard key={c.kind} {...c} onError={onError} />
      ))}
    </div>
  );
}

function CleanupCard({
  kind,
  title,
  body,
  options,
  initial,
  onError,
}: (typeof CLEANUPS)[number] & { onError: (e: unknown) => void }) {
  const [days, setDays] = useState(initial);
  const { data, error, loading, refresh } = useLoad<{ count: number; sample: OpsRoom[] }>(
    `/api/superadmin/cleanup?kind=${kind}&days=${days}`,
    onError,
  );
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    if (!data?.count || !confirm(`ลบ ${data.count} ห้องพร้อมคำตอบทั้งหมดถาวร?`)) return;
    try {
      const res = await sa<{ deleted: number }>("/api/superadmin/cleanup", {
        method: "POST",
        body: JSON.stringify({ kind, days }),
      });
      setResult(`ลบแล้ว ${res.deleted} ห้อง`);
      refresh();
    } catch (e) {
      onError(e);
      setResult((e as Error).message);
    }
  };

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{body}</p>
      </div>
      <Segmented
        className="self-start"
        value={days}
        onChange={(d) => {
          setDays(d);
          setResult(null);
        }}
        options={options.map((d) => ({ value: d, label: `${d} วัน` }))}
      />
      <ErrorNote message={error} />
      {!data ? (
        <Spinner />
      ) : (
        <>
          <p className="text-sm">
            ตรงเงื่อนไข <b className="text-lg tabular-nums">{n(data.count)}</b> ห้อง
            {data.count > data.sample.length && ` (แสดง ${data.sample.length} ห้องแรก)`}
          </p>
          {data.sample.length > 0 && (
            <ul className="scroll-thin flex max-h-56 flex-col gap-1 overflow-y-auto text-xs">
              {data.sample.map((r) => (
                <li key={r.slug} className="flex justify-between gap-3 rounded-xl bg-canvas px-3 py-1.5">
                  <span className="font-mono">{r.slug}</span>
                  <span className="shrink-0 text-stone-500">
                    {formatRange(r.startDate, r.endDate)} · ตอบ {r.responded}/{r.participants}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-danger self-start ring-1 ring-rose-200" disabled={!data.count || loading} onClick={run}>
            <Trash2 className="size-4" /> ลบ {n(data.count)} ห้อง
          </button>
        </>
      )}
      {result && <p className="hint">{result}</p>}
    </section>
  );
}

/* -------------------------------- security -------------------------------- */

interface SecurityEvent {
  id: string;
  at: string;
  kind: string;
  ip: string | null;
  slug: string | null;
  detail: string;
}

interface LogLine {
  at: string;
  ip: string;
  method: string;
  path: string;
  status: number;
  ua: string;
}

type Traffic =
  | { available: false; reason: string }
  | {
      available: true;
      host: string | null;
      files: number;
      total: number;
      uniqueIps: number;
      byClass: Record<string, number>;
      rateLimited: number;
      topIps: { ip: string; count: number; errors: number }[];
      rateLimitedIps: { key: string; count: number }[];
      probes: { count: number; topPaths: { key: string; count: number }[]; topIps: { key: string; count: number }[] };
      recentErrors: LogLine[];
      recentDenied: LogLine[];
    };

const EVENT_LABEL: Record<string, { label: string; bad?: boolean }> = {
  admin_key_failed: { label: "ลิงก์ผู้ดูแลผิด", bad: true },
  personal_link_failed: { label: "ลิงก์ส่วนตัวใช้ไม่ได้", bad: true },
  participant_cap: { label: "ห้องเต็ม (300 คน)" },
  superadmin_login_ok: { label: "เข้าสู่ระบบ super admin" },
  superadmin_login_failed: { label: "รหัส super admin ผิด", bad: true },
  superadmin_locked: { label: "ระงับการเข้าสู่ระบบ 15 นาที", bad: true },
  superadmin_logout: { label: "ออกจากระบบ super admin" },
  superadmin_room_deleted: { label: "super admin ลบห้อง" },
  superadmin_admin_key_reset: { label: "ออกลิงก์ผู้ดูแลใหม่" },
  superadmin_cleanup: { label: "ล้างข้อมูลขยะ" },
  email_sent: { label: "ส่งลิงก์ผู้ดูแลทางอีเมล" },
  email_failed: { label: "ส่งอีเมลไม่สำเร็จ", bad: true },
  email_throttled: { label: "ส่งอีเมลถี่เกินไป (ถูกจำกัด)", bad: true },
  email_copy_kept: { label: "ลบสำเนาใน Sent ไม่ได้", bad: true },
};

function SecurityTab({ onError }: { onError: (e: unknown) => void }) {
  const [hours, setHours] = useState(24);
  const { data, error, loading, refresh } = useLoad<{ events: SecurityEvent[]; traffic: Traffic }>(
    `/api/superadmin/security?hours=${hours}`,
    onError,
  );
  const t = data?.traffic;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={hours}
          onChange={setHours}
          options={[
            { value: 24, label: "24 ชม." },
            { value: 72, label: "3 วัน" },
            { value: 168, label: "7 วัน" },
          ]}
        />
        <RefreshButton loading={loading} onClick={refresh} />
      </div>
      <ErrorNote message={error} />
      {!data ? (
        <Spinner />
      ) : (
        <>
          {t && !t.available ? (
            <p className="card flex items-start gap-2 p-5 text-sm text-stone-600">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" />
              อ่าน access log ของ Traefik ไม่ได้ ({t.reason}) — ตรวจว่า mount /var/log/traefik เข้าคอนเทนเนอร์แล้ว
            </p>
          ) : (
            t && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <Tile label="Request ทั้งหมด" value={n(t.total)} sub={`${n(t.uniqueIps)} IP`} />
                  <Tile label="สำเร็จ (2xx/3xx)" value={n((t.byClass["2xx"] ?? 0) + (t.byClass["3xx"] ?? 0))} />
                  <Tile label="ผิดพลาดฝั่งผู้ใช้ (4xx)" value={n(t.byClass["4xx"] ?? 0)} />
                  <Tile label="ผิดพลาดฝั่งเซิร์ฟเวอร์ (5xx)" value={n(t.byClass["5xx"] ?? 0)} warn={(t.byClass["5xx"] ?? 0) > 0} />
                  <Tile label="ถูกจำกัดความถี่ (429)" value={n(t.rateLimited)} warn={t.rateLimited > 100} />
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                  <CountList
                    title="IP ที่เรียกมากที่สุด"
                    rows={t.topIps.map((x) => ({ key: x.ip, count: x.count, note: x.errors ? `ผิดพลาด ${x.errors}` : undefined }))}
                  />
                  <CountList title="IP ที่ถูกจำกัดความถี่ (429)" rows={t.rateLimitedIps} empty="ไม่มี" />
                  <CountList
                    title={`การสแกนหาช่องโหว่ (${n(t.probes.count)} ครั้ง)`}
                    rows={t.probes.topPaths}
                    mono
                    empty="ไม่พบ — เช่น /wp-login.php, /.env"
                  />
                </div>
                <LogTable title="ถูกปฏิเสธ (401/403) ล่าสุด" rows={t.recentDenied} />
                <LogTable title="ผิดพลาดฝั่งเซิร์ฟเวอร์ (5xx) ล่าสุด" rows={t.recentErrors} />
              </>
            )
          )}

          <section className="card overflow-x-auto">
            <h2 className="card-title border-b border-line/5 px-5 py-4">
              เหตุการณ์จากแอป ({data.events.length}) <span className="text-xs font-normal text-stone-500">เก็บ 90 วัน</span>
            </h2>
            {data.events.length === 0 ? (
              <p className="p-6 text-center text-sm text-stone-500">ไม่มีเหตุการณ์ในช่วงนี้</p>
            ) : (
              <table className="w-full min-w-[40rem] text-left text-sm">
                <tbody className="divide-y divide-line/5">
                  {data.events.map((e) => {
                    const meta = EVENT_LABEL[e.kind] ?? { label: e.kind };
                    return (
                      <tr key={e.id}>
                        <td className="px-5 py-2 whitespace-nowrap text-stone-500">{when(e.at)}</td>
                        <td className="px-2 py-2">
                          <span className={cx("chip", meta.bad ? "bg-rose-50 text-rose-700" : "bg-canvas text-stone-600")}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">{e.ip ?? "—"}</td>
                        <td className="px-2 py-2 font-mono text-xs">{e.slug ?? ""}</td>
                        <td className="px-5 py-2 text-xs text-stone-600">{e.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CountList({
  title,
  rows,
  mono,
  empty = "—",
}: {
  title: string;
  rows: { key: string; count: number; note?: string }[];
  mono?: boolean;
  empty?: string;
}) {
  return (
    <section className="card p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-stone-500">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-xs">
          {rows.map((r) => (
            <li key={r.key} className="flex items-baseline justify-between gap-3">
              <span className={cx("min-w-0 truncate", mono && "font-mono")} title={r.key}>
                {r.key}
              </span>
              <span className="shrink-0 tabular-nums text-stone-500">
                {r.note && <span className="mr-2 text-rose-600">{r.note}</span>}
                {n(r.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LogTable({ title, rows }: { title: string; rows: LogLine[] }) {
  if (!rows.length) return null;
  return (
    <section className="card overflow-x-auto">
      <h3 className="border-b border-line/5 px-5 py-3 text-sm font-semibold">{title}</h3>
      <table className="w-full min-w-[48rem] text-left text-xs">
        <tbody className="divide-y divide-line/5">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-5 py-1.5 whitespace-nowrap text-stone-500">{when(r.at)}</td>
              <td className="px-2 py-1.5 font-mono">{r.ip}</td>
              <td className="px-2 py-1.5 font-semibold tabular-nums">{r.status}</td>
              <td className="max-w-xs truncate px-2 py-1.5 font-mono" title={r.path}>
                {r.method} {r.path}
              </td>
              <td className="max-w-[16rem] truncate px-5 py-1.5 text-stone-500" title={r.ua}>
                {r.ua}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
