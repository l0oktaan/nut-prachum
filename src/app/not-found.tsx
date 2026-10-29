import Link from "next/link";
import { CalendarX2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <CalendarX2 className="size-12 text-stone-300" />
      <h1 className="mt-4 text-xl font-semibold">ไม่พบห้องนัดประชุมนี้</h1>
      <p className="mt-1 text-sm text-stone-500">ลิงก์อาจไม่ถูกต้อง หรือผู้จัดได้ลบห้องนี้ไปแล้ว</p>
      <Link href="/" className="btn btn-primary mt-6">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
