"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, CalendarDays, House, Menu, Plus, X } from "lucide-react";
import { cx } from "./ui";
import { parseSavedRooms, readSavedRoomsRaw, useClientValue } from "@/lib/client";

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-ink px-4 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white"
          aria-label="เปิดเมนู"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col bg-ink p-5 text-white transition-transform lg:inset-y-3 lg:left-3 lg:w-[16.75rem] lg:translate-x-0 lg:rounded-[28px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-full text-stone-400 hover:bg-white/10 lg:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="size-5" />
          </button>
        </div>
        {/* usePathname() is request data under Cache Components, so it must stream inside Suspense. */}
        <Suspense fallback={<div className="flex-1" />}>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </Suspense>
      </aside>
    </>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-full bg-neon text-ink">
        <CalendarCheck2 className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-bold tracking-tight text-white">Set up a meeting</span>
        <span className="block text-xs text-stone-400">นัดประชุม</span>
      </span>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const raw = useClientValue(readSavedRoomsRaw, "[]");
  const rooms = useMemo(() => parseSavedRooms(raw), [raw]);

  return (
    <>
      <nav className="mt-9 flex flex-col gap-1">
        <NavLink href="/" active={pathname === "/"} icon={<House className="size-[18px]" />} onClick={onNavigate}>
          หน้าแรก
        </NavLink>
        <NavLink href="/#create" active={false} icon={<Plus className="size-[18px]" />} onClick={onNavigate}>
          สร้างห้องนัด
        </NavLink>
      </nav>

      <div className="mt-8 flex items-center justify-between px-4 text-xs font-medium tracking-wide text-stone-500">
        ห้องของฉัน
        {rooms.length > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-neon px-1.5 text-[11px] font-bold text-ink">
            {rooms.length}
          </span>
        )}
      </div>
      <nav className="scroll-thin-dark mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="px-4 py-2 text-xs leading-relaxed text-stone-500">
            ห้องที่คุณสร้างบนเครื่องนี้จะแสดงที่นี่
          </p>
        ) : (
          rooms.slice(0, 12).map((r) => (
            <NavLink
              key={r.slug}
              href={`/r/${r.slug}/admin#key=${r.adminKey}`}
              active={pathname.startsWith(`/r/${r.slug}`)}
              icon={<CalendarDays className="size-[18px] shrink-0" />}
              onClick={onNavigate}
            >
              <span className="truncate">{r.title}</span>
            </NavLink>
          ))
        )}
      </nav>

      <UpgradeCard onClick={onNavigate} />
    </>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "flex min-w-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition",
        active ? "bg-neon font-semibold text-ink" : "text-stone-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

/** Lime call-to-action card at the bottom of the sidebar, with a small CSS shape illustration. */
function UpgradeCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="card-neon relative mt-5 overflow-hidden p-5">
      <div className="pointer-events-none absolute -top-3 -right-3 h-24 w-28" aria-hidden>
        <span className="absolute top-2 right-10 size-14 rounded-full bg-lilac" />
        <span className="absolute top-8 right-3 size-12 rounded-full bg-ink" />
        <span className="absolute top-14 right-14 size-6 rounded-full bg-white shadow" />
      </div>
      <p className="relative mt-10 text-lg leading-snug font-bold">
        นัดประชุม
        <br />
        ครั้งใหม่?
      </p>
      <p className="relative mt-1 text-xs text-ink/70">สร้างห้องได้ในไม่ถึงนาที</p>
      <Link href="/#create" onClick={onClick} className="btn btn-primary btn-sm relative mt-4 w-full py-2.5">
        สร้างห้องเลย
      </Link>
    </div>
  );
}
