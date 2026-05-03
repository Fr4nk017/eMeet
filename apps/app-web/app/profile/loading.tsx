export default function ProfileLoading() {
  return (
    <div className="flex h-full flex-col gap-5 p-4">
      {/* Avatar + nombre */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="shimmer h-24 w-24 rounded-full bg-white/5" />
        <div className="shimmer h-5 w-36 rounded-xl bg-white/5" />
        <div className="shimmer h-3 w-24 rounded-lg bg-white/5" />
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="shimmer h-6 w-10 rounded-lg bg-white/5" />
            <div className="shimmer h-3 w-14 rounded-lg bg-white/5" />
          </div>
        ))}
      </div>

      {/* Secciones */}
      {[120, 80, 100].map((h, i) => (
        <div key={i} className="shimmer rounded-2xl bg-white/3 border border-white/6" style={{ height: h }} />
      ))}
    </div>
  )
}
