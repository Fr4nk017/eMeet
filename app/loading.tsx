export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.2),_transparent_28%),linear-gradient(180deg,_#101426_0%,_#1A1A2E_45%,_#15172B_100%)] px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-surface/90 px-6 py-8 text-center shadow-[0_24px_80px_rgba(5,10,30,0.45)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>
          <p className="text-lg font-semibold text-white">Cargando eMeet</p>
          <p className="mt-1 text-sm text-muted">Preparando la siguiente vista…</p>
        </div>
      </div>
    </div>
  )
}
