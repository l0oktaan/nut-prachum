import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <SearchX className="size-12 text-stone-300" />
      <h1 className="mt-4 text-xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="mt-1 text-sm text-stone-500">ที่อยู่อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
      <Link href="/" className="btn btn-primary mt-6">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
