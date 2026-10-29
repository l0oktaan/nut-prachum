export function RoomSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl animate-pulse flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="h-8 w-2/3 max-w-md rounded-lg bg-stone-200" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 w-28 rounded-full bg-stone-200" />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-stone-200/70" />
      <div className="h-80 rounded-2xl bg-stone-200/70" />
    </div>
  );
}
