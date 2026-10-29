import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, nameSchema, parseBody, requireAdmin, uniqueNames } from "@/lib/api";
import { addParticipant } from "@/lib/rooms";

const AddMembers = z.object({ names: z.array(nameSchema).min(1).max(200) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/rooms/[slug]/admin/members">) {
  const auth = await requireAdmin(req, (await ctx.params).slug);
  if (!auth.ok) return auth.res;
  const body = await parseBody(req, AddMembers);
  if (!body.ok) return body.res;

  const skipped: string[] = [];
  for (const name of uniqueNames(body.data.names)) {
    const res = await addParticipant(auth.room.id, name, { invited: true, claim: false });
    if (!res.ok) skipped.push(name);
  }
  return json({ ok: true, skipped });
}
