import { connection } from "next/server";
import { json } from "@/lib/api";
import { getHolidays } from "@/lib/holidays";

export async function GET() {
  // Fetched at request time (and cached in memory), never frozen into the build.
  await connection();
  const res = json({ holidays: await getHolidays() });
  res.headers.set("Cache-Control", "public, max-age=3600");
  return res;
}
