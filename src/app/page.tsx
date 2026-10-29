import { CalendarHeart, MousePointerClick, PartyPopper, Send, Sparkles } from "lucide-react";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { PageHeader } from "@/components/PageHeader";

const STEPS = [
  { icon: CalendarHeart, title: "สร้างห้อง", body: "ตั้งหัวข้อ แตะเลือกวันบนปฏิทิน และใส่รายชื่อสมาชิก" },
  { icon: Send, title: "ส่งลิงก์", body: "แชร์ลิงก์เดียวในกลุ่ม LINE หรือส่งลิงก์ส่วนตัวให้แต่ละคน" },
  { icon: MousePointerClick, title: "ทุกคนเลือกเวลา", body: "สมาชิกเลือกชื่อตัวเอง แล้วแตะช่วงที่สะดวก ไม่ต้องสมัครสมาชิก" },
  { icon: PartyPopper, title: "สรุปวันประชุม", body: "ดูช่วงที่ว่างตรงกันมากที่สุด รู้ว่าใครยังไม่ตอบ แล้วกดยืนยันวัน" },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={
          <span className="badge-up mb-3 px-3 py-1">
            <Sparkles className="size-3.5" /> ไม่ต้องล็อกอิน · ใช้ได้ทันที
          </span>
        }
        title="หาวันประชุมที่ทุกคนว่างตรงกัน"
        subtitle="เลิกถามทีละคนในแชต สร้างห้อง ส่งลิงก์ แล้วให้ระบบสรุปช่วงเวลาที่ดีที่สุดให้"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div id="create" className="scroll-mt-24">
          <CreateRoomForm />
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <section className="card-dark p-6">
            <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">How it works</p>
            <h2 className="mt-1 text-xl font-extrabold">4 ขั้นตอนง่าย ๆ</h2>
            <ol className="mt-5 flex flex-col gap-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span
                    className={`icon-bubble size-10 ${i === 0 ? "bg-neon text-ink" : i === 1 ? "bg-lilac text-white" : "bg-white/10 text-white"}`}
                  >
                    <s.icon className="size-[18px]" />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {i + 1}. {s.title}
                    </span>
                    <span className="block text-sm text-stone-400">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
