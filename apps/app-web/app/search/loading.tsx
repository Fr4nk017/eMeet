export default function SearchLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Barra de búsqueda */}
      <div className="shimmer h-12 w-full rounded-2xl bg-white/5" />

      {/* Filtros */}
      <div className="flex gap-2 overflow-hidden">
        {[80, 100, 72, 90].map((w, i) => (
          <div key={i} className="shimmer h-8 shrink-0 rounded-full bg-white/5" style={{ width: w }} />
        ))}
      </div>

      {/* Resultados */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-white/6 bg-white/3 p-3">
            <div className="shimmer h-20 w-20 shrink-0 rounded-xl bg-white/5" />
            <div className="flex flex-1 flex-col justify-between py-1">
              <div className="shimmer h-4 w-3/4 rounded-lg bg-white/5" />
              <div className="shimmer h-3 w-1/2 rounded-lg bg-white/5" />
              <div className="shimmer h-3 w-1/3 rounded-lg bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
