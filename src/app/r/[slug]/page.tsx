import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RoomView } from "@/components/RoomView";
import { getSnapshot } from "@/lib/rooms";
import { RoomSkeleton } from "./skeleton";

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
