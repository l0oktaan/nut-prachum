import type { NextRequest } from "next/server";
import { fail, json } from "@/lib/api";
import { getSnapshot } from "@/lib/rooms";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/rooms/[slug]">) {
  const { slug } = await ctx.params;
  const snapshot = await getSnapshot(slug);
  return snapshot ? json(snapshot) : fail(404, "ไม่พบห้องนัดประชุมนี้");
}
