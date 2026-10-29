import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminView } from "@/components/AdminView";
import { RoomSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "หน้าผู้ดูแล · นัดประชุม",
  robots: { index: false },
};

export default function AdminPage({ params }: PageProps<"/r/[slug]/admin">) {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <AdminLoader params={params} />
    </Suspense>
  );
}

// The admin key lives in the URL hash, so the data is fetched client-side with it.
async function AdminLoader({ params }: { params: PageProps<"/r/[slug]/admin">["params"] }) {
  const { slug } = await params;
  return <AdminView slug={slug} />;
}
