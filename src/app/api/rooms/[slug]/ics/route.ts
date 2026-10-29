import type { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { buildIcs } from "@/lib/calendar";
import { getRoom, toRoomPublic } from "@/lib/rooms";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/rooms/[slug]/ics">) {
  const { slug } = await ctx.params;
  const row = await getRoom(slug);
  if (!row) return fail(404, "ไม่พบห้องนัดประชุมนี้");
  const room = toRoomPublic(row);
  if (!room.finalDate || room.finalSlot === null) return fail(404, "ผู้จัดยังไม่ได้สรุปวันประชุม");

  // Behind a proxy the request origin can be the container's own address, so prefer the configured one.
  const roomUrl = new URL(`/r/${slug}`, process.env.APP_URL || req.nextUrl.origin).toString();
  const ics = buildIcs(
    room,
    { title: room.title, description: room.description, date: room.finalDate, slot: room.finalSlot },
    `${slug}@nut-prachum`,
    roomUrl,
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meeting-${slug}.ics"`,
    },
  });
}
