import type { ReactNode } from "react";
import { CalendarDays, CalendarRange, Clock, UserRound, Users } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { formatRange, TIME_MODE_LABEL } from "@/lib/slots";
import type { RoomPublic } from "@/lib/types";

export function RoomHeader({
  room,
  memberCount,
  actions,
  eyebrow,
}: {
  room: RoomPublic;
  memberCount: number;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  const chip = "chip bg-white py-1.5 text-stone-600 shadow-sm";
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={room.title}
      aside={actions}
      subtitle={
        <>
          {room.description && <p className="mb-3 whitespace-pre-line">{room.description}</p>}
          <div className="flex flex-wrap gap-2">
            {room.organizerName && (
              <span className={chip}>
                <UserRound className="size-3.5 text-lilac" /> ผู้จัด: {room.organizerName}
              </span>
            )}
            <span className={chip}>
              <CalendarDays className="size-3.5 text-lilac" />
              {room.dates.length > 0 && `${room.dates.length} วัน · `}
              {formatRange(room.startDate, room.endDate)}
              {room.excludeWeekends && " (เว้นเสาร์-อาทิตย์)"}
            </span>
            {room.durationDays > 1 && (
              <span className="chip bg-neon py-1.5 font-semibold text-ink">
                <CalendarRange className="size-3.5" /> ประชุม {room.durationDays} วันติดกัน
              </span>
            )}
            <span className={chip}>
              <Clock className="size-3.5 text-lilac" /> {TIME_MODE_LABEL[room.timeMode]}
            </span>
            <span className={chip}>
              <Users className="size-3.5 text-lilac" /> สมาชิก {memberCount} คน
            </span>
          </div>
        </>
      }
    />
  );
}
