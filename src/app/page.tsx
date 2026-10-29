import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  CalendarRange,
  Coffee,
  EyeOff,
  Mail,
  MessageSquareText,
  MessagesSquare,
  MousePointerClick,
  PartyPopper,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserX,
} from "lucide-react";
import { ResultsPreview } from "@/components/landing/ResultsPreview";
import { getSettings } from "@/lib/settings";
import { CONTACT_EMAIL, retentionText } from "@/lib/site";

const PAINS = [
  { icon: MessagesSquare, title: "ถามในกลุ่มแล้วเงียบ", body: "ต้องไล่ถามทีละคน คำตอบกระจัดกระจายอยู่ในแชตจนสรุปไม่ได้" },
  { icon: UserX, title: "ไม่รู้ว่าใครยังไม่ตอบ", body: "ต้องนั่งนับเองว่าใครตอบแล้ว ใครยังขาด แล้วตามทวงทีละคน" },
  { icon: Star, title: "ได้วันแล้ว แต่คนสำคัญไม่ว่าง", body: "สุดท้ายต้องเลื่อนนัด เพราะประธานหรือกรรมการหลักติดธุระพอดี" },
];

const STEPS = [
  { icon: CalendarHeart, title: "สร้างห้อง", body: "ตั้งหัวข้อ แตะเลือกวันบนปฏิทิน และใส่รายชื่อสมาชิก" },
  { icon: Send, title: "ส่งลิงก์", body: "แชร์ลิงก์เดียวในกลุ่ม LINE หรือส่งลิงก์ส่วนตัวให้แต่ละคน" },
  { icon: MousePointerClick, title: "ทุกคนเลือกเวลา", body: "สมาชิกเลือกชื่อตัวเอง แล้วแตะช่วงที่สะดวก ไม่ต้องสมัครสมาชิก" },
  { icon: PartyPopper, title: "สรุปวันประชุม", body: "ดูช่วงที่ว่างตรงกันมากที่สุด แล้วส่งประกาศพร้อมลิงก์ปฏิทิน" },
];

const FEATURES = [
  { icon: Coffee, title: "เช้า / บ่าย / เย็น หรือรายชั่วโมง", body: "ตั้งชื่อและเวลาของแต่ละช่วงเองได้ และเปิดเฉพาะบางช่วงในบางวัน" },
  { icon: Star, title: "สมาชิกหลักที่ต้องมา", body: "จัดอันดับช่วงที่ประธานหรือคนสำคัญว่างครบไว้ก่อน และเตือนก่อนสรุปถ้าขาดใคร" },
  { icon: BellRing, title: "รู้ว่าใครยังไม่ตอบ", body: "ดูสถานะรายคน พร้อมข้อความทวงสำเร็จรูปไว้วางในแชต" },
  { icon: CalendarDays, title: "วันหยุดราชการ และปี พ.ศ.", body: "ปฏิทินแสดงวันหยุดนักขัตฤกษ์ เลือกวันทำงานทั้งเดือนได้ในคลิกเดียว" },
  { icon: CalendarRange, title: "ประชุมหลายวันติดกัน", body: "หาชุดวันที่ทุกคนว่างครบ เช่น สัมมนาหรืออบรม 2–3 วัน" },
  { icon: CalendarPlus, title: "สรุปแล้วเพิ่มลงปฏิทิน", body: "ข้อความประกาศพร้อมลิงก์ Google Calendar และไฟล์ .ics" },
  { icon: Mail, title: "ลิงก์ผู้ดูแลไม่หาย", body: "ส่งลิงก์ผู้ดูแลเข้าอีเมล และสร้างนัดซ้ำกับสมาชิกเดิมได้ในคลิกเดียว" },
  { icon: MessageSquareText, title: "หมายเหตุถึงผู้จัด", body: "สมาชิกบอกเงื่อนไขเพิ่มได้ เช่น “วันอังคารออกได้หลังบ่ายสาม”" },
];

const USE_CASES = [
  "ประชุมคณะกรรมการ",
  "ตรวจรับงาน / ส่งมอบงาน",
  "ประชุมทีมโปรเจกต์",
  "อบรม / สัมมนา",
  "สอบ / นิเทศ / ประชุมผู้ปกครอง",
  "นัดเพื่อน / ศิษย์เก่า",
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10 sm:px-8 sm:py-14">
      {/* Hero */}
      {/* minmax(0,…) keeps the sample grid from widening the page on phones; it scrolls inside its card. */}
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <span className="badge-up mb-4 px-3 py-1">
            <Sparkles className="size-3.5" /> ฟรี · ไม่ต้องล็อกอิน · แชร์ผ่าน LINE ได้
          </span>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
            หาวันประชุมที่ทุกคนว่างตรงกัน ในลิงก์เดียว
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-500">
            สร้างห้อง แตะเลือกวัน ส่งลิงก์ให้สมาชิก แล้วระบบจะสรุปช่วงเวลาที่ดีที่สุดให้ — รู้ด้วยว่าใครยังไม่ตอบ
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/new" className="btn btn-neon px-7 py-3.5 text-base">
              สร้างห้องนัดประชุม <ArrowRight className="size-5" />
            </Link>
            <a href="#how" className="btn btn-secondary px-6 py-3.5 text-base">
              ดูวิธีใช้
            </a>
          </div>
          <p className="mt-4 text-sm text-stone-500">ใช้เวลาไม่ถึงนาที · สมาชิกไม่ต้องสมัครหรือโหลดแอป</p>
        </div>
        <ResultsPreview />
      </section>

      {/* Problems */}
      <section>
        <SectionTitle eyebrow="ปัญหาเดิม ๆ" title="เคยเจอแบบนี้ไหม?" />
        <div className="grid gap-4 md:grid-cols-3">
          {PAINS.map((p) => (
            <div key={p.title} className="card p-6">
              <span className="icon-bubble bg-canvas">
                <p.icon className="size-4" />
              </span>
              <h3 className="mt-4 font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24">
        <div className="card-dark p-6 sm:p-10">
          <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">How it works</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">4 ขั้นตอนง่าย ๆ</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  className={`icon-bubble size-11 ${i === 0 ? "bg-neon text-ink" : i === 1 ? "bg-lilac text-white" : "bg-white/10 text-white"}`}
                >
                  <s.icon className="size-5" />
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
        </div>
      </section>

      {/* Features */}
      <section>
        <SectionTitle eyebrow="ทำอะไรได้บ้าง" title="ครบสำหรับการนัดประชุมจริง" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card p-5">
              <span className={`icon-bubble ${i % 3 === 0 ? "bg-neon text-ink" : i % 3 === 1 ? "bg-lilac text-white" : "bg-canvas"}`}>
                <f.icon className="size-4" />
              </span>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="shrink-0">
          <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">เหมาะกับใคร</p>
          <h2 className="mt-1 text-xl font-extrabold">ทุกการนัดที่มีหลายคน</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {USE_CASES.map((u) => (
            <span key={u} className="chip bg-canvas px-4 py-2 text-sm text-fg">
              {u}
            </span>
          ))}
        </div>
      </section>

      {/* Privacy + FAQ read the live settings (retention period, privacy page on/off). */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-surface" />}>
        <PrivacyAndFaq />
      </Suspense>

      {/* Final call to action */}
      <section className="card-neon flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl">พร้อมนัดประชุมครั้งต่อไปแล้วหรือยัง?</h2>
          <p className="mt-1 text-ink/70">สร้างห้องได้ในไม่ถึงนาที ส่งลิงก์ แล้วรอดูผลได้เลย</p>
        </div>
        <Link href="/new" className="btn btn-primary shrink-0 px-7 py-3.5 text-base">
          สร้างห้องนัดประชุม <ArrowRight className="size-5" />
        </Link>
      </section>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h2>
    </div>
  );
}

async function PrivacyAndFaq() {
  await connection();
  const { retentionDays, privacyPublished } = await getSettings();

  const faq = [
    { q: "ใช้ฟรีไหม?", a: "ใช้งานได้ฟรี ไม่ต้องสมัครสมาชิกหรือล็อกอินทั้งผู้จัดและสมาชิก" },
    {
      q: "สมาชิกต้องโหลดแอปหรือสมัครอะไรไหม?",
      a: "ไม่ต้อง เปิดลิงก์จากมือถือหรือคอมพิวเตอร์ เลือกชื่อตัวเอง แล้วแตะช่วงเวลาที่สะดวก ระบบบันทึกให้อัตโนมัติ",
    },
    {
      q: "จะรู้ได้อย่างไรว่าใครตอบแล้ว?",
      a: "หน้าผู้ดูแลแสดงสถานะรายคน — ยังไม่เปิดลิงก์ / เปิดแล้ว / ตอบแล้ว พร้อมปุ่มคัดลอกข้อความทวงคนที่ยังไม่ตอบ",
    },
    {
      q: "กันคนตอบแทนกันได้ไหม?",
      a: "ชื่อในรายการถูกล็อกทันทีเมื่อมีคนเลือก ถ้าต้องการความแน่นอนสูงสุด ส่ง “ลิงก์ส่วนตัว” ให้แต่ละคนแทนลิงก์รวม",
    },
    {
      q: "ลิงก์ผู้ดูแลหาย ทำอย่างไร?",
      a: `เบราว์เซอร์ที่สร้างห้องจำไว้ในเมนู “ห้องของฉัน” และส่งลิงก์เข้าอีเมลตัวเองได้ ถ้าหายจริง ติดต่อ ${CONTACT_EMAIL} พร้อมรหัสห้อง (8 ตัวท้ายลิงก์) เพื่อออกลิงก์ใหม่`,
    },
    { q: "เก็บข้อมูลนานแค่ไหน?", a: retentionText(retentionDays) },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="card-dark flex flex-col gap-5 p-6 sm:p-8">
        <span className="icon-bubble size-11 bg-neon text-ink">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold">ใช้ได้โดยไม่ต้องให้ข้อมูลส่วนตัว</h2>
          <p className="mt-1 text-sm text-stone-400">ออกแบบให้หน่วยงานใช้ได้อย่างสบายใจ</p>
        </div>
        <ul className="flex flex-col gap-3 text-sm">
          {[
            "ไม่ต้องสมัครสมาชิก ไม่ต้องล็อกอิน",
            "ไม่เก็บอีเมล — ใช้ส่งลิงก์ผู้ดูแลครั้งเดียวแล้วทิ้ง",
            "หมายเหตุจากสมาชิกเห็นเฉพาะผู้จัด",
            "หน้าจัดการระบบไม่แสดงชื่อเรื่องหรือรายชื่อในห้อง",
            retentionDays ? `ลบห้องอัตโนมัติ ${retentionDays} วันหลังวันประชุม` : "ผู้จัดลบห้องและคำตอบทั้งหมดได้ทุกเมื่อ",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <EyeOff className="mt-0.5 size-4 shrink-0 text-neon" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        {privacyPublished && (
          <Link href="/privacy" className="mt-auto text-sm font-semibold text-neon underline-offset-4 hover:underline">
            อ่านนโยบายความเป็นส่วนตัว →
          </Link>
        )}
      </div>

      <div className="card p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold">คำถามที่พบบ่อย</h2>
        <div className="mt-4 divide-y divide-line/5">
          {faq.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-lg leading-none transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-stone-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
