export default function ChatLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="shimmer h-7 w-40 rounded-xl bg-white/5" />

      {/* Rooms */}
      <div className="flex flex-col divide-y divide-white/5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="shimmer h-12 w-12 shrink-0 rounded-2xl bg-white/5" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="shimmer h-4 w-2/5 rounded-lg bg-white/5" />
                <div className="shimmer h-3 w-12 rounded-lg bg-white/5" />
              </div>
              <div className="shimmer h-3 w-3/5 rounded-lg bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
