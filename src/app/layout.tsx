import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

// Plus Jakarta Sans has no Thai glyphs; the browser falls back to IBM Plex Sans Thai for those.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Set up a meeting นัดประชุม — หาวันที่ทุกคนว่างตรงกัน",
  description: "สร้างห้องนัดประชุม ส่งลิงก์ให้สมาชิกเลือกวันเวลาที่สะดวก แล้วดูผลว่าช่วงไหนว่างตรงกันมากที่สุด",
};

export const viewport: Viewport = {
  themeColor: "#1a1a1c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${jakarta.variable} ${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Sidebar />
        <div className="flex min-h-screen flex-col lg:pl-[17.5rem]">
          <main className="flex-1">{children}</main>
          <footer className="py-6 text-center text-xs text-stone-400">
            Set up a meeting · นัดประชุม · ไม่ต้องสมัครสมาชิก ไม่ต้องล็อกอิน
          </footer>
        </div>
      </body>
    </html>
  );
}
