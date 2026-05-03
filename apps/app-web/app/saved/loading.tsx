export default function SavedLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="shimmer h-7 w-36 rounded-xl bg-white/5" />
        <div className="shimmer h-5 w-16 rounded-full bg-white/5" />
      </div>

      {/* Tabs likes / guardados */}
      <div className="shimmer h-10 w-full rounded-2xl bg-white/5" />

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-white/6 bg-white/3 p-3">
            <div className="shimmer h-24 w-24 shrink-0 rounded-xl bg-white/5" />
            <div className="flex flex-1 flex-col justify-between py-1">
              <div className="shimmer h-4 w-4/5 rounded-lg bg-white/5" />
              <div className="shimmer h-3 w-3/5 rounded-lg bg-white/5" />
              <div className="shimmer h-3 w-2/5 rounded-lg bg-white/5" />
              <div className="flex gap-2 pt-1">
                <div className="shimmer h-7 w-20 rounded-xl bg-white/5" />
                <div className="shimmer h-7 w-7 rounded-xl bg-white/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
