import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminRoom } from "./rooms";
import { blockSlots, blockStarts, daySpan, MAX_DAYS, MAX_DURATION_DAYS, type SlotConfig } from "./slots";

export const json = <T>(data: T, status = 200) => NextResponse.json(data, { status });

export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false as const, res: fail(400, "รูปแบบข้อมูลไม่ถูกต้อง") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return { ok: false as const, res: fail(400, msg) };
  }
  return { ok: true as const, data: parsed.data as z.infer<S> };
}

export const adminKeyOf = (req: NextRequest) => req.headers.get("x-admin-key");

/** Resolves the room only when the request carries its admin key. */
export async function requireAdmin(req: NextRequest, slug: string) {
  const room = await getAdminRoom(slug, adminKeyOf(req));
  return room
    ? { ok: true as const, room }
    : { ok: false as const, res: fail(403, "ลิงก์ผู้ดูแลไม่ถูกต้อง") };
}

export const nameSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกชื่อ")
  .max(60, "ชื่อยาวเกินไป (ไม่เกิน 60 ตัวอักษร)")
  .transform((s) => s.replace(/\s+/g, " "));

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง");

export const durationSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_DURATION_DAYS, `ประชุมติดกันได้ไม่เกิน ${MAX_DURATION_DAYS} วัน`);

export const noBlockMessage = (n: number) => `วันที่เลือกต้องมีวันที่ติดกันครบ ${n} วันอย่างน้อย 1 ชุด`;

/** Why the room's dates and slots can't hold a single meeting, or null when they can. */
export function scheduleError(c: SlotConfig): string | null {
  const starts = blockStarts(c);
  if (!starts.length) return noBlockMessage(c.durationDays);
  if (!starts.some((d) => blockSlots(c, d).length)) {
    return `ชุดวันติดกัน ${c.durationDays} วันต้องมีช่วงเวลาที่เปิดให้เลือกตรงกันทุกวันอย่างน้อย 1 ช่วง`;
  }
  return null;
}

/** Per-date slot picks — cleaned against the room with `cleanDateSlots` before saving. */
export const dateSlotsSchema = z
  .record(dateSchema, z.array(z.number().int()).min(1, "แต่ละวันต้องเปิดอย่างน้อย 1 ช่วงเวลา").max(48))
  .refine((o) => Object.keys(o).length <= MAX_DAYS, { message: `เลือกได้ไม่เกิน ${MAX_DAYS} วัน` });

/** Hand-picked meeting dates: 1–MAX_DAYS unique days within one year, returned sorted. */
export const datesSchema = z
  .array(dateSchema)
  .min(1, "กรุณาเลือกวันที่อย่างน้อย 1 วัน")
  .max(MAX_DAYS, `เลือกได้ไม่เกิน ${MAX_DAYS} วัน`)
  .transform((d) => [...new Set(d)].sort())
  .refine((d) => daySpan(d[0], d[d.length - 1]) <= 366, {
    message: "วันที่ที่เลือกต้องอยู่ภายในช่วง 1 ปี",
  });

/** Removes blanks and case-insensitive duplicates while keeping order. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((n) => {
    const k = n.toLowerCase();
    if (!n || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
