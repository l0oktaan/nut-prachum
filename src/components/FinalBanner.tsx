"use client";

import { CalendarPlus, Download, PartyPopper } from "lucide-react";
import { describeMeeting, googleCalendarUrl } from "@/lib/calendar";
import { useClientValue } from "@/lib/client";
import type { RoomPublic } from "@/lib/types";

export function FinalBanner({ room }: { room: RoomPublic }) {
  const origin = useClientValue(() => window.location.origin, "");
  if (!room.finalDate || room.finalSlot === null) return null;
  const roomUrl = `${origin}/r/${room.slug}`;
  const meeting = {
    title: room.title,
    description: room.description,
    date: room.finalDate,
    slot: room.finalSlot,
  };

  return (
    <div className="card-neon animate-fade-up flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="icon-bubble size-12 bg-ink text-neon">
        <PartyPopper className="size-5" />
      </span>
      <div className="flex-1">
        <p className="text-xs font-bold tracking-wide text-ink/60 uppercase">สรุปวันประชุมแล้ว</p>
        <p className="text-xl font-extrabold">{describeMeeting(room, room.finalDate, room.finalSlot)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={googleCalendarUrl(room, meeting, roomUrl)} target="_blank" rel="noreferrer" className="btn btn-primary">
          <CalendarPlus className="size-4" /> Google Calendar
        </a>
        <a href={`/api/rooms/${room.slug}/ics`} className="btn bg-white text-ink hover:bg-white/80">
          <Download className="size-4" /> .ics
        </a>
      </div>
    </div>
  );
}
