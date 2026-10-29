import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseBody } from "@/lib/api";
import { getAdminRoom } from "@/lib/rooms";

const Check = z.object({
  rooms: z.array(z.object({ slug: z.string().max(20), adminKey: z.string().max(100) })).max(30),
});

/** Which of the browser's saved rooms still exist with the admin key it holds (for the sidebar list). */
export async function POST(req: NextRequest) {
  const body = await parseBody(req, Check);
  if (!body.ok) return body.res;
  const valid = await Promise.all(
    body.data.rooms.map(async (r) => ((await getAdminRoom(r.slug, r.adminKey)) ? r.slug : null)),
  );
  return json({ valid: valid.filter((s): s is string => s !== null) });
}
