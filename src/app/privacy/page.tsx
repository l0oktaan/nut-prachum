import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSettings } from "@/lib/settings";
import { CONTACT_EMAIL, retentionText, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว · นัดประชุม",
};

const UPDATED = "29 ตุลาคม 2569";

export default function PrivacyPage() {
  return (
    <Suspense>
      <Policy />
    </Suspense>
  );
}

// Hidden (404) until the super admin publishes it; the retention period comes from the live setting.
async function Policy() {
  await connection();
  const { privacyPublished, retentionDays } = await getSettings();
  if (!privacyPublished) notFound();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8 sm:py-14">
      <header>
        <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">Privacy policy</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">นโยบายความเป็นส่วนตัว</h1>
        <p className="mt-2 text-sm text-stone-500">
          บริการ “นัดประชุม (Set up a meeting)” ที่ {SITE_URL.replace(/^https?:\/\//, "")} · ปรับปรุงล่าสุด {UPDATED}
        </p>
      </header>

      <Section title="สรุปสั้น ๆ">
        <ul>
          <li>ไม่ต้องสมัครสมาชิก ไม่มีบัญชีผู้ใช้ และไม่มีโฆษณาหรือเครื่องมือติดตามพฤติกรรม</li>
          <li>เก็บเฉพาะข้อมูลที่จำเป็นต่อการนัดประชุม ซึ่งผู้ใช้กรอกเอง</li>
          <li>อีเมลใช้ส่งลิงก์ผู้ดูแลครั้งเดียว ไม่เก็บไว้</li>
          <li>{retentionText(retentionDays)}</li>
        </ul>
      </Section>

      <Section title="ข้อมูลที่เราเก็บ">
        <ul>
          <li>
            <b>ข้อมูลห้องที่ผู้จัดกรอก</b> — หัวข้อ รายละเอียด/สถานที่ ชื่อผู้จัด วันและช่วงเวลาที่ถาม และรายชื่อสมาชิก
          </li>
          <li>
            <b>ข้อมูลที่สมาชิกกรอก</b> — ชื่อที่เลือกหรือพิมพ์ ช่วงเวลาที่สะดวก และหมายเหตุถึงผู้จัด (ถ้ามี)
          </li>
          <li>
            <b>สถานะการเข้าใช้ในห้อง</b> — เวลาที่เปิดลิงก์และเวลาที่ตอบล่าสุด เพื่อให้ผู้จัดรู้ว่าใครตอบแล้ว
          </li>
          <li>
            <b>บันทึกของเซิร์ฟเวอร์</b> — หมายเลข IP เวลา ที่อยู่หน้าเว็บที่เรียก ผลลัพธ์ และชนิดเบราว์เซอร์ เก็บประมาณ 30
            วัน เพื่อความปลอดภัยและแก้ไขปัญหา
          </li>
          <li>
            <b>บันทึกความปลอดภัย</b> — เหตุการณ์อย่างการใช้ลิงก์ผู้ดูแลผิด การส่งอีเมล (เก็บอีเมลแบบปิดบัง เช่น so***@gm***.com)
            พร้อม IP และรหัสห้อง เก็บ 90 วัน
          </li>
          <li>
            <b>อีเมลของผู้จัด</b> (ถ้ากรอก) — ใช้ส่งลิงก์ผู้ดูแลครั้งเดียว ไม่บันทึกในฐานข้อมูล และสำเนาที่ระบบส่งออกจะถูกลบจากกล่องผู้ส่งทันทีหลังส่ง
          </li>
        </ul>
      </Section>

      <Section title="คุกกี้และข้อมูลในเบราว์เซอร์">
        <ul>
          <li>
            คุกกี้ระบุตัวตนในห้อง (<code>np_รหัสห้อง</code>) — จำว่าคุณตอบในชื่อใดบนอุปกรณ์นี้ อายุ 180 วัน ใช้เฉพาะเว็บนี้
          </li>
          <li>
            พื้นที่เก็บข้อมูลของเบราว์เซอร์ — รายการ “ห้องของฉัน” (รหัสห้อง ชื่อห้อง และลิงก์ผู้ดูแล) ธีมสี
            และร่างฟอร์ม “สร้างนัดซ้ำ” อยู่บนอุปกรณ์ของคุณเท่านั้น ไม่ถูกส่งมาเก็บที่เซิร์ฟเวอร์
          </li>
          <li>ไม่มีคุกกี้โฆษณา ไม่มีเครื่องมือวิเคราะห์สถิติ และไม่มีการติดตามข้ามเว็บไซต์</li>
        </ul>
      </Section>

      <Section title="ใครเห็นข้อมูลของคุณ">
        <ul>
          <li>
            <b>ผู้ที่มีลิงก์สมาชิก</b> เห็นหัวข้อ รายละเอียด รายชื่อสมาชิก และคำตอบของทุกคนในห้อง — ส่งลิงก์ให้เฉพาะคนที่เกี่ยวข้อง
          </li>
          <li>
            <b>ผู้ที่มีลิงก์ผู้ดูแล</b> เห็นทุกอย่างข้างต้น รวมถึงหมายเหตุถึงผู้จัดและลิงก์ส่วนตัวของสมาชิก
          </li>
          <li>
            <b>ผู้ให้บริการระบบ</b> — หน้าจัดการระบบแสดงเฉพาะรหัสห้องและตัวเลขสถิติ ไม่แสดงชื่อเรื่องหรือรายชื่อ
            เราจะเข้าถึงเนื้อหาในฐานข้อมูลเฉพาะเมื่อจำเป็นต่อการแก้ปัญหาตามคำขอของคุณ ความปลอดภัยของระบบ หรือตามที่กฎหมายกำหนด
          </li>
          <li>เราไม่ขาย ไม่ให้เช่า และไม่ส่งต่อข้อมูลเพื่อการตลาด</li>
        </ul>
      </Section>

      <Section title="ผู้ให้บริการภายนอก">
        <ul>
          <li>Hostinger — เซิร์ฟเวอร์ที่ใช้เก็บข้อมูลและให้บริการเว็บ และบริการส่งอีเมล</li>
          <li>Google Calendar — ระบบดึงปฏิทินวันหยุดนักขัตฤกษ์สาธารณะจากเซิร์ฟเวอร์ (ไม่มีข้อมูลผู้ใช้ส่งไป)</li>
          <li>
            เมื่อคุณกด “Google Calendar” หรือ “แชร์ผ่าน LINE” ข้อมูลการประชุมจะถูกส่งไปยังบริการนั้นตามที่คุณสั่ง
            ภายใต้นโยบายของผู้ให้บริการนั้น
          </li>
        </ul>
      </Section>

      <Section title="ระยะเวลาเก็บข้อมูล">
        <p>{retentionText(retentionDays)} บันทึกของเซิร์ฟเวอร์เก็บประมาณ 30 วัน และบันทึกความปลอดภัยเก็บ 90 วัน</p>
      </Section>

      <Section title="สิทธิของคุณ">
        <ul>
          <li>สมาชิกแก้ไขหรือล้างคำตอบของตัวเองได้ตลอดเวลาที่ห้องยังเปิดรับคำตอบ</li>
          <li>ผู้จัดลบสมาชิก แก้ไขรายชื่อ หรือลบห้องพร้อมคำตอบทั้งหมดได้ในหน้าผู้ดูแล</li>
          <li>
            หากต้องการขอดู แก้ไข หรือลบข้อมูลส่วนบุคคล หรือคัดค้านการประมวลผล ติดต่อเราได้ที่อีเมลด้านล่าง
            พร้อมรหัสห้อง (8 ตัวท้ายลิงก์)
          </li>
        </ul>
      </Section>

      <Section title="ติดต่อเรา">
        <p>
          อีเมล{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>หากมีการเปลี่ยนแปลงนโยบายนี้ เราจะปรับวันที่ “ปรับปรุงล่าสุด” ด้านบน</p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-stone-600 [&_code]:rounded [&_code]:bg-canvas [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
