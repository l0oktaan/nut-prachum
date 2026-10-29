"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  CircleAlert,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  MousePointerClick,
  Search,
  UserPlus,
} from "lucide-react";
import { EditGrid, Legend } from "./SlotGrid";
import { ResultsPanel } from "./ResultsPanel";
import { FinalBanner } from "./FinalBanner";
import { RoomHeader } from "./RoomHeader";
import { Avatar, CopyField, cx, ErrorNote, Segmented, Spinner } from "./ui";
import { api, clearHash, readHashParam } from "@/lib/client";
import { cellKey, parseCellKey, type Level } from "@/lib/slots";
import type { Me, ParticipantPublic, Snapshot } from "@/lib/types";

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function RoomView({ initial }: { initial: Snapshot }) {
  const slug = initial.room.slug;
  const [snapshot, setSnapshot] = useState(initial);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [identError, setIdentError] = useState<string | null>(null);
  const [tab, setTab] = useState<"mine" | "results">("mine");
  const { room, participants } = snapshot;

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await api<Snapshot>(`/api/rooms/${slug}`));
    } catch {
      /* keep showing the last snapshot */
    }
  }, [slug]);

  // Resolve identity: personal link (#t=…) first, then the room cookie.
  useEffect(() => {
    const token = readHashParam("t");
    (async () => {
      if (token) {
        clearHash();
        try {
          const res = await api<{ me: Me }>(`/api/rooms/${slug}/me`, {
            method: "POST",
            body: JSON.stringify({ token }),
          });
          setMe(res.me);
          setTab(res.me.respondedAt ? "results" : "mine");
          return;
        } catch (e) {
          setIdentError((e as Error).message);
        }
      }
      const res = await api<{ me: Me | null }>(`/api/rooms/${slug}/me`).catch(() => ({ me: null }));
      setMe(res.me);
      if (res.me?.respondedAt) setTab("results");
    })();
  }, [slug]);

  // Light polling so the results stay current while the page is open.
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && refresh();
    const id = setInterval(tick, 20_000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [refresh]);

  const onIdentified = async (m: Me) => {
    setMe(m);
    setIdentError(null);
    setTab("mine");
    await refresh();
  };

  const signOut = async () => {
    await api(`/api/rooms/${slug}/me`, { method: "DELETE" }).catch(() => {});
    setMe(null);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <title>{`${room.title} · นัดประชุม`}</title>
      <RoomHeader room={room} memberCount={participants.length} />
      <FinalBanner room={room} />

      {room.isLocked && (
        <p className="flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm text-white">
          <Lock className="size-4 text-neon" /> ผู้จัดปิดรับคำตอบแล้ว — ดูผลสรุปได้ แต่แก้ไขเวลาไม่ได้
        </p>
      )}

      {me === undefined ? (
        <div className="card flex items-center gap-3 p-5 text-sm text-stone-500">
          <Spinner /> กำลังตรวจสอบตัวตน…
        </div>
      ) : me ? (
        <IdentityBar me={me} slug={slug} onSignOut={signOut} />
      ) : (
        <WhoAreYou
          slug={slug}
          participants={participants}
          allowNew={room.allowNewMembers && !room.isLocked}
          error={identError}
          onIdentified={onIdentified}
          onConflict={refresh}
        />
      )}

      {me !== undefined && (
        <>
          <Segmented
            className="self-start"
            value={tab}
            onChange={setTab}
            options={[
              { value: "mine", label: <><MousePointerClick className="size-4" /> เวลาที่ฉันสะดวก</> },
              { value: "results", label: <><BarChart3 className="size-4" /> ผลรวมทุกคน</> },
            ]}
          />
          {tab === "mine" ? (
            me ? (
              <MyAvailability
                key={me.id}
                snapshot={snapshot}
                me={me}
                onSaved={(m) => {
                  setMe(m);
                  refresh();
                }}
              />
            ) : (
              <div className="card p-8 text-center text-sm text-stone-500">
                กรุณาเลือกชื่อของคุณด้านบนก่อน แล้วจึงเลือกวันเวลาที่สะดวก
              </div>
            )
          ) : (
            <ResultsPanel room={room} participants={participants} cells={snapshot.cells} />
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------ identity bar ------------------------------ */

function IdentityBar({ me, slug, onSignOut }: { me: Me; slug: string; onSignOut: () => void }) {
  const [showLink, setShowLink] = useState(false);
  const personalLink = typeof window !== "undefined" ? `${window.location.origin}/r/${slug}#t=${me.token}` : "";
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={me.name} className="size-9 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-stone-500">คุณกำลังตอบในชื่อ</p>
          <p className="truncate font-semibold">{me.name}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowLink((v) => !v)}>
          <KeyRound className="size-3.5" /> ลิงก์ส่วนตัว
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut}>
          <LogOut className="size-3.5" /> ไม่ใช่ฉัน
        </button>
      </div>
      {showLink && (
        <div className="animate-fade-up mt-4 border-t border-line/5 pt-4">
          <p className="mb-2 text-xs text-stone-500">
            เก็บลิงก์นี้ไว้เพื่อกลับมาแก้ไขคำตอบจากอุปกรณ์อื่น — อย่าแชร์ให้ผู้อื่น
          </p>
          <CopyField value={personalLink} label="ลิงก์ส่วนตัว" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------ who are you? ------------------------------ */

function WhoAreYou({
  slug,
  participants,
  allowNew,
  error,
  onIdentified,
  onConflict,
}: {
  slug: string;
  participants: ParticipantPublic[];
  allowNew: boolean;
  error: string | null;
  onIdentified: (me: Me) => void;
  onConflict: () => void;
}) {
  const invited = participants.filter((p) => p.invited);
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(error);

  const shown = useMemo(
    () => invited.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [invited, filter],
  );

  const identify = async (body: object, busyKey: string) => {
    setBusy(busyKey);
    setErr(null);
    try {
      const res = await api<{ me: Me }>(`/api/rooms/${slug}/me`, { method: "POST", body: JSON.stringify(body) });
      onIdentified(res.me);
    } catch (e) {
      setErr((e as Error).message);
      onConflict();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold">
        <span className="icon-bubble bg-neon text-lg">👋</span> คุณคือใคร?
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        เลือกชื่อของคุณเพื่อเริ่มเลือกวันเวลาที่สะดวก ไม่ต้องสมัครสมาชิก — ระบบจะจำคุณไว้บนอุปกรณ์นี้
      </p>

      {invited.length > 0 && (
        <div className="mt-5">
          {invited.length > 12 && (
            <div className="relative mb-3 max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input pl-9"
                placeholder="ค้นหาชื่อ…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {shown.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.claimed || busy !== null}
                title={p.claimed ? "ชื่อนี้ยืนยันตัวตนแล้ว — หากเป็นคุณ ให้ใช้ลิงก์ส่วนตัว" : undefined}
                onClick={() => identify({ participantId: p.id }, p.id)}
                className={cx(
                  "flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm transition",
                  p.claimed
                    ? "cursor-not-allowed border-transparent bg-canvas/60 text-stone-400"
                    : "border-transparent bg-canvas hover:border-fg hover:bg-surface",
                )}
              >
                {busy === p.id ? <Spinner className="m-1.5" /> : <Avatar name={p.name} />}
                {p.name}
                {p.claimed && <Lock className="size-3" />}
              </button>
            ))}
          </div>
          {invited.some((p) => p.claimed) && (
            <p className="hint flex items-center gap-1">
              <Lock className="size-3" /> ชื่อที่ล็อกอยู่มีผู้ยืนยันแล้ว หากเป็นคุณ ให้เปิดจากลิงก์ส่วนตัวหรือขอลิงก์ใหม่จากผู้จัด
            </p>
          )}
        </div>
      )}

      {allowNew && (
        <form
          className={cx("flex max-w-md flex-col gap-2 sm:flex-row", invited.length > 0 && "mt-6 border-t border-line/5 pt-5")}
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) identify({ name }, "new");
          }}
        >
          <div className="flex-1">
            <label className="label" htmlFor="new-name">
              {invited.length > 0 ? "ไม่มีชื่อในรายการ?" : "ชื่อของคุณ"}
            </label>
            <input
              id="new-name"
              className="input"
              placeholder="เช่น สมชาย ใจดี"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary sm:self-end" disabled={!name.trim() || busy !== null}>
            {busy === "new" ? <Spinner /> : <UserPlus className="size-4" />}
            เข้าร่วม
          </button>
        </form>
      )}

      {!allowNew && invited.length === 0 && (
        <p className="mt-4 text-sm text-stone-500">ห้องนี้ยังไม่มีรายชื่อสมาชิก กรุณาติดต่อผู้จัด</p>
      )}

      <div className="mt-4">
        <ErrorNote message={err} />
      </div>
    </section>
  );
}

/* ---------------------------- my availability ----------------------------- */

function MyAvailability({ snapshot, me, onSaved }: { snapshot: Snapshot; me: Me; onSaved: (m: Me) => void }) {
  const { room } = snapshot;
  const [cells, setCells] = useState<Map<string, Level>>(
    () => new Map(snapshot.cells.filter((c) => c.p === me.id).map((c) => [cellKey(c.d, c.s), c.l])),
  );
  const [brush, setBrush] = useState<Level>(2);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(cells);

  const save = useCallback(async () => {
    setState("saving");
    try {
      const body = [...latest.current].map(([k, l]) => {
        const { date, slot } = parseCellKey(k);
        return { d: date, s: slot, l };
      });
      await api(`/api/rooms/${room.slug}/availability`, { method: "PUT", body: JSON.stringify({ cells: body }) });
      setState("saved");
      setError(null);
      onSaved({ ...me, respondedAt: new Date().toISOString() });
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    }
  }, [room.slug, me, onSaved]);

  const onChange = (next: Map<string, Level>) => {
    setCells(next);
    latest.current = next;
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 700);
  };

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (state !== "pending" && state !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  const yesCount = [...cells.values()].filter((l) => l === 2).length;
  const maybeCount = cells.size - yesCount;

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">เลือกวันเวลาที่คุณสะดวก</h2>
          <p className="text-sm text-stone-500">
            คลิกหรือลากผ่านช่องเพื่อเลือก · คลิกที่หัววันที่เพื่อเลือกทั้งวัน · บันทึกอัตโนมัติ
          </p>
          {room.durationDays > 1 && (
            <p className="mt-2 inline-flex rounded-full bg-neon px-3 py-1 text-xs font-semibold">
              ประชุม {room.durationDays} วันติดกัน — เลือกทุกวันที่คุณว่าง ระบบจะหาชุดวันที่ทุกคนว่างครบ
            </p>
          )}
        </div>
        <SaveIndicator state={state} respondedAt={me.respondedAt} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={brush}
          onChange={setBrush}
          options={[
            { value: 2 as Level, label: <><span className="size-3 rounded-full bg-neon ring-1 ring-black/25" /> สะดวก</> },
            { value: 1 as Level, label: <><span className="size-3 rounded-full bg-lilac" /> ถ้าจำเป็น</> },
          ]}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={cells.size === 0 || room.isLocked}
          onClick={() => onChange(new Map())}
        >
          ล้างทั้งหมด
        </button>
        <span className="text-xs text-stone-500 sm:ml-auto">
          เลือกแล้ว: สะดวก {yesCount} ช่อง{maybeCount > 0 && ` · ถ้าจำเป็น ${maybeCount} ช่อง`}
        </span>
      </div>

      <EditGrid config={room} value={cells} onChange={onChange} brush={brush} disabled={room.isLocked} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Legend mode="edit" />
        {state === "saved" && cells.size === 0 && (
          <span className="text-xs text-stone-500">บันทึกว่าคุณ “ไม่สะดวกทุกช่วง” แล้ว</span>
        )}
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}

      <NoteField slug={room.slug} me={me} locked={room.isLocked} onSaved={onSaved} />
    </section>
  );
}

/** Free-text note to the organizer, saved automatically. Only the organizer (and the author) sees it. */
function NoteField({
  slug,
  me,
  locked,
  onSaved,
}: {
  slug: string;
  me: Me;
  locked: boolean;
  onSaved: (m: Me) => void;
}) {
  const [note, setNote] = useState(me.note);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = async (value: string) => {
    setState("saving");
    try {
      const res = await api<{ me: Me | null }>(`/api/rooms/${slug}/me`, {
        method: "PATCH",
        body: JSON.stringify({ note: value }),
      });
      setState("saved");
      setError(null);
      if (res.me) onSaved(res.me);
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    }
  };

  const onChange = (value: string) => {
    setNote(value);
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(value), 900);
  };

  return (
    <div className="mt-5 border-t border-line/5 pt-4">
      <label className="label" htmlFor="me-note">
        หมายเหตุถึงผู้จัด <span className="font-normal text-stone-400">(ไม่บังคับ)</span>
      </label>
      <textarea
        id="me-note"
        className="input min-h-20 resize-y"
        maxLength={300}
        disabled={locked}
        placeholder="เช่น วันที่ 3 ช่วงบ่ายติดอบรม ออกได้หลัง 15:00"
        value={note}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="hint flex flex-wrap justify-between gap-2">
        <span>เห็นเฉพาะผู้จัด · บันทึกอัตโนมัติ</span>
        <span className="tabular-nums">
          {state === "pending" || state === "saving" ? "กำลังบันทึก… · " : state === "saved" ? "บันทึกแล้ว · " : ""}
          {note.length}/300
        </span>
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  );
}

function SaveIndicator({ state, respondedAt }: { state: SaveState; respondedAt: string | null }) {
  const base = "chip self-start sm:self-auto";
  if (state === "pending" || state === "saving")
    return (
      <span className={cx(base, "bg-canvas text-stone-600")}>
        <Spinner className="size-3" /> กำลังบันทึก…
      </span>
    );
  if (state === "error")
    return (
      <span className={cx(base, "bg-rose-50 text-rose-700")}>
        <CircleAlert className="size-3.5" /> บันทึกไม่สำเร็จ
      </span>
    );
  if (state === "saved" || respondedAt)
    return (
      <span className={cx(base, "bg-neon text-ink")}>
        <Check className="size-3.5" /> บันทึกแล้ว
      </span>
    );
  return (
    <span className={cx(base, "bg-lilac-soft text-violet-800")}>
      <Link2 className="size-3.5" /> ยังไม่ได้ตอบ
    </span>
  );
}
