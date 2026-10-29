"use client";

import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { useClientValue } from "@/lib/client";

const fmtToday = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });

/** Today in Thai, e.g. "29 ตุลาคม 2569" (Buddhist year). Empty during SSR. */
function TodayPill() {
  const today = useClientValue(() => fmtToday.format(new Date()), "");
  if (!today) return null;
  return (
    <div className="hidden items-center gap-3 text-sm text-stone-500 sm:flex">
      <span>{today}</span>
      <span className="chip bg-surface py-2 pr-4 pl-3 text-sm font-semibold text-fg shadow-sm">
        <CalendarDays className="size-4" /> วันนี้
      </span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-2 max-w-2xl text-base text-stone-500">{subtitle}</div>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{aside ?? <TodayPill />}</div>
    </header>
  );
}

export { TodayPill };
