import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/api";
import { googleCalendarUrl } from "@/lib/calendar";
import { getRoom, toRoomPublic } from "@/lib/rooms";

/**
 * Short, shareable "add to Google Calendar" link for the confirmed meeting.
 * Redirects at click time, so it stays right if the organizer changes the final date.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/r/[slug]/gcal">) {
  const { slug } = await ctx.params;
  const row = await getRoom(slug);
  const origin = publicOrigin(req);
  if (!row) return NextResponse.redirect(new URL("/", origin));
  const room = toRoomPublic(row);
  const roomUrl = new URL(`/r/${slug}`, origin).toString();
  if (!room.finalDate || room.finalSlot === null) return NextResponse.redirect(roomUrl);
  const meeting = { title: room.title, description: room.description, date: room.finalDate, slot: room.finalSlot };
  return NextResponse.redirect(googleCalendarUrl(room, meeting, roomUrl));
}
