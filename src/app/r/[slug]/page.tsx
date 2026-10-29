import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomView } from "@/components/RoomView";
import { getSnapshot } from "@/lib/rooms";
import { RoomSkeleton } from "./skeleton";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function RoomPage({ params }: PageProps<"/r/[slug]">) {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <RoomLoader params={params} />
    </Suspense>
  );
}

async function RoomLoader({ params }: { params: PageProps<"/r/[slug]">["params"] }) {
  const { slug } = await params;
  const snapshot = await getSnapshot(slug);
  if (!snapshot) notFound();
  return <RoomView initial={snapshot} />;
}
