import type { NextRequest } from "next/server";
import { listRooms } from "@/lib/ops";
import { privateJson, requireSuperadmin } from "@/lib/superadmin";

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  return privateJson({ rooms: await listRooms(q) });
}
